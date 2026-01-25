import { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";

export const systemCronJobs: CronJobDefinition[] = [
  {
    name: "system:health-check",
    pattern: "*/5 * * * *", // Every 5 minutes
    description: "Check system health and alert on issues",
    handler: async (_job: Job) => {
      const checks = {
        database: false,
        timestamp: new Date().toISOString(),
      };

      // Check database
      try {
        await db.$queryRaw`SELECT 1`;
        checks.database = true;
      } catch (error) {
        console.error("[System] Database health check failed:", error);
      }

      // Emit health status
      EventBus.emit("system:health", checks);

      console.log("[System] Health check completed:", checks);
    },
  },
  {
    name: "system:cleanup-completed-tasks",
    pattern: "0 3 * * *", // 3:00 AM daily
    description: "Clean up old completed/failed tasks",
    handler: async (_job: Job) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Archive old completed/failed tasks
      const deleted = await db.task.deleteMany({
        where: {
          status: { in: ["completed", "failed", "cancelled"] },
          completedAt: { lt: thirtyDaysAgo },
        },
      });

      console.log(`[System] Cleaned up ${deleted.count} old tasks`);

      // Also clean up old activity logs
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deletedLogs = await db.activityLog.deleteMany({
        where: {
          createdAt: { lt: sixtyDaysAgo },
        },
      });

      console.log(`[System] Cleaned up ${deletedLogs.count} old activity logs`);
    },
  },
  {
    name: "system:update-agent-stats",
    pattern: "0 * * * *", // Every hour
    description: "Update agent statistics",
    handler: async (_job: Job) => {
      const agents = await db.agent.findMany({
        where: { deletedAt: null },
      });

      for (const agent of agents) {
        // Calculate task statistics
        const [completed, failed, total] = await Promise.all([
          db.task.count({
            where: { agentId: agent.id, status: "completed" },
          }),
          db.task.count({
            where: { agentId: agent.id, status: "failed" },
          }),
          db.task.count({
            where: { agentId: agent.id },
          }),
        ]);

        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Calculate token usage from sessions
        const sessions = await db.agentSession.aggregate({
          where: { agentId: agent.id },
          _sum: {
            inputTokens: true,
            outputTokens: true,
          },
        });

        const tokensUsed =
          (sessions._sum.inputTokens || 0) + (sessions._sum.outputTokens || 0);

        console.log(`[System] Updated stats for ${agent.name}: ${completed}/${total} tasks (${failed} failed), ${successRate}% success, ${tokensUsed} tokens`);
      }
    },
  },
];
