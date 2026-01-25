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

      // Assign tasks to agents using atomic operations
      for (const task of pendingTasks) {
        // Find the assigned agent
        const agent = idleAgents.find((a) => a.id === task.agentId);
        if (!agent) {
          continue;
        }

        // Atomic claim: only update if task is still pending and agent is still idle
        // This prevents double-assignment race conditions
        const claimResult = await db.$transaction(async (tx) => {
          // Atomically claim the task
          const updatedTask = await tx.task.updateMany({
            where: {
              id: task.id,
              status: "pending",
              deletedAt: null,
            },
            data: {
              status: "in_progress",
              startedAt: new Date(),
              previousStatus: "pending",
            },
          });

          if (updatedTask.count === 0) {
            // Task was already claimed by another worker
            return { claimed: false };
          }

          // Atomically update agent status
          const updatedAgent = await tx.agent.updateMany({
            where: {
              id: agent.id,
              status: "idle",
              deletedAt: null,
            },
            data: {
              status: "working",
              currentTaskId: task.id,
            },
          });

          if (updatedAgent.count === 0) {
            // Agent is no longer idle, rollback task status
            await tx.task.update({
              where: { id: task.id },
              data: {
                status: "pending",
                startedAt: null,
                previousStatus: null,
              },
            });
            return { claimed: false };
          }

          return { claimed: true };
        });

        if (!claimResult.claimed) {
          console.log(`[Workers] Task "${task.title}" already claimed or agent ${agent.name} busy`);
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

          // Rollback on failure
          await db.$transaction([
            db.task.update({
              where: { id: task.id },
              data: { status: "pending", startedAt: null },
            }),
            db.agent.update({
              where: { id: agent.id },
              data: { status: "idle", currentTaskId: null },
            }),
          ]);
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
          deletedAt: null,
        },
        include: { assignedTo: true },
      });

      let resetCount = 0;
      for (const task of stuckTasks) {
        // Use atomic update to prevent race conditions with concurrent task processing
        // Only reset if the task is still in_progress (hasn't been completed meanwhile)
        const resetResult = await db.task.updateMany({
          where: {
            id: task.id,
            status: "in_progress", // Only reset if still in_progress
            deletedAt: null,
          },
          data: {
            status: "blocked",
            previousStatus: "in_progress",
            errorDetails: {
              reason: "Task exceeded 30 minute timeout",
              stuckSince: task.startedAt?.toISOString(),
              detectedAt: new Date().toISOString(),
            },
          },
        });

        if (resetResult.count === 0) {
          // Task was already handled (completed, failed, etc.)
          console.log(`[Workers] Task "${task.title}" already handled, skipping`);
          continue;
        }

        console.log(`[Workers] Task "${task.title}" stuck, marking as blocked`);
        resetCount++;

        // Reset agent to idle using atomic update
        if (task.agentId) {
          const agentReset = await db.agent.updateMany({
            where: {
              id: task.agentId,
              status: "working",
              currentTaskId: task.id, // Only reset if still working on this task
            },
            data: {
              status: "idle",
              currentTaskId: null,
            },
          });

          if (agentReset.count > 0) {
            EventBus.emit("agent:status", {
              agentId: task.agentId,
              status: "idle",
            });
          }
        }

        EventBus.emit("task:failed", {
          taskId: task.id,
          agentId: task.agentId,
          error: "Task exceeded 30 minute timeout",
        });
      }

      if (resetCount > 0) {
        console.log(`[Workers] Reset ${resetCount} stuck tasks`);
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
          assignedTasks: {
            where: { status: "in_progress" },
            take: 1,
          },
        },
      });

      for (const agent of workingAgents) {
        if (agent.assignedTasks.length === 0) {
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
