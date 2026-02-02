import { Worker } from "bullmq";

import type { Agent, Task } from "@prisma/client";
import { MAIN_AGENT_NAME } from "@generic-corp/shared";

import { db } from "../db/client.js";
import { createGcMcpServer } from "../mcp/server.js";
import { appEventBus } from "../services/app-events.js";
import type { AgentRuntime } from "../services/agent-lifecycle.js";
import { AgentSdkRuntime } from "../services/agent-runtime-sdk.js";
import { AgentCliRuntime } from "../services/agent-runtime-cli.js";
import { BoardService } from "../services/board-service.js";
import { checkContextHealth } from "../services/context-health.js";
import { handleChildCompletion } from "../services/delegation-flow.js";
import { buildSystemPrompt } from "../services/prompt-builder.js";
import { ALL_SKILL_IDS } from "../services/skills.js";
import type { WorkspaceManager } from "../services/workspace-manager.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { queueNameForAgent } from "./agent-queues.js";
import { closeRedis, getRedis } from "./redis.js";

type WorkerJobData = { taskId: string };

const workers: Worker[] = [];
let workspaceManager: WorkspaceManager | null = null;

export function createRuntime(): AgentRuntime {
  const runtimeType = process.env["GC_RUNTIME"] ?? "sdk";
  if (runtimeType === "cli") return new AgentCliRuntime();
  return new AgentSdkRuntime();
}

export function setWorkspaceManager(wm: WorkspaceManager) {
  workspaceManager = wm;
}

function getWorkspaceManager(): WorkspaceManager {
  if (!workspaceManager) {
    throw new Error("[Queue] WorkspaceManager not set — call setWorkspaceManager() before starting workers");
  }
  return workspaceManager;
}

async function markTaskRunning(agent: Agent, taskId: string) {
  await db.task.update({
    where: { id: taskId },
    data: { status: "running", startedAt: new Date() },
  });

  await db.agent.update({
    where: { id: agent.id },
    data: { status: "running", currentTaskId: taskId },
  });

  appEventBus.emit("agent_status_changed", { agentId: agent.name, status: "running" });
  appEventBus.emit("task_status_changed", { taskId, status: "running" });
}

async function markAgentIdle(agentId: string) {
  const agent = await db.agent.update({ where: { id: agentId }, data: { status: "idle", currentTaskId: null } });
  appEventBus.emit("agent_status_changed", { agentId: agent.name, status: "idle" });
}

async function maybeFinalizeTask(taskId: string, fallback: { output: string }) {
  const existing = await db.task.findUnique({ where: { id: taskId }, select: { status: true, result: true } });
  if (!existing) return;

  // If agent already called finish_task, status won't be "running" — respect that
  if (existing.status !== "running") return;

  // Agent didn't explicitly call finish_task — mark as failed (agent must be intentional)
  await db.task.update({
    where: { id: taskId },
    data: {
      status: "failed",
      result: existing.result ?? `Agent did not call finish_task. Last output: ${fallback.output.slice(0, 500)}`,
      completedAt: new Date(),
    },
  });

  appEventBus.emit("task_status_changed", { taskId, status: "failed" });
}

async function loadOrgReports(agentDbId: string) {
  const myNode = await db.orgNode.findUnique({ where: { agentId: agentDbId }, select: { id: true } });
  if (!myNode) return [];
  const children = await db.orgNode.findMany({
    where: { parentNodeId: myNode.id },
    select: { agent: { select: { name: true, role: true, status: true, currentTaskId: true } } },
  });
  return Promise.all(children.map(async (c) => {
    let currentTask: string | null = null;
    if (c.agent.currentTaskId) {
      const t = await db.task.findUnique({ where: { id: c.agent.currentTaskId }, select: { prompt: true } });
      currentTask = t?.prompt?.slice(0, 80) ?? null;
    }
    return { name: c.agent.name, role: c.agent.role, status: c.agent.status, currentTask };
  }));
}

