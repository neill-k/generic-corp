import { Worker } from "bullmq";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Agent, Task } from "@prisma/client";

import { db } from "../db/client.js";
import { createGcMcpServer } from "../mcp/server.js";
import { AgentSdkRuntime } from "../services/agent-runtime-sdk.js";
import { buildSystemPrompt } from "../services/prompt-builder.js";

import { queueNameForAgent } from "./agent-queues.js";
import { closeRedis, getRedis } from "./redis.js";

type WorkerJobData = { taskId: string };

const workers: Worker[] = [];

function resolveWorkspaceRoot(): string {
  return path.resolve(process.cwd(), process.env["GC_WORKSPACE_ROOT"] ?? "./workspace");
}

async function ensureAgentWorkspace(agentName: string): Promise<string> {
  const root = resolveWorkspaceRoot();
  const cwd = path.join(root, "agents", agentName);
  const gcDir = path.join(cwd, ".gc");
  await mkdir(gcDir, { recursive: true });

  const contextPath = path.join(gcDir, "context.md");
  try {
    await readFile(contextPath, "utf8");
  } catch {
    await writeFile(contextPath, "# context\n\n", "utf8");
  }

  return cwd;
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
}

async function markAgentIdle(agentId: string) {
  await db.agent.update({ where: { id: agentId }, data: { status: "idle", currentTaskId: null } });
}

async function maybeFinalizeTask(taskId: string, fallback: { status: "completed" | "failed"; output: string }) {
  const existing = await db.task.findUnique({ where: { id: taskId }, select: { status: true, result: true } });
  if (!existing) return;

  // Only auto-finalize tasks that are still running.
  // If an agent calls finish_task with needs_followup, the task is moved back to pending
  // and should not be overwritten here.
  if (existing.status !== "running") return;

  await db.task.update({
    where: { id: taskId },
    data: {
      status: fallback.status,
      result: existing.result ?? fallback.output,
      completedAt: fallback.status === "completed" ? new Date() : null,
    },
  });
}

async function runTask(task: Task & { assignee: Agent }) {
  const cwd = await ensureAgentWorkspace(task.assignee.name);
  const runtime = new AgentSdkRuntime();
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
