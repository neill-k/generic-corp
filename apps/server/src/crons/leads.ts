import { Job } from "bullmq";
import type { CronJobDefinition } from "../services/CronManager.js";
import { db } from "../db/index.js";
import { startAgentTaskWorkflow } from "../temporal/client.js";
import { EventBus } from "../services/event-bus.js";

/**
 * Helper to create a task and start workflow for a lead
 */
async function createLeadTask(params: {
  agentId: string;
  title: string;
  description: string;
  priority: "urgent" | "high" | "normal" | "low";
}): Promise<void> {
  const task = await db.task.create({
    data: {
      title: params.title,
      description: params.description,
      priority: params.priority,
      status: "pending",
      agentId: params.agentId,
      createdById: params.agentId,
    },
  });

  const gameState = await db.gameState.findFirst();
  const playerId = gameState?.playerId || "default";

  await startAgentTaskWorkflow({
    taskId: task.id,
    agentId: params.agentId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    playerId,
  });
}

/**
 * Department lead cron jobs for operational cadence
 */
export const leadsCronJobs: CronJobDefinition[] = [
  // Engineering Lead (Sable) crons
  {
    name: "eng:standup",
    pattern: "30 9 * * *", // 9:30 AM daily
    description: "Engineering lead checks blocked tasks and reassigns work",
    handler: async (_job: Job) => {
      console.log("[Leads] Running engineering standup...");

      const engLead = await db.agent.findFirst({
        where: { role: "engineering_lead" },
      });

      if (!engLead) {
        console.warn("[Leads] No engineering lead found");
        return;
      }

      // Get engineering team status
      const engineers = await db.agent.findMany({
        where: { role: "engineer", status: { not: "offline" } },
      });

      const engineerIds = [engLead.id, ...engineers.map(e => e.id)];

      const [blockedTasks, inProgressTasks] = await Promise.all([
        db.task.findMany({
          where: {
            status: "blocked",
            agentId: { in: engineerIds },
          },
          include: { assignedTo: true },
        }),
        db.task.findMany({
          where: {
            status: "in_progress",
            agentId: { in: engineerIds },
          },
          include: { assignedTo: true },
        }),
      ]);

      const blockedList = blockedTasks
        .map((t) => `- ${t.title} (assigned to ${t.assignedTo?.name || "unknown"})`)
        .join("\n") || "None";

      const inProgressList = inProgressTasks
        .map((t) => `- ${t.title} (${t.assignedTo?.name || "unknown"})`)
        .join("\n") || "None";

      const engineerStatus = engineers
        .map((e) => `- ${e.name}: ${e.status}`)
        .join("\n") || "No engineers available";

      await createLeadTask({
        agentId: engLead.id,
        title: "Engineering Daily Standup",
        description: `Review engineering team status and address blockers.

Blocked Tasks:
${blockedList}

In Progress:
${inProgressList}

Team Status:
${engineerStatus}

Instructions:
1. Address blocked tasks - provide solutions or reassign
2. Check in-progress task durations
3. Distribute workload evenly across team
4. Report critical issues to CEO`,
        priority: "normal",
      });

      EventBus.emit("cron:completed", {
        jobName: "eng:standup",
        runCount: 1,
      });

      console.log("[Leads] Engineering standup task created");
    },
  },

  {
    name: "eng:review-queue",
    pattern: "0 */2 * * *", // Every 2 hours
    description: "Process pending code reviews",
    handler: async (_job: Job) => {
      console.log("[Leads] Checking code review queue...");

      const engLead = await db.agent.findFirst({
        where: { role: "engineering_lead" },
      });

      if (!engLead) {
        console.warn("[Leads] No engineering lead found");
        return;
      }

      // Check for tasks related to code review
      const pendingReviews = await db.task.count({
        where: {
          status: "pending",
          OR: [
            { title: { contains: "review" } },
            { description: { contains: "code review" } },
          ],
        },
      });

      if (pendingReviews === 0) {
        console.log("[Leads] No pending code reviews");
        return;
      }

      await createLeadTask({
        agentId: engLead.id,
        title: "Process Code Review Queue",
        description: `There are ${pendingReviews} pending code reviews that need attention.

Instructions:
1. Review each pending review request
2. Assign reviews to available engineers
3. Prioritize blocking reviews
4. Set deadlines for reviews`,
        priority: "normal",
      });

      EventBus.emit("cron:completed", {
        jobName: "eng:review-queue",
        runCount: 1,
      });
    },
  },

  {
    name: "eng:deploy-check",
    pattern: "0 16 * * *", // 4:00 PM daily
    description: "Verify deployments and rollback if needed",
    handler: async (_job: Job) => {
      console.log("[Leads] Running deployment check...");

      const engLead = await db.agent.findFirst({
        where: { role: "engineering_lead" },
      });

      if (!engLead) {
        console.warn("[Leads] No engineering lead found");
        return;
      }

      // Get today's completed deployment-related tasks
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const deployTasks = await db.task.findMany({
        where: {
          completedAt: { gte: today },
          OR: [
            { title: { contains: "deploy" } },
            { title: { contains: "release" } },
            { description: { contains: "deployment" } },
          ],
        },
      });

      if (deployTasks.length === 0) {
        console.log("[Leads] No deployments today");
        return;
      }

      const deployList = deployTasks
        .map((t) => `- ${t.title} (${t.status})`)
        .join("\n");

      await createLeadTask({
        agentId: engLead.id,
        title: "End of Day Deployment Verification",
        description: `Verify today's deployments are stable.

Today's Deployments:
${deployList}

Instructions:
1. Check deployment health metrics
2. Verify no critical errors in logs
3. Test core functionality
4. Prepare rollback plan if issues found
5. Report deployment status to CEO`,
        priority: "high",
      });

      EventBus.emit("cron:completed", {
        jobName: "eng:deploy-check",
        runCount: 1,
      });
    },
  },

  // Product Lead crons
  {
    name: "product:backlog",
    pattern: "0 10 * * *", // 10:00 AM daily
    description: "Groom backlog and prioritize features",
    handler: async (_job: Job) => {
      console.log("[Leads] Running backlog grooming...");

      const productLead = await db.agent.findFirst({
        where: { role: "product" },
      });

      if (!productLead) {
        console.warn("[Leads] No product lead found");
        return;
      }

      const pendingTasks = await db.task.count({
        where: { status: "pending" },
      });

      await createLeadTask({
        agentId: productLead.id,
        title: "Daily Backlog Grooming",
        description: `Groom the product backlog and prioritize features.

Current Backlog Size: ${pendingTasks} pending tasks

Instructions:
1. Review new feature requests
2. Prioritize based on business value
3. Break down large features into tasks
4. Update task descriptions with acceptance criteria
5. Communicate priorities to engineering`,
        priority: "normal",
      });

      EventBus.emit("cron:completed", {
        jobName: "product:backlog",
        runCount: 1,
      });
    },
  },

  // Marketing Lead crons
  {
    name: "marketing:content",
    pattern: "0 11 * * *", // 11:00 AM daily
    description: "Review content calendar and assign posts",
    handler: async (_job: Job) => {
      console.log("[Leads] Running content review...");

      const marketingLead = await db.agent.findFirst({
        where: { role: "marketing" },
      });

      if (!marketingLead) {
        console.warn("[Leads] No marketing lead found");
        return;
      }

      await createLeadTask({
        agentId: marketingLead.id,
        title: "Content Calendar Review",
        description: `Review and update the content calendar.

Instructions:
1. Review upcoming scheduled content
2. Ensure all posts are on track
3. Assign new content tasks to team
4. Coordinate with product for feature announcements
5. Draft any urgent external communications`,
        priority: "normal",
      });

      EventBus.emit("cron:completed", {
        jobName: "marketing:content",
        runCount: 1,
      });
    },
  },

  // Sales Lead crons
  {
    name: "sales:pipeline",
    pattern: "0 9 * * *", // 9:00 AM daily
    description: "Review deals and assign follow-ups",
    handler: async (_job: Job) => {
      console.log("[Leads] Running sales pipeline review...");

      const salesLead = await db.agent.findFirst({
        where: { role: "sales" },
      });

      if (!salesLead) {
        console.warn("[Leads] No sales lead found");
        return;
      }

      await createLeadTask({
        agentId: salesLead.id,
        title: "Daily Sales Pipeline Review",
        description: `Review the sales pipeline and assign follow-ups.

Instructions:
1. Review active deals and their status
2. Identify deals needing immediate attention
3. Assign follow-up tasks to sales team
4. Update pipeline forecasts
5. Prepare key deal updates for CEO`,
        priority: "normal",
      });

      EventBus.emit("cron:completed", {
        jobName: "sales:pipeline",
        runCount: 1,
      });
    },
  },

  // Finance/Operations Lead crons
  {
    name: "finance:reconcile",
    pattern: "0 8 * * *", // 8:00 AM daily
    description: "Process transactions and flag issues",
    handler: async (_job: Job) => {
      console.log("[Leads] Running finance reconciliation...");

      const financeLead = await db.agent.findFirst({
        where: { role: "operations" },
      });

      if (!financeLead) {
        console.warn("[Leads] No finance/operations lead found");
        return;
      }

      // Get budget info
      const gameState = await db.gameState.findFirst();
      const budgetRemaining = gameState
        ? Number(gameState.budgetRemainingUsd)
        : 0;

      await createLeadTask({
        agentId: financeLead.id,
        title: "Daily Financial Reconciliation",
        description: `Process daily transactions and flag any issues.

Current Budget Remaining: $${budgetRemaining.toFixed(2)}

Instructions:
1. Review yesterday's AI spending
2. Flag any unusual cost patterns
3. Update budget forecasts
4. Identify cost optimization opportunities
5. Report budget status to CEO`,
        priority: "normal",
      });

      EventBus.emit("cron:completed", {
        jobName: "finance:reconcile",
        runCount: 1,
      });
    },
  },
];
