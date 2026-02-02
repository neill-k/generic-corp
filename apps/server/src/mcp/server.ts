import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "../db/client.js";

import { enqueueAgentTask } from "../queue/agent-queues.js";

import type { AgentRuntime } from "../services/agent-lifecycle.js";
import { appEventBus } from "../services/app-events.js";
import { BoardService } from "../services/board-service.js";
import { validateMcpUri } from "../services/mcp-health.js";
import { generateThreadSummary } from "../services/chat-continuity.js";

type ToolTextResult = { content: Array<{ type: "text"; text: string }> };

function toolText(text: string): ToolTextResult {
  return { content: [{ type: "text", text }] };
}

async function getAgentByIdOrName(agentIdOrName: string) {
  const byId = await db.agent.findUnique({ where: { id: agentIdOrName } });
  if (byId) return byId;
  return db.agent.findUnique({ where: { name: agentIdOrName } });
}

async function getDirectReportsFor(agentDbId: string) {
  const myNode = await db.orgNode.findUnique({
    where: { agentId: agentDbId },
    select: { id: true },
  });

  if (!myNode) return [];

  const children = await db.orgNode.findMany({
    where: { parentNodeId: myNode.id },
    select: {
      agent: {
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          department: true,
          status: true,
          currentTaskId: true,
        },
      },
    },
  });

  type Report = {
    id: string;
    name: string;
    displayName: string;
    role: string;
    department: string;
    status: string;
    currentTaskId: string | null;
  };

  return (children as Array<{ agent: Report }>).map((child) => child.agent);
}

function resolveWorkspaceRoot(): string {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) {
    throw new Error("GC_WORKSPACE_ROOT is not set (needed for board/docs file tools)");
  }
  return path.resolve(root);
}

function getBoardService(): BoardService {
  return new BoardService(resolveWorkspaceRoot());
}

