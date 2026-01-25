/**
 * Worker Cron Jobs
 *
 * Scheduled tasks for worker agents:
 * - Check inbox for pending tasks
 * - Heartbeat/health checks
 */

import type { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";

export const workerCronJobs: CronJobDefinition[] = [
  {
    name: "workers:check-inbox",
    pattern: "*/15 * * * *", // Every 15 minutes
    description: "All idle workers check their inbox for new assigned tasks",
    handler: async (_job: Job) => {
      console.log("[Worker Cron] Checking worker inboxes...");

      // Get all idle worker agents
      const idleWorkers = await db.agent.findMany({
        where: {
          status: "idle",
          currentTaskId: null,
          deletedAt: null,
        },
      });

      let tasksQueued = 0;

      for (const worker of idleWorkers) {
        // Find pending tasks assigned to this worker
        const pendingTask = await db.task.findFirst({
          where: {
            agentId: worker.id,
            status: "pending",
          },
          orderBy: [
            { priority: "asc" }, // high priority first
            { createdAt: "asc" }, // oldest first
          ],
        });

        if (pendingTask) {
          EventBus.emit("task:queued", {
            agentId: worker.id,
            task: pendingTask,
          });
          tasksQueued++;
          console.log(`[Worker Cron] Queued task ${pendingTask.id} for ${worker.name}`);
        }
      }

      console.log(`[Worker Cron] Checked ${idleWorkers.length} workers, queued ${tasksQueued} tasks`);
    },
  },

  {
    name: "workers:heartbeat",
    pattern: "*/5 * * * *", // Every 5 minutes
    description: "Check agent health and detect stale workers",
    handler: async (_job: Job) => {
      console.log("[Worker Cron] Running heartbeat check...");

      // Find agents that have been "working" for too long without activity
      const staleThreshold = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes

      const staleAgents = await db.agent.findMany({
        where: {
          status: "working",
          updatedAt: { lt: staleThreshold },
          deletedAt: null,
          currentTaskId: { not: null },
        },
      });

      for (const agent of staleAgents) {
        console.warn(`[Worker Cron] Stale agent detected: ${agent.name} (working since ${agent.updatedAt})`);

        // Get the current task if exists
        const currentTask = agent.currentTaskId
          ? await db.task.findUnique({ where: { id: agent.currentTaskId } })
          : null;

        // Reset stale agent to idle
        await db.agent.update({
          where: { id: agent.id },
          data: {
            status: "idle",
            currentTaskId: null,
          },
        });

        // Mark their current task as failed if exists
        if (currentTask && currentTask.status === "in_progress") {
          await db.task.update({
            where: { id: currentTask.id },
            data: {
              status: "failed",
              previousStatus: "in_progress",
              completedAt: new Date(),
              result: { error: "Task timed out - agent became unresponsive" },
            },
          });

          EventBus.emit("task:failed", {
            taskId: currentTask.id,
            error: "Task timed out - agent became unresponsive",
          });
        }

        EventBus.emit("agent:status", {
          agentId: agent.id,
          status: "idle",
        });
      }

      if (staleAgents.length > 0) {
        console.log(`[Worker Cron] Reset ${staleAgents.length} stale agents`);
      }
    },
  },

  {
    name: "workers:unread-messages",
    pattern: "*/10 * * * *", // Every 10 minutes
    description: "Check for agents with unread messages and create inbox tasks",
    handler: async (_job: Job) => {
      console.log("[Worker Cron] Checking for unread messages...");

      // Find agents with unread messages who are idle
      const agentsWithUnread = await db.agent.findMany({
        where: {
          status: "idle",
          currentTaskId: null,
          deletedAt: null,
          receivedMessages: {
            some: {
              readAt: null,
              deletedAt: null,
            },
          },
        },
        include: {
          receivedMessages: {
            where: {
              readAt: null,
              deletedAt: null,
            },
            take: 5,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      for (const agent of agentsWithUnread) {
        // Check if there's already a pending inbox task
        const existingInboxTask = await db.task.findFirst({
          where: {
            agentId: agent.id,
            status: { in: ["pending", "in_progress"] },
            title: { contains: "Handle inbox" },
          },
        });

        if (existingInboxTask) {
          continue; // Already has inbox task pending
        }

        const unreadCount = agent.receivedMessages.length;

        const task = await db.task.create({
          data: {
            agentId: agent.id,
            createdById: agent.id,
            title: `Handle inbox messages (${unreadCount} unread)`,
            description: `You have ${unreadCount} unread message(s) in your inbox.

**Instructions:**
1. Use check_inbox to read your messages
2. Respond thoughtfully to each message using send_message
3. If a message requires action, complete it or report progress
4. If you need clarification, message the sender back`,
            priority: "high",
            status: "pending",
          },
        });

        EventBus.emit("task:queued", { agentId: agent.id, task });
        console.log(`[Worker Cron] Created inbox task for ${agent.name} (${unreadCount} unread)`);
      }
    },
  },
];
