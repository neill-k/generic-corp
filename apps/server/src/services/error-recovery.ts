import { db } from "../db/client.js";
import { appEventBus } from "./app-events.js";

const STUCK_TIMEOUT_MS = 30 * 60_000; // 30 minutes
const CHECK_INTERVAL_MS = 5 * 60_000; // Check every 5 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;

export async function checkStuckAgents(timeoutMs: number = STUCK_TIMEOUT_MS): Promise<number> {
  const runningAgents = await db.agent.findMany({
    where: { status: "running" },
    select: { id: true, name: true, currentTaskId: true, updatedAt: true },
  });

  const cutoff = Date.now() - timeoutMs;
  let resetCount = 0;

  for (const agent of runningAgents) {
    if (!agent.currentTaskId) continue;

    const agentUpdatedAt = agent.updatedAt.getTime();
    if (agentUpdatedAt >= cutoff) continue;

    console.error(`[ErrorRecovery] Agent ${agent.name} stuck for >${Math.round(timeoutMs / 60_000)}min, resetting`);

    await db.agent.update({
      where: { id: agent.id },
      data: { status: "idle", currentTaskId: null },
    });

    await db.task.update({
      where: { id: agent.currentTaskId },
      data: {
        status: "failed",
        result: `Task failed: agent was stuck for more than ${Math.round(timeoutMs / 60_000)} minutes`,
      },
    });

    appEventBus.emit("agent_status_changed", { agentId: agent.name, status: "idle" });
    appEventBus.emit("task_status_changed", { taskId: agent.currentTaskId, status: "failed" });

    resetCount++;
  }

  return resetCount;
}

export function startStuckAgentChecker(): void {
  if (intervalId) return;
  intervalId = setInterval(() => {
    checkStuckAgents().catch((err) => {
      console.error("[ErrorRecovery] stuck agent check failed:", err);
    });
  }, CHECK_INTERVAL_MS);
  console.log("[ErrorRecovery] stuck agent checker started (interval: 5min)");
}

export function stopStuckAgentChecker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[ErrorRecovery] stuck agent checker stopped");
  }
}
