import type { PrismaClient } from "@prisma/client";

import { enqueueAgentTask } from "../queue/agent-queues.js";
import { appEventBus } from "./app-events.js";

function getNudgeIntervalMs(): number {
  const envVal = process.env["GC_NUDGE_INTERVAL_MINUTES"];
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed * 60_000;
  }
  return 2 * 60_000; // 2 minutes default
}

function isNudgeEnabled(): boolean {
  return process.env["GC_NUDGE_ENABLED"] !== "false";
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function nudgeIdleAgents(prisma: PrismaClient, orgSlug: string = "default"): Promise<number> {
  const idleAgents = await prisma.agent.findMany({
    where: { status: "idle", name: { not: "main" } },
    select: { id: true, name: true },
  });

  let nudgeCount = 0;

  for (const agent of idleAgents) {
    const pendingTasks = await prisma.task.count({
      where: { assigneeId: agent.id, status: "pending" },
    });

    const unreadMessages = await prisma.message.count({
      where: { toAgentId: agent.id, status: { not: "read" } },
    });

    if (pendingTasks === 0 && unreadMessages === 0) continue;

    // Dedup: skip if a nudge task already exists for this agent
    const existingNudge = await prisma.task.findFirst({
      where: {
        assigneeId: agent.id,
        status: "pending",
        context: { startsWith: "SYSTEM NUDGE:" },
      },
    });

    if (existingNudge) continue;

    const parts: string[] = [];
    if (pendingTasks > 0) parts.push(`${pendingTasks} pending tasks`);
    if (unreadMessages > 0) parts.push(`${unreadMessages} unread messages`);

    const prompt = `You have ${parts.join(" and ")} waiting for your attention.

Please:
1. Review your pending tasks and work on the highest priority one
2. Check your unread messages and respond as needed

After reviewing, call finish_task with status "completed".`;

    const task = await prisma.task.create({
      data: {
        assigneeId: agent.id,
        delegatorId: null,
        prompt,
        context: "SYSTEM NUDGE: Auto-generated nudge for idle agent with pending work.",
        priority: -1,
        status: "pending",
      },
    });

    await enqueueAgentTask({
      orgSlug,
      agentName: agent.name,
      taskId: task.id,
      priority: -1,
    });

    appEventBus.emit("task_created", {
      taskId: task.id,
      assignee: agent.name,
      delegator: null,
      orgSlug,
    });

    nudgeCount++;
  }

  return nudgeCount;
}

export function startAgentNudger(prisma: PrismaClient): void {
  if (!isNudgeEnabled()) {
    console.log("[AgentNudger] Disabled");
    return;
  }
  if (intervalId) return;
  const intervalMs = getNudgeIntervalMs();
  intervalId = setInterval(() => {
    nudgeIdleAgents(prisma).catch((err) => {
      console.error("[AgentNudger] nudge check failed:", err);
    });
  }, intervalMs);
  console.log(`[AgentNudger] Started (interval: ${Math.round(intervalMs / 60_000)}min)`);
}

export function stopAgentNudger(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[AgentNudger] Stopped");
  }
}
