/**
 * System Cron Jobs
 *
 * Scheduled maintenance tasks:
 * - Health checks
 * - Database cleanup
 * - Metrics collection
 */

import type { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";

export const systemCronJobs: CronJobDefinition[] = [
  {
    name: "system:health-check",
    pattern: "*/5 * * * *", // Every 5 minutes
    description: "Check system health and emit status",
    handler: async (_job: Job) => {
      console.log("[System Cron] Running health check...");

      const checks = {
        database: false,
        agentCount: 0,
        pendingTasks: 0,
        activeTasks: 0,
      };

      // Check database connection
      try {
        await db.$queryRaw`SELECT 1`;
        checks.database = true;
      } catch (error) {
        console.error("[System Cron] Database health check failed:", error);
      }

      // Get basic metrics
      try {
        const [agentCount, pendingTasks, activeTasks] = await Promise.all([
          db.agent.count({ where: { deletedAt: null } }),
          db.task.count({ where: { status: "pending" } }),
          db.task.count({ where: { status: "in_progress" } }),
        ]);

        checks.agentCount = agentCount;
        checks.pendingTasks = pendingTasks;
        checks.activeTasks = activeTasks;
      } catch (error) {
        console.error("[System Cron] Failed to collect metrics:", error);
      }

      // Log health status
      console.log(
        `[System Cron] Health: DB=${checks.database ? "OK" : "FAIL"}, ` +
          `Agents=${checks.agentCount}, Pending=${checks.pendingTasks}, Active=${checks.activeTasks}`
      );

      // Could emit an event for monitoring/alerting
      EventBus.emit("activity:log", {
        agentId: "system",
        eventType: "health_check",
        eventData: checks,
      });
    },
  },

  {
    name: "system:db-cleanup",
    pattern: "0 3 * * *", // 3:00 AM daily
    description: "Clean up old records to prevent database bloat",
    handler: async (_job: Job) => {
      console.log("[System Cron] Running database cleanup...");

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Delete old activity logs (keep 30 days)
      const deletedLogs = await db.activityLog.deleteMany({
        where: { timestamp: { lt: thirtyDaysAgo } },
      });

      // Soft delete old completed/failed tasks (keep 30 days)
      const archivedTasks = await db.task.updateMany({
        where: {
          status: { in: ["completed", "failed"] },
          completedAt: { lt: thirtyDaysAgo },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      // Delete old read messages (keep 7 days)
      const deletedMessages = await db.message.deleteMany({
        where: {
          readAt: { not: null, lt: sevenDaysAgo },
        },
      });

      console.log(
        `[System Cron] Cleanup: ${deletedLogs.count} logs, ` +
          `${archivedTasks.count} tasks archived, ${deletedMessages.count} messages deleted`
      );
    },
  },

  {
    name: "system:metrics-snapshot",
    pattern: "0 * * * *", // Every hour on the hour
    description: "Capture hourly metrics snapshot",
    handler: async (_job: Job) => {
      console.log("[System Cron] Capturing metrics snapshot...");

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Get task metrics for the last hour
      const [completed, failed, created] = await Promise.all([
        db.task.count({
          where: {
            status: "completed",
            completedAt: { gte: oneHourAgo },
          },
        }),
        db.task.count({
          where: {
            status: "failed",
            completedAt: { gte: oneHourAgo },
          },
        }),
        db.task.count({
          where: {
            createdAt: { gte: oneHourAgo },
          },
        }),
      ]);

      // Get message metrics
      const messagesSent = await db.message.count({
        where: { createdAt: { gte: oneHourAgo } },
      });

      // Get agent activity
      const activeAgents = await db.agent.count({
        where: {
          status: "working",
          deletedAt: null,
        },
      });

      console.log(
        `[System Cron] Hourly Metrics - Tasks: ${created} created, ${completed} completed, ${failed} failed. ` +
          `Messages: ${messagesSent}. Active agents: ${activeAgents}`
      );

      // Log for historical tracking
      await db.activityLog.create({
        data: {
          agentId: "system",
          action: "hourly_metrics",
          details: {
            hour: now.toISOString(),
            tasks: { created, completed, failed },
            messages: messagesSent,
            activeAgents,
          },
        },
      });
    },
  },

  {
    name: "system:orphan-task-recovery",
    pattern: "*/30 * * * *", // Every 30 minutes
    description: "Find and recover orphaned tasks",
    handler: async (_job: Job) => {
      console.log("[System Cron] Checking for orphaned tasks...");

      // Find in_progress tasks assigned to idle agents (orphaned)
      const orphanedTasks = await db.task.findMany({
        where: {
          status: "in_progress",
          assignedTo: {
            status: "idle",
            currentTaskId: null,
          },
        },
        include: {
          assignedTo: true,
        },
      });

      for (const task of orphanedTasks) {
        console.warn(
          `[System Cron] Orphaned task detected: ${task.id} (${task.title}) - ` +
            `assigned to ${task.assignedTo.name} who is idle`
        );

        // Re-queue the task
        await db.task.update({
          where: { id: task.id },
          data: {
            status: "pending",
            previousStatus: "in_progress",
            startedAt: null,
          },
        });

        EventBus.emit("task:queued", {
          agentId: task.agentId,
          task,
        });
      }

      if (orphanedTasks.length > 0) {
        console.log(`[System Cron] Recovered ${orphanedTasks.length} orphaned tasks`);
      }
    },
  },
];