async function loadRecentBoardItems() {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) return [];
  try {
    const boardService = new BoardService(root);
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const items = await boardService.listBoardItems({ since });
    return items.slice(0, 10).map((item) => ({
      type: item.type,
      author: item.author,
      summary: item.summary.slice(0, 100),
      timestamp: item.timestamp,
    }));
  } catch {
    return [];
  }
}

async function loadManager(agentDbId: string) {
  const myNode = await db.orgNode.findUnique({ where: { agentId: agentDbId }, select: { parentNodeId: true } });
  if (!myNode?.parentNodeId) return null;
  const parentNode = await db.orgNode.findUnique({
    where: { id: myNode.parentNodeId },
    select: { agent: { select: { name: true, role: true, status: true } } },
  });
  if (!parentNode) return null;
  return { name: parentNode.agent.name, role: parentNode.agent.role, status: parentNode.agent.status };
}

async function loadPeers(agentDbId: string, department: string) {
  const peers = await db.agent.findMany({
    where: { department, id: { not: agentDbId } },
    select: { name: true, role: true, status: true },
    take: 10,
  });
  return peers;
}

async function loadUnreadCount(agentDbId: string) {
  return db.message.count({
    where: { toAgentId: agentDbId, status: { not: "read" } },
  });
}

async function loadParentTask(parentTaskId: string | null) {
  if (!parentTaskId) return null;
  const parent = await db.task.findUnique({
    where: { id: parentTaskId },
    select: { id: true, prompt: true, delegator: { select: { name: true } } },
  });
  if (!parent) return null;
  return { id: parent.id, prompt: parent.prompt, delegatorName: parent.delegator?.name ?? null };
}

async function loadTaskHistory(agentDbId: string) {
  const tasks = await db.task.findMany({
    where: { assigneeId: agentDbId, status: { in: ["completed", "failed"] } },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { id: true, prompt: true, status: true, completedAt: true },
  });
  return tasks.map((t) => ({
    id: t.id,
    prompt: t.prompt,
    status: t.status,
    completedAt: t.completedAt?.toISOString() ?? null,
  }));
}

async function loadReportWorkloads(agentDbId: string) {
  const myNode = await db.orgNode.findUnique({ where: { agentId: agentDbId }, select: { id: true } });
  if (!myNode) return [];
  const children = await db.orgNode.findMany({
    where: { parentNodeId: myNode.id },
    select: { agent: { select: { id: true, name: true } } },
  });
  return Promise.all(children.map(async (c) => {
    const [pending, running] = await Promise.all([
      db.task.count({ where: { assigneeId: c.agent.id, status: "pending" } }),
      db.task.count({ where: { assigneeId: c.agent.id, status: "running" } }),
    ]);
    return { name: c.agent.name, pendingTasks: pending, runningTasks: running };
  }));
}

async function loadDepartmentSummary(department: string) {
  const agents = await db.agent.findMany({
    where: { department },
    select: { status: true },
  });
  if (agents.length === 0) return null;
  const counts = { idle: 0, running: 0, error: 0, offline: 0 };
  for (const a of agents) {
    const s = a.status as keyof typeof counts;
    if (s in counts) counts[s]++;
  }
  return {
    department,
    totalAgents: agents.length,
    ...counts,
  };
}

async function loadActiveBlockers() {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) return [];
  try {
    const boardService = new BoardService(root);
    const items = await boardService.listBoardItems({ type: "blocker" });
    return items.slice(0, 5).map((item) => ({
      author: item.author,
      summary: item.summary.slice(0, 200),
      timestamp: item.timestamp,
    }));
  } catch {
    return [];
  }
}

