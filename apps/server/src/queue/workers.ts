import { Worker } from "bullmq";

import type { Agent, PrismaClient, Task } from "@prisma/client";
import { MAIN_AGENT_NAME } from "@generic-corp/shared";

import { getPrismaForTenant, getPublicPrisma } from "../lib/prisma-tenant.js";
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

import { enqueueAgentTask, queueNameForTenant } from "./agent-queues.js";
import { closeRedis, getRedis } from "./redis.js";

export type WorkerJobData = { taskId: string; orgSlug: string; agentName: string };

const AGENT_BUSY_DELAY_MS = 2000;

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

async function markTaskRunning(prisma: PrismaClient, agent: Agent, taskId: string, orgSlug: string) {
  await prisma.task.update({
    where: { id: taskId },
    data: { status: "running", startedAt: new Date() },
  });

  await prisma.agent.update({
    where: { id: agent.id },
    data: { status: "running", currentTaskId: taskId },
  });

  appEventBus.emit("agent_status_changed", { agentId: agent.name, status: "running", orgSlug });
  appEventBus.emit("task_status_changed", { taskId, status: "running", orgSlug });
}

async function markAgentIdle(prisma: PrismaClient, agentId: string, orgSlug: string) {
  const agent = await prisma.agent.update({ where: { id: agentId }, data: { status: "idle", currentTaskId: null } });
  appEventBus.emit("agent_status_changed", { agentId: agent.name, status: "idle", orgSlug });
}

async function maybeFinalizeTask(prisma: PrismaClient, taskId: string, fallback: { output: string }, orgSlug: string) {
  const existing = await prisma.task.findUnique({ where: { id: taskId }, select: { status: true, result: true } });
  if (!existing) return;

  // If agent already called finish_task, status won't be "running" — respect that
  if (existing.status !== "running") return;

  // Agent didn't explicitly call finish_task — mark as failed (agent must be intentional)
  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "failed",
      result: existing.result ?? `Agent did not call finish_task. Last output: ${fallback.output.slice(0, 500)}`,
      completedAt: new Date(),
    },
  });

  appEventBus.emit("task_status_changed", { taskId, status: "failed", orgSlug });
}

