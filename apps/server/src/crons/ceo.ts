import { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { startAgentTaskWorkflow } from "../temporal/client.js";
import { EventBus } from "../services/event-bus.js";

/**
 * CEO cron jobs for strategic cadence
 */
export const ceoCronJobs: CronJobDefinition[] = [
  {
    name: "ceo:daily-priorities",
    pattern: "0 8 * * *", // 8:00 AM daily
    description: "CEO reviews company state and sets daily priorities",
    handler: async (_job: Job) => {
      console.log("[CEO] Running daily priorities review...");

      // Get company metrics
      const [pendingTasks, blockedTasks, agents, recentActivity] =
        await Promise.all([
          db.task.count({ where: { status: "pending" } }),
          db.task.count({ where: { status: "blocked" } }),
          db.agent.findMany({ where: { status: { not: "offline" } } }),
          db.activityLog.findMany({
            where: {
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            take: 50,
            orderBy: { createdAt: "desc" },
          }),
        ]);

      // Find CEO agent
      const ceo = await db.agent.findFirst({
        where: { role: "ceo" },
      });

      if (!ceo) {
        console.error("[CEO] No CEO agent found");
        return;
      }

      // Create daily priorities task for CEO
      const task = await db.task.create({
        data: {
          title: "Daily Priorities Review",
          description: `Review the current company state and set priorities for today.

Current Metrics:
- Pending Tasks: ${pendingTasks}
- Blocked Tasks: ${blockedTasks}
- Active Agents: ${agents.length}
- Recent Activities: ${recentActivity.length}

Instructions:
1. Review blocked tasks and identify solutions
2. Prioritize pending tasks across departments
3. Send strategic guidance to department leads
4. Update company goals if needed`,
          priority: "high",
          status: "pending",
          agentId: ceo.id,
        },
      });

      // Get game state for player ID
      const gameState = await db.gameState.findFirst();
      const playerId = gameState?.playerId || "default";

      // Start workflow for CEO to process
      await startAgentTaskWorkflow({
        taskId: task.id,
        agentId: ceo.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        playerId,
      });

      EventBus.emit("cron:completed", {
        jobName: "ceo:daily-priorities",
        runCount: 1,
      });

      console.log("[CEO] Daily priorities task created and workflow started");
    },
  },

  {
    name: "ceo:weekly-planning",
    pattern: "0 10 * * 1", // 10:00 AM Monday
    description: "CEO creates weekly strategy and distributes goals to leads",
    handler: async (_job: Job) => {
      console.log("[CEO] Running weekly planning...");

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Get last week's metrics
      const [completedTasks, failedTasks, agents] = await Promise.all([
        db.task.count({
          where: { status: "completed", completedAt: { gte: oneWeekAgo } },
        }),
        db.task.count({
          where: { status: "failed", updatedAt: { gte: oneWeekAgo } },
        }),
        db.agent.findMany({
          where: { deletedAt: null },
          include: {
            tasks: {
              where: { createdAt: { gte: oneWeekAgo } },
            },
          },
        }),
      ]);

      const successRate =
        completedTasks + failedTasks > 0
          ? Math.round((completedTasks / (completedTasks + failedTasks)) * 100)
          : 0;

      // Find CEO agent
      const ceo = await db.agent.findFirst({
        where: { role: "ceo" },
      });

      if (!ceo) {
        console.error("[CEO] No CEO agent found");
        return;
      }

      // Build agent performance summary
      const agentSummary = agents
        .map((a) => {
          const completed = a.tasks.filter((t) => t.status === "completed").length;
          const total = a.tasks.length;
          return `- ${a.name}: ${completed}/${total} tasks completed`;
        })
        .join("\n");

      // Create weekly planning task
      const task = await db.task.create({
        data: {
          title: "Weekly Strategic Planning",
          description: `Create the weekly strategy and distribute goals to department leads.

Last Week's Performance:
- Tasks Completed: ${completedTasks}
- Tasks Failed: ${failedTasks}
- Success Rate: ${successRate}%

Agent Performance:
${agentSummary}

Instructions:
1. Analyze last week's performance
2. Identify improvement areas
3. Set goals for each department for this week
4. Create strategic tasks for department leads
5. Communicate the weekly vision`,
          priority: "high",
          status: "pending",
          agentId: ceo.id,
        },
      });

      const gameState = await db.gameState.findFirst();
      const playerId = gameState?.playerId || "default";

      await startAgentTaskWorkflow({
        taskId: task.id,
        agentId: ceo.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        playerId,
      });

      EventBus.emit("cron:completed", {
        jobName: "ceo:weekly-planning",
        runCount: 1,
      });

      console.log("[CEO] Weekly planning task created and workflow started");
    },
  },

  {
    name: "ceo:status-synthesis",
    pattern: "0 18 * * *", // 6:00 PM daily
    description: "CEO compiles daily summary and identifies blockers",
    handler: async (_job: Job) => {
      console.log("[CEO] Running status synthesis...");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todaysActivity, blockedAgents, pendingDrafts, completedToday] =
        await Promise.all([
          db.activityLog.findMany({
            where: { createdAt: { gte: today } },
            orderBy: { createdAt: "asc" },
          }),
          db.agent.findMany({
            where: { status: "blocked" },
          }),
          db.message.count({
            where: { isExternalDraft: true, status: "pending" },
          }),
          db.task.count({
            where: { status: "completed", completedAt: { gte: today } },
          }),
        ]);

      const ceo = await db.agent.findFirst({
        where: { role: "ceo" },
      });

      if (!ceo) {
        console.error("[CEO] No CEO agent found");
        return;
      }

      const blockedAgentList = blockedAgents
        .map((a) => `- ${a.name} (${a.role})`)
        .join("\n") || "None";

      const task = await db.task.create({
        data: {
          title: "End of Day Status Synthesis",
          description: `Compile the daily summary and address any blockers.

Today's Summary:
- Activities Logged: ${todaysActivity.length}
- Tasks Completed: ${completedToday}
- Pending External Drafts: ${pendingDrafts}

Blocked Agents:
${blockedAgentList}

Instructions:
1. Review blocked agents and unblock if possible
2. Approve or reject pending external drafts
3. Synthesize key accomplishments
4. Identify issues to address tomorrow
5. Prepare tomorrow's priorities`,
          priority: "normal",
          status: "pending",
          agentId: ceo.id,
        },
      });

      const gameState = await db.gameState.findFirst();
      const playerId = gameState?.playerId || "default";

      await startAgentTaskWorkflow({
        taskId: task.id,
        agentId: ceo.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        playerId,
      });

      EventBus.emit("cron:completed", {
        jobName: "ceo:status-synthesis",
        runCount: 1,
      });

      console.log("[CEO] Status synthesis task created and workflow started");
    },
  },

  {
    name: "ceo:monthly-okr",
    pattern: "0 9 1 * *", // 9:00 AM on 1st of month
    description: "CEO reviews OKRs and sets new monthly targets",
    handler: async (_job: Job) => {
      console.log("[CEO] Running monthly OKR review...");

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const lastMonth = new Date(monthStart);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // Get last month's metrics
      const [monthlyTasks, monthlySessions] = await Promise.all([
        db.task.groupBy({
          by: ["status"],
          where: {
            createdAt: { gte: lastMonth, lt: monthStart },
          },
          _count: true,
        }),
        db.agentSession.aggregate({
          where: {
            startedAt: { gte: lastMonth, lt: monthStart },
          },
          _sum: {
            inputTokens: true,
            outputTokens: true,
          },
          _count: true,
        }),
      ]);

      const ceo = await db.agent.findFirst({
        where: { role: "ceo" },
      });

      if (!ceo) {
        console.error("[CEO] No CEO agent found");
        return;
      }

      const taskBreakdown = monthlyTasks
        .map((t) => `- ${t.status}: ${t._count}`)
        .join("\n") || "No tasks last month";

      const totalTokens =
        (monthlySessions._sum.inputTokens || 0) +
        (monthlySessions._sum.outputTokens || 0);

      const task = await db.task.create({
        data: {
          title: "Monthly OKR Review and Planning",
          description: `Review last month's OKRs and set new monthly targets.

Last Month's Task Breakdown:
${taskBreakdown}

Resource Usage:
- Total Sessions: ${monthlySessions._count || 0}
- Total Tokens: ${totalTokens.toLocaleString()}

Instructions:
1. Evaluate progress on last month's objectives
2. Document key results achieved
3. Set new objectives for this month
4. Define measurable key results
5. Communicate new OKRs to all leads`,
          priority: "high",
          status: "pending",
          agentId: ceo.id,
        },
      });

      const gameState = await db.gameState.findFirst();
      const playerId = gameState?.playerId || "default";

      await startAgentTaskWorkflow({
        taskId: task.id,
        agentId: ceo.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        playerId,
      });

      EventBus.emit("cron:completed", {
        jobName: "ceo:monthly-okr",
        runCount: 1,
      });

      console.log("[CEO] Monthly OKR task created and workflow started");
    },
  },
];
