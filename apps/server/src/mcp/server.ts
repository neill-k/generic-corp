import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { db } from "../db/client.js";

import { enqueueAgentTask } from "../queue/agent-queues.js";

import { BOARD_TYPE_TO_FOLDER, type BoardItemType } from "@generic-corp/shared";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ToolTextResult = { content: Array<{ type: "text"; text: string }> };

function toolText(text: string): ToolTextResult {
  return { content: [{ type: "text", text }] };
}

function safeIsoForFilename(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
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

async function ensureDir(p: string) {
  await mkdir(p, { recursive: true });
}

async function writeBoardItem(params: {
  agentName: string;
  type: BoardItemType;
  content: string;
}): Promise<string> {
  const root = resolveWorkspaceRoot();
  const folder = BOARD_TYPE_TO_FOLDER[params.type];
  const dir = path.join(root, "board", folder);
  await ensureDir(dir);

  const now = new Date();
  const fileName = `${safeIsoForFilename(now)}-${params.agentName}.md`;
  const filePath = path.join(dir, fileName);
  const body = `# ${params.type}\n\nAuthor: ${params.agentName}\nTime: ${now.toISOString()}\n\n---\n\n${params.content.trim()}\n`;
  await writeFile(filePath, body, "utf8");

  return filePath;
}

async function listBoardItems(params: {
  type?: BoardItemType;
  since?: string;
}): Promise<
  Array<{ author: string; type: BoardItemType; summary: string; timestamp: string; path: string }>
> {
  const root = resolveWorkspaceRoot();
  const types: BoardItemType[] = params.type
    ? [params.type]
    : (Object.keys(BOARD_TYPE_TO_FOLDER) as BoardItemType[]);

  const sinceMs = params.since ? Date.parse(params.since) : null;
  if (params.since && Number.isNaN(sinceMs)) {
    throw new Error(`Invalid 'since' timestamp: ${params.since}`);
  }

  const items: Array<{ author: string; type: BoardItemType; summary: string; timestamp: string; path: string }>
    = [];

  for (const type of types) {
    const folder = BOARD_TYPE_TO_FOLDER[type];
    const dir = path.join(root, "board", folder);

    let files: string[] = [];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = path.join(dir, file);

      let text: string;
      try {
        text = await readFile(filePath, "utf8");
      } catch {
        continue;
      }

      const summaryLine = text
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.length > 0 && !l.startsWith("#"))
        ?? "";

      // If the file includes a Time: line, prefer that.
      const timeLine = text
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("Time: "));

      const timestamp = timeLine ? timeLine.replace("Time: ", "") : new Date().toISOString();
      const timestampMs = Date.parse(timestamp);
      if (sinceMs !== null && !Number.isNaN(timestampMs) && timestampMs < sinceMs) continue;

      const authorLine = text
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("Author: "));
      const author = authorLine ? authorLine.replace("Author: ", "") : "unknown";

      items.push({
        author,
        type,
        summary: summaryLine,
        timestamp,
        path: filePath,
      });
    }
  }

  items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
  return items;
}

