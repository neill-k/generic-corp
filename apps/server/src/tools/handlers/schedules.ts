import { db } from "../../db/index.js";

/**
 * Create a scheduled task
 */
export async function scheduleCreate(
  params: {
    name: string;
    cronExpression: string;
    taskTemplate: {
      title: string;
      description?: string;
      assigneeId: string;
      priority?: string;
    };
  },
  _context: { agentId: string }
): Promise<{ success: boolean; scheduleId: string }> {
  // Validate cron expression (basic validation)
  const cronParts = params.cronExpression.trim().split(/\s+/);
  if (cronParts.length < 5 || cronParts.length > 6) {
    throw new Error(
      "Invalid cron expression. Expected 5 or 6 parts (minute hour day month weekday [year])"
    );
  }

  // Verify assignee exists
  const assignee = await db.agent.findUnique({
    where: { id: params.taskTemplate.assigneeId },
  });

  if (!assignee) {
    throw new Error(`Assignee agent not found: ${params.taskTemplate.assigneeId}`);
  }

  const schedule = await db.schedule.create({
    data: {
      name: params.name,
      cronExpression: params.cronExpression,
      taskTemplate: JSON.parse(JSON.stringify(params.taskTemplate)),
      agentId: params.taskTemplate.assigneeId,
      enabled: true,
    },
  });

  return { success: true, scheduleId: schedule.id };
}

/**
 * List all scheduled tasks
 */
export async function scheduleList(params: {
  enabled?: boolean;
}): Promise<{
  schedules: Array<{
    id: string;
    name: string;
    cronExpression: string;
    enabled: boolean;
    agentName: string;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
  }>;
}> {
  const whereClause: Record<string, unknown> = {
    deletedAt: null,
  };

  if (params.enabled !== undefined) {
    whereClause.enabled = params.enabled;
  }

  const schedules = await db.schedule.findMany({
    where: whereClause,
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    schedules: schedules.map((s) => ({
      id: s.id,
      name: s.name,
      cronExpression: s.cronExpression,
      enabled: s.enabled,
      agentName: s.agent?.name || "Unknown",
      lastRunAt: s.lastRunAt,
      nextRunAt: s.nextRunAt,
    })),
  };
}

/**
 * Update a scheduled task
 */
export async function scheduleUpdate(
  params: {
    scheduleId: string;
    enabled?: boolean;
    cronExpression?: string;
    name?: string;
  },
  _context: { agentId: string }
): Promise<{ success: boolean }> {
  const schedule = await db.schedule.findUnique({
    where: { id: params.scheduleId },
  });

  if (!schedule || schedule.deletedAt) {
    throw new Error(`Schedule not found: ${params.scheduleId}`);
  }

  const updateData: Record<string, unknown> = {};

  if (params.enabled !== undefined) {
    updateData.enabled = params.enabled;
  }

  if (params.cronExpression) {
    // Validate cron expression
    const cronParts = params.cronExpression.trim().split(/\s+/);
    if (cronParts.length < 5 || cronParts.length > 6) {
      throw new Error("Invalid cron expression");
    }
    updateData.cronExpression = params.cronExpression;
  }

  if (params.name) {
    updateData.name = params.name;
  }

  await db.schedule.update({
    where: { id: params.scheduleId },
    data: updateData,
  });

  return { success: true };
}

/**
 * Get details of a specific schedule (CRUD Completeness - Read single)
 */
export async function scheduleGet(params: {
  scheduleId: string;
}): Promise<{
  schedule: {
    id: string;
    name: string;
    cronExpression: string;
    enabled: boolean;
    agentName: string;
    taskTemplate: Record<string, unknown>;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
  } | null;
}> {
  const schedule = await db.schedule.findUnique({
    where: { id: params.scheduleId },
    include: { agent: { select: { name: true } } },
  });

  if (!schedule || schedule.deletedAt) {
    return { schedule: null };
  }

  // Parse taskTemplate from JSON string
  let taskTemplateObj: Record<string, unknown> = {};
  try {
    taskTemplateObj = JSON.parse(schedule.taskTemplate);
  } catch {
    // If parsing fails, return empty object
  }

  return {
    schedule: {
      id: schedule.id,
      name: schedule.name,
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled,
      agentName: schedule.agent?.name || "Unknown",
      taskTemplate: taskTemplateObj,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
    },
  };
}

/**
 * Delete a scheduled task
 */
export async function scheduleDelete(
  params: {
    scheduleId: string;
  },
  _context: { agentId: string }
): Promise<{ success: boolean }> {
  const schedule = await db.schedule.findUnique({
    where: { id: params.scheduleId },
  });

  if (!schedule || schedule.deletedAt) {
    throw new Error(`Schedule not found: ${params.scheduleId}`);
  }

  // Soft delete
  await db.schedule.update({
    where: { id: params.scheduleId },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}