async function loadUnreadMessagePreviews(agentDbId: string) {
  const messages = await db.message.findMany({
    where: { toAgentId: agentDbId, status: { not: "read" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      threadId: true,
      body: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
  });
  return messages.map((m) => ({
    from: m.sender?.name ?? "human",
    threadId: m.threadId ?? "unknown",
    preview: m.body.length > 80 ? m.body.slice(0, 80) + "..." : m.body,
    receivedAt: m.createdAt.toISOString(),
  }));
}

async function loadOrgOverview() {
  const agents = await db.agent.findMany({
    where: { name: { not: MAIN_AGENT_NAME } },
    select: {
      name: true,
      displayName: true,
      role: true,
      department: true,
      level: true,
      status: true,
      currentTaskId: true,
      orgNode: {
        select: {
          parent: {
            select: { agent: { select: { name: true } } },
          },
        },
      },
    },
  });

  return Promise.all(agents.map(async (a) => {
    let currentTask: string | null = null;
    if (a.currentTaskId) {
      const t = await db.task.findUnique({ where: { id: a.currentTaskId }, select: { prompt: true } });
      currentTask = t?.prompt?.slice(0, 80) ?? null;
    }
    return {
      name: a.name,
      displayName: a.displayName,
      role: a.role,
      department: a.department,
      level: a.level,
      status: a.status,
      currentTask,
      reportsTo: a.orgNode?.parent?.agent.name ?? null,
    };
  }));
}

async function loadPendingResults(agentName: string) {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) return [];
  const resultsDir = path.join(root, agentName, ".gc", "results");
  try {
    const files = await readdir(resultsDir);
    const results = [];
    for (const file of files.slice(0, 5)) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(path.join(resultsDir, file), "utf8");
      const taskIdMatch = content.match(/\*\*Task ID\*\*:\s*(\S+)/);
      results.push({ childTaskId: taskIdMatch?.[1] ?? file, result: content.slice(0, 500) });
    }
    return results;
  } catch {
    return [];
  }
}

async function runTask(task: Task & { assignee: Agent }) {
  const wm = getWorkspaceManager();
  const cwd = await wm.ensureAgentWorkspace(task.assignee.name);
  const runtime = createRuntime();
  const isMainAgent = task.assignee.name === MAIN_AGENT_NAME;

  const [orgReports, recentBoardItems, pendingResults, manager, peers, unreadMessageCount, parentTask, taskHistory, contextHealthWarning, reportWorkloads, departmentSummary, activeBlockers, unreadMessagePreviews, orgOverview] = await Promise.all([
    isMainAgent ? Promise.resolve([]) : loadOrgReports(task.assignee.id),
    loadRecentBoardItems(),
    loadPendingResults(task.assignee.name),
    isMainAgent ? Promise.resolve(null) : loadManager(task.assignee.id),
    isMainAgent ? Promise.resolve([]) : loadPeers(task.assignee.id, task.assignee.department),
    loadUnreadCount(task.assignee.id),
    isMainAgent ? Promise.resolve(null) : loadParentTask(task.parentTaskId),
    loadTaskHistory(task.assignee.id),
    checkContextHealth(cwd),
    isMainAgent ? Promise.resolve([]) : loadReportWorkloads(task.assignee.id),
    isMainAgent ? Promise.resolve(null) : loadDepartmentSummary(task.assignee.department),
    loadActiveBlockers(),
    loadUnreadMessagePreviews(task.assignee.id),
    isMainAgent ? loadOrgOverview() : Promise.resolve(undefined),
  ]);

  const systemPrompt = buildSystemPrompt({
    agent: task.assignee,
    task,
    orgReports,
    recentBoardItems,
    pendingResults,
    manager,
    peers,
    unreadMessageCount,
    parentTask,
    taskHistory,
    contextHealthWarning,
    reportWorkloads,
    departmentSummary,
    activeBlockers,
    unreadMessagePreviews,
    orgOverview,
    skills: ALL_SKILL_IDS,
  });
  const mcpServer = createGcMcpServer(task.assignee.name, task.id, runtime);

  let lastResult: { output: string; costUsd: number; durationMs: number; numTurns: number; status: string } | null = null;
  let usedSendMessage = false;

  for await (const event of runtime.invoke({
    agentId: task.assignee.name,
    taskId: task.id,
    prompt: task.prompt,
    systemPrompt,
    cwd,
    mcpServer,
  })) {
    appEventBus.emit("agent_event", {
      agentId: task.assignee.name,
      agentDbId: task.assignee.id,
      taskId: task.id,
      event,
    });

    if (event.type === "message") {
      console.log(`[Agent:${task.assignee.name}] ${event.content}`);
    }
    if (event.type === "tool_use" && event.tool === "send_message") {
      usedSendMessage = true;
    }
    if (event.type === "result") {
      lastResult = event.result;
    }
  }

  if (lastResult) {
    await db.task.update({
      where: { id: task.id },
      data: {
        costUsd: lastResult.costUsd,
        durationMs: lastResult.durationMs,
        numTurns: lastResult.numTurns,
      },
    });

    // Fallback: if this was a chat task and agent didn't use send_message,
    // capture the text output as a chat reply
    const chatThreadMatch = task.context?.match(/thread "([^"]+)"/);
    if (chatThreadMatch && !usedSendMessage && lastResult.output && lastResult.output.length > 0) {
      const threadId = chatThreadMatch[1];
      console.log(`[Agent:${task.assignee.name}] Fallback: creating chat reply from text output`);
      const message = await db.message.create({
        data: {
          fromAgentId: task.assignee.id,
          toAgentId: task.assignee.id, // self (reply to thread)
          threadId,
          body: lastResult.output,
          type: "chat",
          status: "delivered",
        },
        select: { id: true },
      });
      appEventBus.emit("message_created", {
        messageId: message.id,
        threadId: threadId!,
        fromAgentId: task.assignee.id,
        toAgentId: task.assignee.id,
      });
      // Mark task as completed since the agent did respond
      await db.task.update({
        where: { id: task.id },
        data: { status: "completed", result: "Chat reply sent (fallback)", completedAt: new Date() },
      });
      appEventBus.emit("task_status_changed", { taskId: task.id, status: "completed" });
    } else {
      await maybeFinalizeTask(task.id, {
        output: lastResult.output,
      });
    }
  }

  // Post-run: notify parent task if this was a delegated child task
  const finalTask = await db.task.findUnique({
    where: { id: task.id },
    select: { id: true, parentTaskId: true, assigneeId: true, result: true, status: true },
  });
  if (finalTask && finalTask.status === "completed" && finalTask.parentTaskId) {
    const root = process.env["GC_WORKSPACE_ROOT"];
    if (root) {
      await handleChildCompletion(finalTask, root);
    }
  }
}