export function createGcMcpServer(agentId: string, taskId: string) {
  return createSdkMcpServer({
    name: "generic-corp",
    version: "1.0.0",
    tools: [
      tool(
        "delegate_task",
        "Assign work to a direct report",
        {
          targetAgent: z.string().describe("Name (slug) of the direct report"),
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

            const reports = await getDirectReportsFor(caller.id);
            const target = reports.find((r) => r.name === args.targetAgent);
            if (!target) {
              const names = reports.map((r) => r.name).join(", ") || "(none)";
              return toolText(
                `Cannot delegate to '${args.targetAgent}'. Valid direct reports for ${caller.name}: ${names}`,
              );
            }

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
        "Signal task completion with result and learnings",
        {
          status: z.enum(["completed", "blocked", "needs_followup"]),
          resultSummary: z.string(),
          nextSteps: z.string().optional(),
          learnings: z.string().optional(),
          blockers: z.string().optional(),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(agentId);
            if (!agent) return toolText(`Unknown caller agent: ${agentId}`);

            const task = await db.task.findUnique({
              where: { id: taskId },
              select: { id: true, assigneeId: true },
            });
            if (!task) return toolText(`Unknown task: ${taskId}`);
            if (task.assigneeId !== agent.id) {
              return toolText(`finish_task denied: task ${taskId} is not assigned to ${agent.name}`);
            }

            const mappedStatus =
              args.status === "completed" ? "completed" : args.status === "blocked" ? "blocked" : "pending";
            const fullResult = [args.resultSummary, args.nextSteps ? `\n\nNext steps:\n${args.nextSteps}` : ""]
              .filter(Boolean)
              .join("");

            const updated = await db.task.update({
              where: { id: taskId },
              data: {
                status: mappedStatus,
                result: fullResult,
                learnings: args.learnings ?? null,
                completedAt: args.status === "completed" ? new Date() : null,
                priority: args.status === "needs_followup" ? { increment: 1 } : undefined,
              },
              select: { id: true, priority: true },
            });

            if (args.status === "needs_followup") {
              await enqueueAgentTask({ agentName: agent.name, taskId, priority: updated.priority });
            }

            if (args.learnings && args.learnings.trim().length > 0) {
              const root = resolveWorkspaceRoot();
              const dir = path.join(root, "docs", "learnings");
              await ensureDir(dir);
              const now = new Date();
              const filePath = path.join(dir, `${safeIsoForFilename(now)}-${agent.name}-task-${taskId}.md`);
              const body = `---\nauthor: ${agent.name}\ndate: ${now.toISOString()}\ntags: [task] \n---\n\n${args.learnings.trim()}\n`;
              await writeFile(filePath, body, "utf8");
            }

            if (args.status === "blocked") {
              const content = args.blockers?.trim().length
                ? args.blockers.trim()
                : `Task ${taskId} blocked: ${args.resultSummary}`;
              await writeBoardItem({ agentName: agent.name, type: "blocker", content });
            }

            return toolText("Acknowledged.");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`finish_task failed: ${message}`);
          }
        },
      ),

      tool(
        "get_my_org",
        "Discover your direct reports and their current status",
        {},
        async () => {
          try {
            const self = await getAgentByIdOrName(agentId);
            if (!self) return toolText(`Unknown caller agent: ${agentId}`);

            const reports = await getDirectReportsFor(self.id);

            const reportItems = await Promise.all(
              reports.map(async (r) => {
                const queued = await db.task.count({ where: { assigneeId: r.id, status: "pending" } });

                let currentTaskPrompt: string | null = null;
                if (r.currentTaskId) {
                  const t = await db.task.findUnique({
                    where: { id: r.currentTaskId },
                    select: { prompt: true },
                  });
                  currentTaskPrompt = t?.prompt ?? null;
                }

                return {
                  name: r.name,
                  role: r.role,
                  department: r.department,
                  status: r.status,
                  currentTask: currentTaskPrompt,
                  queuedTasks: queued,
                };
              }),
            );

            return toolText(
              JSON.stringify(
                {
                  self: { name: self.name, role: self.role, department: self.department, status: self.status },
                  directReports: reportItems,
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
        "Check an agent's current status",
        {
          agentName: z.string(),
        },
        async (args) => {
          try {
            const agent = await db.agent.findUnique({ where: { name: args.agentName } });
            if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

            let currentTaskPrompt: string | null = null;
            if (agent.currentTaskId) {
              const t = await db.task.findUnique({ where: { id: agent.currentTaskId }, select: { prompt: true } });
              currentTaskPrompt = t?.prompt ?? null;
            }

            return toolText(
              JSON.stringify(
                {
                  name: agent.name,
                  role: agent.role,
                  department: agent.department,
                  status: agent.status,
                  currentTask: currentTaskPrompt,
                },
                null,
                2,
              ),
            );
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
          type: z.enum(["status_update", "blocker", "finding", "request"]).optional(),
          since: z.string().optional(),
        },
        async (args) => {
          try {
            // scope is not enforced yet (needs org/team mapping and shared workspace conventions)
            void args.scope;

            const items = await listBoardItems({
              type: args.type as BoardItemType | undefined,
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
          type: z.enum(["status_update", "blocker", "finding", "request"]),
          content: z.string(),
        },
        async (args) => {
          try {
            const agent = await getAgentByIdOrName(agentId);
            const agentName = agent?.name ?? agentId;
            const filePath = await writeBoardItem({
              agentName,
              type: args.type as BoardItemType,
              content: args.content,
            });
            return toolText(JSON.stringify({ path: filePath }, null, 2));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            return toolText(`post_board_item failed: ${message}`);
          }
        },
      ),
    ],
  });
}