async function loadOrgReports(prisma: PrismaClient, agentDbId: string) {
  const myNode = await prisma.orgNode.findUnique({ where: { agentId: agentDbId }, select: { id: true } });
  if (!myNode) return [];
  const children = await prisma.orgNode.findMany({
    where: { parentNodeId: myNode.id },
    select: { agent: { select: { name: true, role: true, status: true, currentTaskId: true } } },
  });
  return Promise.all(children.map(async (c) => {
    let currentTask: string | null = null;
    if (c.agent.currentTaskId) {
      const t = await prisma.task.findUnique({ where: { id: c.agent.currentTaskId }, select: { prompt: true } });
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

async function loadManager(prisma: PrismaClient, agentDbId: string) {
  const myNode = await prisma.orgNode.findUnique({ where: { agentId: agentDbId }, select: { parentNodeId: true } });
  if (!myNode?.parentNodeId) return null;
  const parentNode = await prisma.orgNode.findUnique({
    where: { id: myNode.parentNodeId },
    select: { agent: { select: { name: true, role: true, status: true } } },
  });
  if (!parentNode) return null;
  return { name: parentNode.agent.name, role: parentNode.agent.role, status: parentNode.agent.status };
}

async function loadPeers(prisma: PrismaClient, agentDbId: string, department: string) {
  const peers = await prisma.agent.findMany({
    where: { department, id: { not: agentDbId } },
    select: { name: true, role: true, status: true },
    take: 10,
  });
  return peers;
}

async function loadUnreadCount(prisma: PrismaClient, agentDbId: string) {
  return prisma.message.count({
    where: { toAgentId: agentDbId, status: { not: "read" } },
  });
}

async function loadParentTask(prisma: PrismaClient, parentTaskId: string | null) {
  if (!parentTaskId) return null;
  const parent = await prisma.task.findUnique({
    where: { id: parentTaskId },
    select: { id: true, prompt: true, delegator: { select: { name: true } } },
  });
  if (!parent) return null;
  return { id: parent.id, prompt: parent.prompt, delegatorName: parent.delegator?.name ?? null };
}

async function loadTaskHistory(prisma: PrismaClient, agentDbId: string) {
  const tasks = await prisma.task.findMany({
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

async function loadReportWorkloads(prisma: PrismaClient, agentDbId: string) {
  const myNode = await prisma.orgNode.findUnique({ where: { agentId: agentDbId }, select: { id: true } });
  if (!myNode) return [];
  const children = await prisma.orgNode.findMany({
    where: { parentNodeId: myNode.id },
    select: { agent: { select: { id: true, name: true } } },
  });
  return Promise.all(children.map(async (c) => {
    const [pending, running] = await Promise.all([
      prisma.task.count({ where: { assigneeId: c.agent.id, status: "pending" } }),
      prisma.task.count({ where: { assigneeId: c.agent.id, status: "running" } }),
    ]);
    return { name: c.agent.name, pendingTasks: pending, runningTasks: running };
  }));
}

async function loadDepartmentSummary(prisma: PrismaClient, department: string) {
  const agents = await prisma.agent.findMany({
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

async function loadUnreadMessagePreviews(prisma: PrismaClient, agentDbId: string) {
  const messages = await prisma.message.findMany({
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

async function loadOrgOverview(prisma: PrismaClient) {
  const agents = await prisma.agent.findMany({
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
      const t = await prisma.task.findUnique({ where: { id: a.currentTaskId }, select: { prompt: true } });
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

async function runTask(prisma: PrismaClient, orgSlug: string, task: Task & { assignee: Agent }) {
  const wm = getWorkspaceManager();
  const cwd = await wm.ensureAgentWorkspace(task.assignee.name);
  const runtime = createRuntime();
  const isMainAgent = task.assignee.name === MAIN_AGENT_NAME;

  const [orgReports, recentBoardItems, pendingResults, manager, peers, unreadMessageCount, parentTask, taskHistory, contextHealthWarning, reportWorkloads, departmentSummary, activeBlockers, unreadMessagePreviews, orgOverview] = await Promise.all([
    isMainAgent ? Promise.resolve([]) : loadOrgReports(prisma, task.assignee.id),
    loadRecentBoardItems(),
    loadPendingResults(task.assignee.name),
    isMainAgent ? Promise.resolve(null) : loadManager(prisma, task.assignee.id),
    isMainAgent ? Promise.resolve([]) : loadPeers(prisma, task.assignee.id, task.assignee.department),
    loadUnreadCount(prisma, task.assignee.id),
    isMainAgent ? Promise.resolve(null) : loadParentTask(prisma, task.parentTaskId),
    loadTaskHistory(prisma, task.assignee.id),
    checkContextHealth(cwd),
    isMainAgent ? Promise.resolve([]) : loadReportWorkloads(prisma, task.assignee.id),
    isMainAgent ? Promise.resolve(null) : loadDepartmentSummary(prisma, task.assignee.department),
    loadActiveBlockers(),
    loadUnreadMessagePreviews(prisma, task.assignee.id),
    isMainAgent ? loadOrgOverview(prisma) : Promise.resolve(undefined),
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
  const mcpServer = createGcMcpServer({ prisma, orgSlug, agentId: task.assignee.name, taskId: task.id, runtime });

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
      orgSlug,
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
    await prisma.task.update({
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
      const message = await prisma.message.create({
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
        orgSlug,
      });
      // Mark task as completed since the agent did respond
      await prisma.task.update({
        where: { id: task.id },
        data: { status: "completed", result: "Chat reply sent (fallback)", completedAt: new Date() },
      });
      appEventBus.emit("task_status_changed", { taskId: task.id, status: "completed", orgSlug });
    } else {
      await maybeFinalizeTask(prisma, task.id, {
        output: lastResult.output,
      }, orgSlug);
    }
  }

  // Post-run: notify parent task if this was a delegated child task
  const finalTask = await prisma.task.findUnique({
    where: { id: task.id },
    select: { id: true, parentTaskId: true, assigneeId: true, result: true, status: true },
  });
  if (finalTask && finalTask.status === "completed" && finalTask.parentTaskId) {
    const root = process.env["GC_WORKSPACE_ROOT"];
    if (root) {
      await handleChildCompletion(prisma, finalTask, root);
    }
  }
}

function startWorkerForTenant(orgSlug: string) {
  const concurrency = Number(process.env["GC_AGENT_CONCURRENCY"] ?? "10");
  const worker = new Worker<WorkerJobData>(
    queueNameForTenant(orgSlug),
    async (job) => {
      const { taskId, orgSlug: jobOrgSlug, agentName } = job.data;
      const prisma = await getPrismaForTenant(jobOrgSlug);
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: true },
      });

      if (!task) return;
      if (!task.assignee) return;
      if (task.status !== "pending") return;

      // Per-agent serialization: if this agent is already running a task, re-queue with delay
      if (task.assignee.status === "running") {
        console.log(`[Queue] agent=${agentName} is busy, re-queuing task=${taskId}`);
        await enqueueAgentTask({ orgSlug: jobOrgSlug, agentName, taskId, priority: job.opts.priority ?? 0 });
        await new Promise((resolve) => setTimeout(resolve, AGENT_BUSY_DELAY_MS));
        return;
      }

      const assignee = task.assignee;
      const assigneeId = task.assigneeId!;

      await markTaskRunning(prisma, assignee, taskId, jobOrgSlug);

      let failed = false;
      try {
        await runTask(prisma, jobOrgSlug, task as typeof task & { assignee: NonNullable<typeof task.assignee> });
      } catch (error) {
        failed = true;
        const message = error instanceof Error ? error.message : "Unknown error";
        await prisma.task.update({ where: { id: taskId }, data: { status: "failed", result: message } });
        await prisma.agent.update({ where: { id: assigneeId }, data: { status: "error" } });
        appEventBus.emit("agent_status_changed", { agentId: agentName, status: "error", orgSlug: jobOrgSlug });
        appEventBus.emit("task_status_changed", { taskId, status: "failed", orgSlug: jobOrgSlug });
        throw error;
      } finally {
        if (!failed) {
          await markAgentIdle(prisma, assigneeId, jobOrgSlug);
        }
      }
    },
    { connection: getRedis(), concurrency },
  );

  worker.on("failed", (job, err) => {
    const agentName = job?.data?.agentName ?? "?";
    console.error(`[Queue] job failed agent=${agentName} jobId=${job?.id ?? "?"}`, err);
  });

  workers.push(worker);
}

export async function startAgentWorkers() {
  const publicPrisma = getPublicPrisma();
  const tenants = await publicPrisma.tenant.findMany({
    where: { status: "active" },
    select: { slug: true },
  });

  for (const tenant of tenants) {
    startWorkerForTenant(tenant.slug);
  }

  console.log(`[Queue] started ${workers.length} tenant worker(s) across ${tenants.length} tenant(s)`);
}

export async function stopAgentWorkers() {
  await Promise.all(workers.map((w) => w.close()));
  workers.splice(0, workers.length);
  await closeRedis();
}
