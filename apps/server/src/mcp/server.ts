import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import crypto from "node:crypto";
import path from "node:path";

import { db } from "../db/client.js";

import { enqueueAgentTask } from "../queue/agent-queues.js";

import { appEventBus } from "../services/app-events.js";
import { BoardService } from "../services/board-service.js";

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

export function createGcMcpServer(agentId: string, taskId: string) {
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

      // --- Messaging tools ---

      tool(
        "send_message",
        "Send a message to another agent",
        {
          toAgent: z.string().describe("Name (slug) of the recipient agent"),
          body: z.string().describe("Message content"),
          threadId: z.string().optional().describe("Thread ID to continue a conversation"),
          type: z.string().optional().describe("Message type (default: direct)"),
        },
        async (args) => {
          try {
            const sender = await getAgentByIdOrName(agentId);
            if (!sender) return toolText(`Unknown caller agent: ${agentId}`);

            const recipient = await db.agent.findUnique({
              where: { name: args.toAgent },
              select: { id: true, name: true },
            });
            if (!recipient) return toolText(`Unknown agent: ${args.toAgent}`);

            const threadId = args.threadId ?? crypto.randomUUID();

            const message = await db.message.create({
              data: {
                fromAgentId: sender.id,
                toAgentId: recipient.id,
                threadId,
                body: args.body,
                type: args.type ?? "direct",
                status: "delivered",
              },
              select: { id: true, threadId: true },
            });

            appEventBus.emit("message_created", {
              messageId: message.id,
              threadId,
              fromAgentId: sender.id,
              toAgentId: recipient.id,
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
              assignee: task.assignee.name,
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
              assignee: t.assignee.name,
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
    ],
  });
}