function startWorkerForAgent(agentName: string) {
  const worker = new Worker<WorkerJobData>(
    queueNameForAgent(agentName),
    async (job) => {
      const taskId = job.data.taskId;
      const task = await db.task.findUnique({
        where: { id: taskId },
        include: { assignee: true },
      });

      if (!task) return;
      if (!task.assignee) return;
      if (task.assignee.name !== agentName) return;
      if (task.status !== "pending") return;

      const assignee = task.assignee;
      const assigneeId = task.assigneeId!;

      await markTaskRunning(assignee, taskId);

      let failed = false;
      try {
        await runTask(task as typeof task & { assignee: NonNullable<typeof task.assignee> });
      } catch (error) {
        failed = true;
        const message = error instanceof Error ? error.message : "Unknown error";
        await db.task.update({ where: { id: taskId }, data: { status: "failed", result: message } });
        await db.agent.update({ where: { id: assigneeId }, data: { status: "error" } });
        appEventBus.emit("agent_status_changed", { agentId: agentName, status: "error" });
        appEventBus.emit("task_status_changed", { taskId, status: "failed" });
        throw error;
      } finally {
        if (!failed) {
          await markAgentIdle(assigneeId);
        }
      }
    },
    { connection: getRedis(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[Queue] job failed agent=${agentName} jobId=${job?.id ?? "?"}`, err);
  });

  workers.push(worker);
}

export async function startAgentWorkers() {
  const agents = await db.agent.findMany({ select: { name: true } });
  for (const agent of agents) {
    startWorkerForAgent(agent.name);
  }

  console.log(`[Queue] started ${workers.length} agent workers`);
}

export async function stopAgentWorkers() {
  await Promise.all(workers.map((w) => w.close()));
  workers.splice(0, workers.length);
  await closeRedis();
}
