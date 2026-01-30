/**
 * CEO Cron Jobs
 *
 * Scheduled tasks for CEO autonomous operations:
 * - Daily priorities review
 * - Weekly planning
 * - Status synthesis
 */

import type { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";

export const ceoCronJobs: CronJobDefinition[] = [
  {
    name: "ceo:daily-priorities",
    pattern: "0 8 * * *", // 8:00 AM daily
    description: "CEO reviews company state and sets daily priorities",
    handler: async (_job: Job) => {
      console.log("[CEO Cron] Running daily priorities review...");

      // Get company metrics
      const [pendingTasks, blockedTasks, agents, recentActivity] = await Promise.all([
        db.task.count({ where: { status: "pending" } }),
        db.task.count({ where: { status: "blocked" } }),
        db.agent.findMany({ where: { deletedAt: null } }),
        db.activityLog.findMany({
          where: { timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          take: 50,
          orderBy: { timestamp: "desc" },
        }),
      ]);

      // Find Marcus (CEO)
      const marcus = await db.agent.findFirst({
        where: { name: "Marcus Bell", deletedAt: null },
      });

      if (!marcus) {
        console.warn("[CEO Cron] Marcus (CEO) not found, skipping daily priorities");
        return;
      }

      // Create a task for CEO to review priorities
      const task = await db.task.create({
        data: {
          agentId: marcus.id,
          createdById: marcus.id,
          title: "Daily Priorities Review",
          description: `Good morning! Time for your daily priorities review.

**Current Company Status:**
- Pending Tasks: ${pendingTasks}
- Blocked Tasks: ${blockedTasks}
- Active Agents: ${agents.length}
- Recent Activity: ${recentActivity.length} events in last 24h

**Your responsibilities:**
1. Review any blocked tasks and identify how to unblock them
2. Check if any agents need guidance or support
3. Set priorities for the day
4. Communicate key objectives to team leads`,
          priority: "high",
          status: "pending",
        },
      });

      EventBus.emit("task:queued", { agentId: marcus.id, task });
      console.log(`[CEO Cron] Created daily priorities task ${task.id} for Marcus`);
    },
  },

  {
    name: "ceo:weekly-planning",
    pattern: "0 10 * * 1", // 10:00 AM Monday
    description: "CEO creates weekly strategy and distributes goals to leads",
    handler: async (_job: Job) => {
      console.log("[CEO Cron] Running weekly planning...");

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [completedTasks, failedTasks] = await Promise.all([
        db.task.count({
          where: { status: "completed", completedAt: { gte: oneWeekAgo } },
        }),
        db.task.count({
          where: { status: "failed", completedAt: { gte: oneWeekAgo } },
        }),
      ]);

      const marcus = await db.agent.findFirst({
        where: { name: "Marcus Bell", deletedAt: null },
      });

      if (!marcus) {
        console.warn("[CEO Cron] Marcus (CEO) not found, skipping weekly planning");
        return;
      }

      const successRate = completedTasks + failedTasks > 0
        ? Math.round((completedTasks / (completedTasks + failedTasks)) * 100)
        : 0;

      const task = await db.task.create({
        data: {
          agentId: marcus.id,
          createdById: marcus.id,
          title: "Weekly Planning Session",
          description: `Happy Monday! Time for weekly planning.

**Last Week's Performance:**
- Completed Tasks: ${completedTasks}
- Failed Tasks: ${failedTasks}
- Success Rate: ${successRate}%

**Planning Objectives:**
1. Review last week's accomplishments and challenges
2. Identify key priorities for this week
3. Assign goals to team leads (Sable for engineering)
4. Address any resource constraints or blockers
5. Update the team on company direction`,
          priority: "high",
          status: "pending",
        },
      });

      EventBus.emit("task:queued", { agentId: marcus.id, task });
      console.log(`[CEO Cron] Created weekly planning task ${task.id} for Marcus`);
    },
  },

  {
    name: "ceo:status-synthesis",
    pattern: "0 18 * * *", // 6:00 PM daily
    description: "CEO compiles daily summary and identifies blockers",
    handler: async (_job: Job) => {
      console.log("[CEO Cron] Running status synthesis...");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todaysActivity, blockedAgents] = await Promise.all([
        db.activityLog.count({
          where: { timestamp: { gte: today } },
        }),
        db.agent.findMany({
          where: { status: "blocked", deletedAt: null },
        }),
      ]);

      const marcus = await db.agent.findFirst({
        where: { name: "Marcus Bell", deletedAt: null },
      });

      if (!marcus) {
        console.warn("[CEO Cron] Marcus (CEO) not found, skipping status synthesis");
        return;
      }

      const task = await db.task.create({
        data: {
          agentId: marcus.id,
          createdById: marcus.id,
          title: "End of Day Summary",
          description: `Good evening! Time for your daily status synthesis.

**Today's Activity:**
- Total Activity Events: ${todaysActivity}
- Blocked Agents: ${blockedAgents.length}${blockedAgents.length > 0 ? ` (${blockedAgents.map((a) => a.name).join(", ")})` : ""}

**Your responsibilities:**
1. Review the day's progress
2. Address any blocked agents urgently
3. Prepare summary for stakeholders if needed
4. Identify any issues that need immediate attention`,
          priority: "normal",
          status: "pending",
        },
      });

      EventBus.emit("task:queued", { agentId: marcus.id, task });
      console.log(`[CEO Cron] Created status synthesis task ${task.id} for Marcus`);
    },
  },
];
