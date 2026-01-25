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
    description: "Soft delete old completed/failed tasks",
    handler: async (_job: Job) => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Soft delete old completed/failed tasks to prevent FK violations
      // and retain data for audit purposes
      const softDeleted = await db.task.updateMany({
        where: {
          status: { in: ["completed", "failed", "cancelled"] },
          completedAt: { lt: thirtyDaysAgo },
          deletedAt: null, // Only soft delete tasks not already deleted
        },
        data: {
          deletedAt: new Date(),
        },
      });

      console.log(`[System] Soft deleted ${softDeleted.count} old tasks`);

      // Hard delete activity logs older than 60 days (no FK dependencies)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const deletedLogs = await db.activityLog.deleteMany({
        where: {
          createdAt: { lt: sixtyDaysAgo },
        },
      });

      console.log(`[System] Cleaned up ${deletedLogs.count} old activity logs`);

      // Clean up orphaned agent sessions (sessions for soft-deleted agents)
      const orphanedSessions = await db.agentSession.deleteMany({
        where: {
          agent: {
            deletedAt: { not: null },
          },
          endedAt: { not: null }, // Only delete ended sessions
        },
      });

      if (orphanedSessions.count > 0) {
        console.log(`[System] Cleaned up ${orphanedSessions.count} orphaned agent sessions`);
      }
    },
  },
  {
    name: "system:update-agent-stats",
    pattern: "0 * * * *", // Every hour
    description: "Update agent statistics",
    handler: async (_job: Job) => {
      const agents = await db.agent.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
      });

      if (agents.length === 0) {
        console.log("[System] No agents to update stats for");
        return;
      }

      const agentIds = agents.map((a) => a.id);

      // Single query to get task counts grouped by agent and status
      // Fixes N+1 query issue (was doing 3 queries per agent)
      const taskStats = await db.task.groupBy({
        by: ["agentId", "status"],
        where: {
          agentId: { in: agentIds },
          deletedAt: null,
        },
        _count: { id: true },
      });

      // Build a lookup map: agentId -> { status -> count }
      const statsByAgent = new Map<string, Map<string, number>>();
      for (const stat of taskStats) {
        if (!statsByAgent.has(stat.agentId)) {
          statsByAgent.set(stat.agentId, new Map());
        }
        statsByAgent.get(stat.agentId)!.set(stat.status, stat._count.id);
      }

      // Log stats for each agent
      for (const agent of agents) {
        const stats = statsByAgent.get(agent.id) || new Map();
        const completed = stats.get("completed") || 0;
        const failed = stats.get("failed") || 0;
        const pending = stats.get("pending") || 0;
        const inProgress = stats.get("in_progress") || 0;
        const blocked = stats.get("blocked") || 0;
        const cancelled = stats.get("cancelled") || 0;

        const total = completed + failed + pending + inProgress + blocked + cancelled;
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        console.log(
          `[System] Stats for ${agent.name}: ${completed}/${total} tasks ` +
            `(${failed} failed, ${pending} pending), ${successRate}% success`
        );
      }
    },
  },
];
