import { Worker } from "bullmq";

import type { Agent, Task } from "@prisma/client";

import { db } from "../db/client.js";
import { createGcMcpServer } from "../mcp/server.js";
import { appEventBus } from "../services/app-events.js";
import type { AgentRuntime } from "../services/agent-lifecycle.js";
import { AgentSdkRuntime } from "../services/agent-runtime-sdk.js";
import { AgentCliRuntime } from "../services/agent-runtime-cli.js";
import { buildSystemPrompt } from "../services/prompt-builder.js";
import type { WorkspaceManager } from "../services/workspace-manager.js";

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

async function maybeFinalizeTask(taskId: string, fallback: { status: "completed" | "failed"; output: string }) {
  const existing = await db.task.findUnique({ where: { id: taskId }, select: { status: true, result: true } });
  if (!existing) return;

  if (existing.status !== "running") return;

  await db.task.update({
    where: { id: taskId },
    data: {
      status: fallback.status,
      result: existing.result ?? fallback.output,
      completedAt: fallback.status === "completed" ? new Date() : null,
    },
  });

  appEventBus.emit("task_status_changed", { taskId, status: fallback.status });
}

async function runTask(task: Task & { assignee: Agent }) {
  const wm = getWorkspaceManager();
  const cwd = await wm.ensureAgentWorkspace(task.assignee.name);
  const runtime = createRuntime();
  const systemPrompt = buildSystemPrompt({ agent: task.assignee, task });
  const mcpServer = createGcMcpServer(task.assignee.name, task.id);

  let lastResult: { output: string; costUsd: number; durationMs: number; numTurns: number; status: string } | null = null;

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
      taskId: task.id,
      event,
    });

    if (event.type === "message") {
      console.log(`[Agent:${task.assignee.name}] ${event.content}`);
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

    await maybeFinalizeTask(task.id, {
      status: lastResult.status === "success" ? "completed" : "failed",
      output: lastResult.output,
    });
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
      if (task.assignee.name !== agentName) return;
      if (task.status !== "pending") return;

      await markTaskRunning(task.assignee, taskId);

      let failed = false;
      try {
        await runTask(task);
      } catch (error) {
        failed = true;
        const message = error instanceof Error ? error.message : "Unknown error";
        await db.task.update({ where: { id: taskId }, data: { status: "failed", result: message } });
        await db.agent.update({ where: { id: task.assigneeId }, data: { status: "error" } });
        appEventBus.emit("agent_status_changed", { agentId: agentName, status: "error" });
        appEventBus.emit("task_status_changed", { taskId, status: "failed" });
        throw error;
      } finally {
        if (!failed) {
          await markAgentIdle(task.assigneeId);
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