export function createGcMcpServer(agentId: string, taskId: string, runtime?: AgentRuntime) {
  return createSdkMcpServer({
    name: "generic-corp",
    version: "1.0.0",
    tools: [
      tool(
        "delegate_task",
        "Assign work to any agent by name",
        {
          targetAgent: z.string().describe("Name (slug) of the agent to delegate to"),
          prompt: z.string().describe("What to do"),
          context: z.string().describe("Relevant context"),
          priority: z.number().int().optional().describe("Higher is more urgent"),
        },
        async (args) => {
          try {
            const caller = await getAgentByIdOrName(agentId);
            if (!caller) return toolText(`Unknown caller agent: ${agentId}`);

            const parentTask = await db.task.findUnique({ where: { id: taskId }, select: { id: true } });
            if (!parentTask) return toolText(`Unknown parent task: ${taskId}`);

            const target = await db.agent.findUnique({
              where: { name: args.targetAgent },
              select: { id: true, name: true },
            });
            if (!target) return toolText(`Unknown agent: ${args.targetAgent}`);

            const task = await db.task.create({
              data: {
                parentTaskId: taskId,
                assigneeId: target.id,
                delegatorId: caller.id,
                prompt: args.prompt,
                context: args.context,
                priority: args.priority ?? 0,
                status: "pending",
              },
              select: { id: true },
            });

            await enqueueAgentTask({
              agentName: target.name,
              taskId: task.id,
              priority: args.priority ?? 0,
            });

            appEventBus.emit("task_created", {
              taskId: task.id,
              assignee: target.name,
              delegator: caller.name,
            });

            return toolText(
              `Delegated to ${target.name}. Task ${task.id} queued.`,
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`delegate_task failed: ${message}`);
          }
        },
      ),

      tool(
        "finish_task",
        "Mark your current task as done with a result summary",
        {
          status: z.enum(["completed", "blocked", "failed"]).describe("Final task status"),
          result: z.string().describe("Result summary or reason for blocking/failure"),
        },
        async (args) => {
          try {
            const task = await db.task.findUnique({
              where: { id: taskId },
              select: { id: true },
            });
            if (!task) return toolText(`Unknown task: ${taskId}`);

            await db.task.update({
              where: { id: taskId },
              data: {
                status: args.status,
                result: args.result,
                completedAt: new Date(),
              },
            });

            appEventBus.emit("task_status_changed", { taskId, status: args.status });

            return toolText(`Task ${taskId} marked as ${args.status}.`);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`finish_task failed: ${message}`);
          }
        },
      ),

      tool(
        "get_my_org",
        "List your direct reports and their current status",
        {},
        async () => {
          try {
            const self = await getAgentByIdOrName(agentId);
            if (!self) return toolText(`Unknown caller agent: ${agentId}`);

            const reports = await getDirectReportsFor(self.id);

            return toolText(
              JSON.stringify(
                {
                  self: { name: self.name, role: self.role, department: self.department, status: self.status },
                  directReports: reports.map((r) => ({
                    name: r.name,
                    role: r.role,
                    department: r.department,
                    status: r.status,
                  })),
                },
                null,
                2,
              ),
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_my_org failed: ${message}`);
          }
        },
      ),

      tool(
        "list_org_nodes",
        "List all org hierarchy nodes with agent info",
        {},
        async () => {
          try {
            const nodes = await db.orgNode.findMany({
              orderBy: { position: "asc" },
              select: {
                id: true,
                agentId: true,
                parentNodeId: true,
                position: true,
                agent: { select: { name: true, displayName: true, role: true, department: true, status: true } },
              },
            });

            return toolText(JSON.stringify(nodes, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_org_nodes failed: ${msg}`);
          }
        },
      ),

      tool(
        "get_agent_status",
        "Read an agent's current status",
        {
          agentName: z.string(),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({
              where: { name: args.agentName },
              select: {
                name: true,
                displayName: true,
                role: true,
                department: true,
                level: true,
                status: true,
                currentTaskId: true,
              },
            });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            return toolText(JSON.stringify(agent, null, 2));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_agent_status failed: ${message}`);
          }
        },
      ),

      tool(
        "query_board",
        "Search the shared board for relevant items",
        {
          scope: z.enum(["team", "department", "org"]).optional(),
          type: z.string().optional().describe("Filter by board item type (e.g. status_update, blocker, finding, request)"),
          since: z.string().optional(),
        },
        async (args) => {
          try {
            void args.scope;

            const boardService = getBoardService();
            const items = await boardService.listBoardItems({
              type: args.type,
              since: args.since,
            });

            return toolText(JSON.stringify(items, null, 2));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`query_board failed: ${message}`);
          }
        },
      ),

      tool(
        "post_board_item",
        "Post a status update, blocker, finding, or request to the shared board",
        {
          type: z.string().describe("Board item type (e.g. status_update, blocker, finding, request)"),
          content: z.string(),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(agentId);
            const agentName = agent?.name ?? agentId;
            const boardService = getBoardService();
            const filePath = await boardService.writeBoardItem({
              agentName,
              type: args.type,
              content: args.content,
            });

            appEventBus.emit("board_item_created", {
              type: args.type,
              author: agentName,
              path: filePath,
            });

            return toolText(JSON.stringify({ path: filePath }, null, 2));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`post_board_item failed: ${message}`);
          }
        },
      ),

      tool(
        "update_board_item",
        "Update an existing board item's content",
        {
          filePath: z.string().describe("Path to the board item file"),
          content: z.string().describe("New content for the board item"),
        },
        async (args) => {
          try {
            // Read existing file to preserve header metadata
            let existing: string;
            try {
              existing = await readFile(args.filePath, "utf8");
            } catch {
              return toolText(`Board item not found: ${args.filePath}`);
            }

            // Preserve everything up to and including the --- separator, replace body
            const separatorIndex = existing.indexOf("\n---\n");
            if (separatorIndex === -1) {
              return toolText("Invalid board item format (no --- separator found).");
            }

            const header = existing.slice(0, separatorIndex + 5); // include \n---\n
            const updated = `${header}\n${args.content.trim()}\n`;
            await writeFile(args.filePath, updated, "utf8");

            appEventBus.emit("board_item_updated", {
              type: "updated",
              author: "agent",
              path: args.filePath,
            });

            return toolText(`Board item updated: ${args.filePath}`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_board_item failed: ${msg}`);
          }
        },
      ),

      // --- Messaging tools ---

      tool(
        "send_message",
        "Send a message to another agent or reply to a human user. Use toAgent='human' when replying to a human chat message.",
        {
          toAgent: z.string().describe("Name (slug) of the recipient agent, or 'human' for chat replies to users"),
          body: z.string().describe("Message content"),
          threadId: z.string().optional().describe("Thread ID to continue a conversation"),
          type: z.string().optional().describe("Message type (default: direct)"),
        },
        async (args) => {
          try {
            const sender = await getAgentByIdOrName(agentId);
            if (!sender) return toolText(`Unknown caller agent: ${agentId}`);

            const threadId = args.threadId ?? crypto.randomUUID();

            // "human" is a special recipient — means replying to a human user in chat
            const isHumanReply = args.toAgent === "human";
            let recipientId: string;

            if (isHumanReply) {
              // For human replies, set recipient to self (the thread is what matters)
              recipientId = sender.id;
            } else {
              const recipient = await db.agent.findUnique({
                where: { name: args.toAgent },
                select: { id: true, name: true },
              });
              if (!recipient) return toolText(`Unknown agent: ${args.toAgent}`);
              recipientId = recipient.id;
            }

            const message = await db.message.create({
              data: {
                fromAgentId: sender.id,
                toAgentId: recipientId,
                threadId,
                body: args.body,
                type: isHumanReply ? "chat" : (args.type ?? "direct"),
                status: "delivered",
              },
              select: { id: true, threadId: true },
            });

            appEventBus.emit("message_created", {
              messageId: message.id,
              threadId,
              fromAgentId: sender.id,
              toAgentId: recipientId,
            });

            return toolText(JSON.stringify({ messageId: message.id, threadId }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`send_message failed: ${msg}`);
          }
        },
      ),

      tool(
        "read_messages",
        "Read messages in a thread",
        {
          threadId: z.string().describe("Thread ID to read"),
        },
        async (args) => {
          try {
            const messages = await db.message.findMany({
              where: { threadId: args.threadId },
              orderBy: { createdAt: "asc" },
              select: {
                id: true,
                fromAgentId: true,
                toAgentId: true,
                body: true,
                type: true,
                createdAt: true,
                sender: { select: { name: true } },
                recipient: { select: { name: true } },
              },
            });

            const formatted = messages.map((m) => ({
              id: m.id,
              from: m.sender?.name ?? "human",
              to: m.recipient.name,
              body: m.body,
              type: m.type,
              createdAt: m.createdAt.toISOString(),
            }));

            return toolText(JSON.stringify(formatted, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`read_messages failed: ${msg}`);
          }
        },
      ),

      tool(
        "list_threads",
        "List your message threads with latest message preview",
        {},
        async () => {
          try {
            const self = await getAgentByIdOrName(agentId);
            if (!self) return toolText(`Unknown caller agent: ${agentId}`);

            const latestMessages = await db.message.findMany({
              where: {
                OR: [
                  { fromAgentId: self.id },
                  { toAgentId: self.id },
                ],
                threadId: { not: null },
              },
              orderBy: { createdAt: "desc" },
              distinct: ["threadId"],
              select: {
                threadId: true,
                body: true,
                createdAt: true,
                sender: { select: { name: true } },
                recipient: { select: { name: true } },
              },
            });

            return toolText(JSON.stringify(latestMessages.map((m) => ({
              threadId: m.threadId,
              from: m.sender?.name ?? "human",
              to: m.recipient.name,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            })), null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_threads failed: ${msg}`);
          }
        },
      ),

      tool(
        "get_thread_summary",
        "Get a summary of new messages in a thread since a given time",
        {
          threadId: z.string().describe("Thread ID to summarize"),
          since: z.string().describe("ISO timestamp — summarize messages after this time"),
        },
        async (args) => {
          try {
            if (!runtime) return toolText("Runtime not available for summarization.");

            const summary = await generateThreadSummary({
              threadId: args.threadId,
              since: args.since,
              runtime,
            });

            return toolText(summary ?? "No new messages in this thread since the given time.");
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_thread_summary failed: ${msg}`);
          }
        },
      ),

      // --- Task management tools ---

      tool(
        "get_task",
        "Get details of a specific task by ID",
        {
          taskId: z.string().describe("Task ID to look up"),
        },
        async (args) => {
          try {
            const task = await db.task.findUnique({
              where: { id: args.taskId },
              select: {
                id: true,
                prompt: true,
                context: true,
                status: true,
                priority: true,
                result: true,
                learnings: true,
                createdAt: true,
                startedAt: true,
                completedAt: true,
                parentTaskId: true,
                assignee: { select: { name: true } },
                delegator: { select: { name: true } },
              },
            });
            if (!task) return toolText(`Task not found: ${args.taskId}`);

            return toolText(JSON.stringify({
              ...task,
              assignee: task.assignee?.name ?? null,
              delegator: task.delegator?.name ?? null,
              createdAt: task.createdAt.toISOString(),
              startedAt: task.startedAt?.toISOString() ?? null,
              completedAt: task.completedAt?.toISOString() ?? null,
            }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_task failed: ${msg}`);
          }
        },
      ),

      tool(
        "list_tasks",
        "List tasks with optional filters",
        {
          assignee: z.string().optional().describe("Filter by assignee agent name"),
          status: z.enum(["pending", "running", "completed", "failed", "blocked"]).optional(),
          limit: z.number().int().optional().describe("Max results (default 20)"),
        },
        async (args) => {
          try {
            const where: Record<string, unknown> = {};
            if (args.assignee) {
              const agent = await db.agent.findUnique({
                where: { name: args.assignee },
                select: { id: true },
              });
              if (!agent) return toolText(`Unknown agent: ${args.assignee}`);
              where["assigneeId"] = agent.id;
            }
            if (args.status) where["status"] = args.status;

            const tasks = await db.task.findMany({
              where,
              orderBy: { createdAt: "desc" },
              take: args.limit ?? 20,
              select: {
                id: true,
                prompt: true,
                status: true,
                priority: true,
                createdAt: true,
                completedAt: true,
                assignee: { select: { name: true } },
                delegator: { select: { name: true } },
              },
            });

            const formatted = tasks.map((t) => ({
              id: t.id,
              prompt: t.prompt.length > 100 ? t.prompt.slice(0, 100) + "..." : t.prompt,
              status: t.status,
              priority: t.priority,
              assignee: t.assignee?.name ?? null,
              delegator: t.delegator?.name ?? null,
              createdAt: t.createdAt.toISOString(),
              completedAt: t.completedAt?.toISOString() ?? null,
            }));

            return toolText(JSON.stringify(formatted, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_tasks failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_task",
        "Update a task's priority or context",
        {
          taskId: z.string(),
          priority: z.number().int().optional(),
          context: z.string().optional(),
        },
        async (args) => {
          try {
            const task = await db.task.findUnique({ where: { id: args.taskId }, select: { id: true } });
            if (!task) return toolText(`Task not found: ${args.taskId}`);

            const data: Record<string, unknown> = {};
            if (args.priority !== undefined) data["priority"] = args.priority;
            if (args.context !== undefined) data["context"] = args.context;

            if (Object.keys(data).length === 0) return toolText("No fields to update.");

            await db.task.update({ where: { id: args.taskId }, data });

            appEventBus.emit("task_updated", { taskId: args.taskId });

            return toolText(`Task ${args.taskId} updated.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_task failed: ${msg}`);
          }
        },
      ),

      tool(
        "cancel_task",
        "Cancel a pending task",
        {
          taskId: z.string(),
          reason: z.string().optional().describe("Reason for cancellation"),
        },
        async (args) => {
          try {
            const task = await db.task.findUnique({
              where: { id: args.taskId },
              select: { id: true },
            });
            if (!task) return toolText(`Task not found: ${args.taskId}`);

            await db.task.update({
              where: { id: args.taskId },
              data: { status: "failed", result: args.reason ?? "Cancelled" },
            });

            appEventBus.emit("task_status_changed", { taskId: args.taskId, status: "failed" });

            return toolText(`Task ${args.taskId} cancelled.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`cancel_task failed: ${msg}`);
          }
        },
      ),

      // --- Board management tools ---

      tool(
        "archive_board_item",
        "Archive a board item (move to completed)",
        {
          filePath: z.string().describe("Path to the board item file"),
        },
        async (args) => {
          try {
            const boardService = getBoardService();
            const archivedPath = await boardService.archiveBoardItem(args.filePath);

            appEventBus.emit("board_item_archived", {
              path: args.filePath,
              archivedPath,
            });

            return toolText(JSON.stringify({ archivedPath }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`archive_board_item failed: ${msg}`);
          }
        },
      ),

      tool(
        "list_archived_items",
        "List archived board items",
        {},
        async () => {
          try {
            const boardService = getBoardService();
            const items = await boardService.listArchivedItems();
            return toolText(JSON.stringify(items, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_archived_items failed: ${msg}`);
          }
        },
      ),

      // --- Agent discovery tools ---

      tool(
        "list_agents",
        "List all agents in the organization",
        {
          department: z.string().optional().describe("Filter by department"),
          status: z.enum(["idle", "running", "error", "offline"]).optional().describe("Filter by status"),
        },
        async (args) => {
          try {
            const where: Record<string, unknown> = {};
            if (args.department) where["department"] = args.department;
            if (args.status) where["status"] = args.status;

            const agents = await db.agent.findMany({
              where,
              orderBy: { name: "asc" },
              select: {
                name: true,
                displayName: true,
                role: true,
                department: true,
                level: true,
                status: true,
                currentTaskId: true,
              },
            });

            return toolText(JSON.stringify(agents, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_agents failed: ${msg}`);
          }
        },
      ),

      // --- Message management tools ---

      tool(
        "mark_message_read",
        "Mark a message as read",
        {
          messageId: z.string().describe("ID of the message to mark as read"),
        },
        async (args) => {
          try {
            const message = await db.message.findUnique({
              where: { id: args.messageId },
              select: { id: true },
            });
            if (!message) return toolText(`Message not found: ${args.messageId}`);

            await db.message.update({
              where: { id: args.messageId },
              data: { status: "read", readAt: new Date() },
            });

            appEventBus.emit("message_updated", { messageId: args.messageId });

            return toolText(`Message ${args.messageId} marked as read.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`mark_message_read failed: ${msg}`);
          }
        },
      ),

      tool(
        "delete_message",
        "Delete a message",
        {
          messageId: z.string().describe("ID of the message to delete"),
        },
        async (args) => {
          try {
            const message = await db.message.findUnique({
              where: { id: args.messageId },
              select: { id: true },
            });
            if (!message) return toolText(`Message not found: ${args.messageId}`);

            await db.message.delete({ where: { id: args.messageId } });

            appEventBus.emit("message_deleted", { messageId: args.messageId });

            return toolText(`Message ${args.messageId} deleted.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`delete_message failed: ${msg}`);
          }
        },
      ),

      // --- Agent administration tools ---

      tool(
        "create_agent",
        "Create a new agent in the organization",
        {
          name: z.string().regex(/^[a-z0-9-]+$/).describe("Unique slug name"),
          displayName: z.string().describe("Human-readable name"),
          role: z.string().describe("Agent's role title"),
          department: z.string().describe("Department name"),
          level: z.enum(["ic", "lead", "manager", "vp", "c-suite"]),
          personality: z.string().optional().describe("Personality/behavior description"),
        },
        async (args) => {
          try {
            const agent = await db.agent.create({
              data: {
                name: args.name,
                displayName: args.displayName,
                role: args.role,
                department: args.department,
                level: args.level,
                personality: args.personality ?? "",
                status: "idle",
              },
              select: { id: true, name: true },
            });

            appEventBus.emit("agent_updated", { agentId: agent.id });

            return toolText(JSON.stringify({ id: agent.id, name: agent.name }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`create_agent failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_agent",
        "Update an agent's properties",
        {
          agentName: z.string().describe("Agent name (slug)"),
          displayName: z.string().optional(),
          role: z.string().optional(),
          department: z.string().optional(),
          personality: z.string().optional(),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({ where: { name: args.agentName } });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            const data: Record<string, unknown> = {};
            if (args.displayName !== undefined) data["displayName"] = args.displayName;
            if (args.role !== undefined) data["role"] = args.role;
            if (args.department !== undefined) data["department"] = args.department;
            if (args.personality !== undefined) data["personality"] = args.personality;

            if (Object.keys(data).length === 0) return toolText("No fields to update.");

            await db.agent.update({ where: { id: agent.id }, data });

            appEventBus.emit("agent_updated", { agentId: agent.id });

            return toolText(`Agent ${args.agentName} updated.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_agent failed: ${msg}`);
          }
        },
      ),

      tool(
        "delete_agent",
        "Remove an agent from the organization",
        {
          agentName: z.string().describe("Agent name (slug)"),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({ where: { name: args.agentName } });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            await db.agent.delete({ where: { id: agent.id } });

            appEventBus.emit("agent_deleted", { agentId: agent.id });

            return toolText(`Agent ${args.agentName} deleted.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`delete_agent failed: ${msg}`);
          }
        },
      ),

      // --- Organization structure tools ---

      tool(
        "create_org_node",
        "Add an agent to the org hierarchy",
        {
          agentName: z.string().describe("Agent name (slug) to place in org"),
          parentNodeId: z.string().optional().describe("Parent org node ID, omit for root"),
          position: z.number().int().optional().describe("Sort position among siblings"),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({ where: { name: args.agentName }, select: { id: true } });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            const node = await db.orgNode.create({
              data: { agentId: agent.id, parentNodeId: args.parentNodeId ?? null, position: args.position ?? 0 },
              select: { id: true },
            });

            appEventBus.emit("org_changed", {});

            return toolText(JSON.stringify({ nodeId: node.id }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`create_org_node failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_org_node",
        "Move an agent in the org hierarchy",
        {
          agentName: z.string().describe("Agent name (slug) to move"),
          parentNodeId: z.string().nullable().optional().describe("New parent node ID, null for root"),
          position: z.number().int().optional().describe("New sort position"),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({ where: { name: args.agentName }, select: { id: true } });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            const node = await db.orgNode.findUnique({ where: { agentId: agent.id }, select: { id: true } });
            if (!node) return toolText(`Agent ${args.agentName} has no org node`);

            const data: Record<string, unknown> = {};
            if (args.parentNodeId !== undefined) data["parentNodeId"] = args.parentNodeId;
            if (args.position !== undefined) data["position"] = args.position;

            if (Object.keys(data).length === 0) return toolText("No fields to update.");

            await db.orgNode.update({ where: { id: node.id }, data });

            appEventBus.emit("org_changed", {});

            return toolText(`Org node for ${args.agentName} updated.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_org_node failed: ${msg}`);
          }
        },
      ),

      tool(
        "delete_org_node",
        "Remove an agent from the org hierarchy",
        {
          agentName: z.string().describe("Agent name (slug) to remove from org"),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({ where: { name: args.agentName }, select: { id: true } });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            const node = await db.orgNode.findUnique({ where: { agentId: agent.id }, select: { id: true } });
            if (!node) return toolText(`Agent ${args.agentName} has no org node`);

            await db.orgNode.delete({ where: { id: node.id } });

            appEventBus.emit("org_changed", {});

            return toolText(`Org node for ${args.agentName} deleted.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`delete_org_node failed: ${msg}`);
          }
        },
      ),

      // --- Task lifecycle ---

      tool(
        "delete_task",
        "Delete a task permanently",
        {
          taskId: z.string().describe("Task ID to delete"),
        },
        async (args) => {
          try {
            const task = await db.task.findUnique({ where: { id: args.taskId }, select: { id: true } });
            if (!task) return toolText(`Task not found: ${args.taskId}`);

            await db.task.delete({ where: { id: args.taskId } });

            appEventBus.emit("task_status_changed", { taskId: args.taskId, status: "deleted" });

            return toolText(`Task ${args.taskId} deleted.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`delete_task failed: ${msg}`);
          }
        },
      ),

      // --- Workspace tools ---

      tool(
        "get_workspace",
        "Get workspace settings (API key masked)",
        {},
        async () => {
          try {
            let workspace = await db.workspace.findFirst();
            if (!workspace) {
              workspace = await db.workspace.create({
                data: { name: "Generic Corp", slug: "generic-corp" },
              });
            }
            const { llmApiKeyEnc, llmApiKeyIv, llmApiKeyTag, ...rest } = workspace;
            return toolText(JSON.stringify({
              ...rest,
              llmApiKey: llmApiKeyEnc ? "sk-ant-••••••••" : "",
            }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_workspace failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_workspace",
        "Update workspace settings",
        {
          name: z.string().optional().describe("Workspace name"),
          slug: z.string().optional().describe("Workspace slug"),
          description: z.string().optional().describe("Workspace description"),
          timezone: z.string().optional().describe("Timezone"),
          language: z.string().optional().describe("Language code"),
          llmProvider: z.string().optional().describe("LLM provider"),
          llmModel: z.string().optional().describe("LLM model"),
        },
        async (args) => {
          try {
            let workspace = await db.workspace.findFirst();
            if (!workspace) {
              workspace = await db.workspace.create({
                data: { name: "Generic Corp", slug: "generic-corp" },
              });
            }
            const data: Record<string, unknown> = {};
            if (args.name !== undefined) data["name"] = args.name;
            if (args.slug !== undefined) data["slug"] = args.slug;
            if (args.description !== undefined) data["description"] = args.description;
            if (args.timezone !== undefined) data["timezone"] = args.timezone;
            if (args.language !== undefined) data["language"] = args.language;
            if (args.llmProvider !== undefined) data["llmProvider"] = args.llmProvider;
            if (args.llmModel !== undefined) data["llmModel"] = args.llmModel;

            const updated = await db.workspace.update({
              where: { id: workspace.id },
              data,
            });

            appEventBus.emit("workspace_updated", { workspaceId: updated.id });

            return toolText(`Workspace updated: ${JSON.stringify({ name: updated.name, slug: updated.slug })}`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_workspace failed: ${msg}`);
          }
        },
      ),

      // --- Tool Permission tools ---

      tool(
        "list_tool_permissions",
        "List all tool permissions with enabled state",
        {},
        async () => {
          try {
            const perms = await db.toolPermission.findMany({ orderBy: { name: "asc" } });
            return toolText(JSON.stringify(perms, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_tool_permissions failed: ${msg}`);
          }
        },
      ),

      tool(
        "get_tool_permission",
        "Get a single tool permission by ID",
        {
          id: z.string().describe("Tool permission ID"),
        },
        async (args) => {
          try {
            const perm = await db.toolPermission.findUnique({ where: { id: args.id } });
            if (!perm) return toolText(`Tool permission not found: ${args.id}`);
            return toolText(JSON.stringify(perm, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_tool_permission failed: ${msg}`);
          }
        },
      ),

      tool(
        "create_tool_permission",
        "Create a new tool permission",
        {
          name: z.string().describe("Permission name (e.g. 'bash', 'deploy')"),
          description: z.string().describe("What this permission allows"),
          iconName: z.string().describe("Lucide icon name"),
          enabled: z.boolean().optional().describe("Workspace-level default (true)"),
        },
        async (args) => {
          try {
            const perm = await db.toolPermission.create({
              data: {
                name: args.name,
                description: args.description,
                iconName: args.iconName,
                enabled: args.enabled ?? true,
              },
            });
            appEventBus.emit("tool_permission_created", { toolPermissionId: perm.id });
            return toolText(`Tool permission created: ${perm.name} (${perm.id})`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`create_tool_permission failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_tool_permission",
        "Toggle or update a tool permission",
        {
          id: z.string().describe("Tool permission ID"),
          enabled: z.boolean().optional().describe("Enable/disable"),
          description: z.string().optional().describe("New description"),
        },
        async (args) => {
          try {
            const perm = await db.toolPermission.findUnique({ where: { id: args.id } });
            if (!perm) return toolText(`Tool permission not found: ${args.id}`);
            const data: Record<string, unknown> = {};
            if (args.enabled !== undefined) data["enabled"] = args.enabled;
            if (args.description !== undefined) data["description"] = args.description;
            const updated = await db.toolPermission.update({ where: { id: args.id }, data });
            appEventBus.emit("tool_permission_updated", { toolPermissionId: updated.id });
            return toolText(`Tool permission updated: ${updated.name} (enabled: ${updated.enabled})`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_tool_permission failed: ${msg}`);
          }
        },
      ),

      tool(
        "delete_tool_permission",
        "Remove a tool permission",
        {
          id: z.string().describe("Tool permission ID"),
        },
        async (args) => {
          try {
            const perm = await db.toolPermission.findUnique({ where: { id: args.id } });
            if (!perm) return toolText(`Tool permission not found: ${args.id}`);
            await db.toolPermission.delete({ where: { id: args.id } });
            appEventBus.emit("tool_permission_deleted", { toolPermissionId: args.id });
            return toolText(`Tool permission deleted: ${perm.name}`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`delete_tool_permission failed: ${msg}`);
          }
        },
      ),

      tool(
        "get_agent_tool_permissions",
        "Get an agent's merged tool permissions (workspace default + agent override)",
        {
          agentName: z.string().describe("Agent name (slug)"),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(args.agentName);
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);
            const perms = await db.toolPermission.findMany({ orderBy: { name: "asc" } });
            const overrides = (agent.toolPermissions as Record<string, boolean>) ?? {};
            const merged = perms.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description,
              enabled: overrides[p.name] !== undefined ? overrides[p.name] : p.enabled,
              overridden: overrides[p.name] !== undefined,
            }));
            return toolText(JSON.stringify(merged, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_agent_tool_permissions failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_agent_tool_permissions",
        "Update an agent's tool permission overrides",
        {
          agentName: z.string().describe("Agent name (slug)"),
          permissions: z.record(z.string(), z.boolean()).describe("Map of permission name to enabled state"),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(args.agentName);
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);
            const existing = (agent.toolPermissions as Record<string, boolean>) ?? {};
            const merged = { ...existing, ...args.permissions };
            await db.agent.update({
              where: { id: agent.id },
              data: { toolPermissions: merged },
            });
            appEventBus.emit("agent_updated", { agentId: agent.id });
            return toolText(`Agent ${agent.name} tool permissions updated.`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_agent_tool_permissions failed: ${msg}`);
          }
        },
      ),

      // --- MCP Server tools ---

      tool(
        "list_mcp_servers",
        "List all registered MCP servers with status",
        {},
        async () => {
          try {
            const servers = await db.mcpServerConfig.findMany({ orderBy: { name: "asc" } });
            return toolText(JSON.stringify(servers, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`list_mcp_servers failed: ${msg}`);
          }
        },
      ),

      tool(
        "get_mcp_server",
        "Get a single MCP server config by ID",
        {
          id: z.string().describe("MCP server config ID"),
        },
        async (args) => {
          try {
            const server = await db.mcpServerConfig.findUnique({ where: { id: args.id } });
            if (!server) return toolText(`MCP server not found: ${args.id}`);
            return toolText(JSON.stringify(server, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_mcp_server failed: ${msg}`);
          }
        },
      ),

      tool(
        "register_mcp_server",
        "Register a new external MCP server",
        {
          name: z.string().describe("Server display name"),
          protocol: z.enum(["stdio", "sse", "http"]).describe("Protocol type"),
          uri: z.string().describe("Server URI"),
          iconName: z.string().optional().describe("Lucide icon name"),
          iconColor: z.string().optional().describe("Icon color hex"),
        },
        async (args) => {
          try {
            const ssrfResult = validateMcpUri(args.uri, args.protocol);
            if (!ssrfResult.valid) {
              return toolText(`register_mcp_server failed: ${ssrfResult.error}`);
            }
            const server = await db.mcpServerConfig.create({
              data: {
                name: args.name,
                protocol: args.protocol,
                uri: args.uri,
                iconName: args.iconName ?? null,
                iconColor: args.iconColor ?? null,
              },
            });
            appEventBus.emit("mcp_server_created", { mcpServerId: server.id });
            return toolText(`MCP server registered: ${server.name} (${server.id})`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`register_mcp_server failed: ${msg}`);
          }
        },
      ),

      tool(
        "update_mcp_server",
        "Update MCP server config",
        {
          id: z.string().describe("MCP server config ID"),
          name: z.string().optional().describe("New name"),
          protocol: z.enum(["stdio", "sse", "http"]).optional().describe("New protocol"),
          uri: z.string().optional().describe("New URI"),
        },
        async (args) => {
          try {
            const server = await db.mcpServerConfig.findUnique({ where: { id: args.id } });
            if (!server) return toolText(`MCP server not found: ${args.id}`);
            if (args.uri !== undefined) {
              const protocol = args.protocol ?? server.protocol;
              const ssrfResult = validateMcpUri(args.uri, protocol);
              if (!ssrfResult.valid) {
                return toolText(`update_mcp_server failed: ${ssrfResult.error}`);
              }
            }
            const data: Record<string, unknown> = {};
            if (args.name !== undefined) data["name"] = args.name;
            if (args.protocol !== undefined) data["protocol"] = args.protocol;
            if (args.uri !== undefined) data["uri"] = args.uri;
            const updated = await db.mcpServerConfig.update({ where: { id: args.id }, data });
            appEventBus.emit("mcp_server_updated", { mcpServerId: updated.id });
            return toolText(`MCP server updated: ${updated.name}`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`update_mcp_server failed: ${msg}`);
          }
        },
      ),

      tool(
        "remove_mcp_server",
        "Remove a registered MCP server",
        {
          id: z.string().describe("MCP server config ID"),
        },
        async (args) => {
          try {
            const server = await db.mcpServerConfig.findUnique({ where: { id: args.id } });
            if (!server) return toolText(`MCP server not found: ${args.id}`);
            await db.mcpServerConfig.delete({ where: { id: args.id } });
            appEventBus.emit("mcp_server_deleted", { mcpServerId: args.id });
            return toolText(`MCP server removed: ${server.name}`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`remove_mcp_server failed: ${msg}`);
          }
        },
      ),

      tool(
        "ping_mcp_server",
        "Manually trigger a health check for an MCP server",
        {
          id: z.string().describe("MCP server config ID"),
        },
        async (args) => {
          try {
            const server = await db.mcpServerConfig.findUnique({ where: { id: args.id } });
            if (!server) return toolText(`MCP server not found: ${args.id}`);
            const updated = await db.mcpServerConfig.update({
              where: { id: args.id },
              data: {
                lastPingAt: new Date(),
                consecutiveFailures: 0,
                status: "connected",
                errorMessage: null,
              },
            });
            appEventBus.emit("mcp_server_status_changed", { mcpServerId: updated.id, status: "connected" });
            return toolText(`MCP server pinged: ${updated.name} — status: connected`);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`ping_mcp_server failed: ${msg}`);
          }
        },
      ),

      // --- Task Board tool ---

      tool(
        "get_task_board",
        "Get kanban board view of tasks grouped by column",
        {
          search: z.string().optional().describe("Search text in task prompt"),
          assignee: z.string().optional().describe("Filter by assignee agent name"),
          priority: z.number().optional().describe("Filter by priority"),
        },
        async (args) => {
          try {
            const where: Record<string, unknown> = {};
            if (args.search) {
              where["prompt"] = { contains: args.search, mode: "insensitive" };
            }
            if (args.assignee) {
              const agent = await getAgentByIdOrName(args.assignee);
              if (agent) where["assigneeId"] = agent.id;
            }
            if (args.priority !== undefined) {
              where["priority"] = args.priority;
            }

            const tasks = await db.task.findMany({
              where,
              orderBy: { createdAt: "desc" },
              take: 100,
              include: {
                assignee: { select: { id: true, name: true, displayName: true, avatarColor: true } },
              },
            });

            const columns: Record<string, { tasks: unknown[]; count: number }> = {
              backlog: { tasks: [], count: 0 },
              in_progress: { tasks: [], count: 0 },
              review: { tasks: [], count: 0 },
              done: { tasks: [], count: 0 },
            };

            const statusMap: Record<string, string> = {
              pending: "backlog",
              blocked: "backlog",
              running: "in_progress",
              review: "review",
              completed: "done",
              failed: "done",
            };

            for (const task of tasks) {
              const col = statusMap[task.status] ?? "backlog";
              columns[col]!.tasks.push(task);
              columns[col]!.count++;
            }

            return toolText(JSON.stringify({ columns, total: tasks.length }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_task_board failed: ${msg}`);
          }
        },
      ),

      // --- Agent metrics tool ---

      tool(
        "get_agent_metrics",
        "Get metrics for an agent (tasks completed, spend, queue depth)",
        {
          agentName: z.string().describe("Agent name (slug)"),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(args.agentName);
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            const tasksCompleted = await db.task.count({
              where: { assigneeId: agent.id, status: "completed" },
            });

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const todayTasks = await db.task.findMany({
              where: { assigneeId: agent.id, status: "completed", completedAt: { gte: startOfDay } },
              select: { costUsd: true },
            });
            const spendToday = todayTasks.reduce((sum, t) => sum + (t.costUsd ?? 0), 0);

            const queueDepth = await db.task.count({
              where: { assigneeId: agent.id, status: "pending" },
            });

            const currentTask = await db.task.findFirst({
              where: { assigneeId: agent.id, status: "running" },
              select: { id: true, prompt: true, status: true },
            });

            return toolText(JSON.stringify({
              agent: agent.name,
              tasksCompleted,
              spendToday: `$${spendToday.toFixed(2)}`,
              queueDepth,
              currentTask,
            }, null, 2));
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_agent_metrics failed: ${msg}`);
          }
        },
      ),

      // --- Agent system prompt tool ---

      tool(
        "get_agent_system_prompt",
        "Get the assembled system prompt for an agent (read-only)",
        {
          agentName: z.string().describe("Agent name (slug)"),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(args.agentName);
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            const toolPerms = (agent.toolPermissions as Record<string, boolean>) ?? {};
            const enabledTools = Object.entries(toolPerms).filter(([, v]) => v).map(([k]) => k);

            const systemPrompt = [
              `You are ${agent.displayName}, ${agent.role} at Generic Corp.`,
              "",
              agent.personality,
              "",
              "## Available Tools",
              enabledTools.length > 0
                ? enabledTools.map((t) => `- ${t}`).join("\n")
                : "(no tool permissions configured)",
              "",
              "## Department",
              agent.department,
            ].join("\n");

            return toolText(systemPrompt);
          } catch (error) {
            const msg = error instanceof Error ? error.message : "Unknown error";
            return toolText(`get_agent_system_prompt failed: ${msg}`);
          }
        },
      ),
    ],
  });
}
