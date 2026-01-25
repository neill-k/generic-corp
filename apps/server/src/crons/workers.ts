import { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { startAgentTaskWorkflow } from "../temporal/client.js";
import { EventBus } from "../services/event-bus.js";

export const workerCronJobs: CronJobDefinition[] = [
  {
    name: "workers:process-pending-tasks",
    pattern: "*/5 * * * *", // Every 5 minutes
    description: "Check for pending tasks and assign to idle workers",
    handler: async (_job: Job) => {
      // Get idle worker agents
      const idleAgents = await db.agent.findMany({
        where: {
          status: "idle",
          deletedAt: null,
        },
      });

      if (idleAgents.length === 0) {
        console.log("[Workers] No idle agents available");
        return;
      }

      // Get pending tasks ordered by priority
      const pendingTasks = await db.task.findMany({
        where: {
          status: "pending",
          deletedAt: null,
        },
        orderBy: [
          { priority: "asc" }, // urgent first
          { createdAt: "asc" }, // oldest first
        ],
        take: idleAgents.length,
      });

      if (pendingTasks.length === 0) {
        console.log("[Workers] No pending tasks");
        return;
      }

      // Assign tasks to agents
      for (let i = 0; i < Math.min(pendingTasks.length, idleAgents.length); i++) {
        const task = pendingTasks[i];
        const agent = idleAgents[i];

        // Only process tasks assigned to this agent
        if (task.agentId !== agent.id) {
          continue;
        }

        console.log(`[Workers] Starting task "${task.title}" for agent ${agent.name}`);

        try {
          // Get game state for player ID
          const gameState = await db.gameState.findFirst();
          const playerId = gameState?.playerId || "default";

          // Start Temporal workflow
          await startAgentTaskWorkflow({
            taskId: task.id,
            agentId: agent.id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            playerId,
          });
        } catch (error) {
          console.error(`[Workers] Error starting task ${task.id}:`, error);
        }
      }
    },
  },
  {
    name: "workers:check-stuck-tasks",
    pattern: "*/15 * * * *", // Every 15 minutes
    description: "Check for tasks stuck in in_progress state",
    handler: async (_job: Job) => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find tasks stuck in in_progress
      const stuckTasks = await db.task.findMany({
        where: {
          status: "in_progress",
          startedAt: { lt: thirtyMinutesAgo },
        },
        include: { agent: true },
      });

      for (const task of stuckTasks) {
        console.log(`[Workers] Task "${task.title}" appears stuck`);

        // Mark as blocked
        await db.task.update({
          where: { id: task.id },
          data: {
            status: "blocked",
            errorDetails: { reason: "Task exceeded 30 minute timeout" },
          },
        });

        // Reset agent to idle
        if (task.agentId) {
          await db.agent.update({
            where: { id: task.agentId },
            data: { status: "idle" },
          });

          EventBus.emit("agent:status", {
            agentId: task.agentId,
            status: "idle",
          });
        }

        EventBus.emit("task:failed", {
          taskId: task.id,
          agentId: task.agentId,
          error: "Task exceeded 30 minute timeout",
        });
      }

      if (stuckTasks.length > 0) {
        console.log(`[Workers] Reset ${stuckTasks.length} stuck tasks`);
      }
    },
  },
  {
    name: "workers:heartbeat-check",
    pattern: "*/10 * * * *", // Every 10 minutes
    description: "Check agent heartbeats and mark unresponsive as blocked",
    handler: async (_job: Job) => {
      // In a real implementation, agents would send heartbeats
      // For now, just check if agents marked as "working" have active tasks
      const workingAgents = await db.agent.findMany({
        where: { status: "working" },
        include: {
          tasks: {
            where: { status: "in_progress" },
            take: 1,
          },
        },
      });

      for (const agent of workingAgents) {
        if (agent.tasks.length === 0) {
          // Agent is marked working but has no active tasks
          console.log(`[Workers] Agent ${agent.name} marked working but no active tasks, resetting to idle`);

          await db.agent.update({
            where: { id: agent.id },
            data: { status: "idle" },
          });

          EventBus.emit("agent:status", {
            agentId: agent.id,
            status: "idle",
          });
        }
      }
    },
  },
];
