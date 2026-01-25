import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";

type TaskPriority = "urgent" | "high" | "normal" | "low";

/**
 * Create a new task and assign it to an agent
 */
export async function taskCreate(
  params: {
    title: string;
    description: string;
    assigneeId: string;
    priority?: TaskPriority;
    acceptanceCriteria?: string[];
  },
  context: { agentId: string; agentName: string }
): Promise<{ success: boolean; taskId: string }> {
  // Verify assignee exists
  const assignee = await db.agent.findUnique({
    where: { id: params.assigneeId },
  });

  if (!assignee) {
    throw new Error(`Assignee agent not found: ${params.assigneeId}`);
  }

  // Build description with acceptance criteria if provided
  let fullDescription = params.description;
  if (params.acceptanceCriteria && params.acceptanceCriteria.length > 0) {
    fullDescription += "\n\n## Acceptance Criteria\n";
    fullDescription += params.acceptanceCriteria
      .map((c, i) => `${i + 1}. ${c}`)
      .join("\n");
  }

  // Create the task
  const task = await db.task.create({
    data: {
      title: params.title,
      description: fullDescription,
      agentId: params.assigneeId,
      createdById: context.agentId, // Fixed: use correct field name from schema
      status: "pending",
      priority: params.priority || "normal",
      progressPercent: 0,
      progressDetails: {},
      version: 1,
      retryCount: 0,
      maxRetries: 3,
    },
  });

  // Emit event for task queue
  EventBus.emit("task:queued", {
    agentId: params.assigneeId,
    task: { id: task.id },
  });

  return { success: true, taskId: task.id };
}

/**
 * Get task details
 */
export async function taskGet(params: {
  taskId: string;
}): Promise<{
  task: {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    progressPercent: number;
    assignee: string;
    createdAt: Date;
  } | null;
}> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
    include: {
      agent: {
        select: { name: true },
      },
    },
  });

  if (!task) {
    return { task: null };
  }

  return {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      progressPercent: task.progressPercent,
      assignee: task.agent?.name || "Unassigned",
      createdAt: task.createdAt,
    },
  };
}

/**
 * Update task progress
 */
export async function taskUpdateProgress(
  params: {
    taskId: string;
    progressPercent: number;
    progressDetails?: Record<string, unknown>;
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  // Verify task belongs to this agent
  const task = await db.task.findUnique({
    where: { id: params.taskId },
  });

  if (!task) {
    throw new Error(`Task not found: ${params.taskId}`);
  }

  if (task.agentId !== context.agentId) {
    throw new Error("Cannot update progress for task assigned to another agent");
  }

  // Update progress
  await db.task.update({
    where: { id: params.taskId },
    data: {
      progressPercent: Math.min(100, Math.max(0, params.progressPercent)),
      progressDetails: params.progressDetails || task.progressDetails,
    },
  });

  // Emit progress event
  EventBus.emit("task:progress", {
    taskId: params.taskId,
    agentId: context.agentId,
    progress: params.progressPercent,
    details: params.progressDetails,
  });

  return { success: true };
}

/**
 * List tasks for an agent
 */
export async function taskList(params: {
  status?: string;
  limit?: number;
}): Promise<{
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee: string;
  }>;
}> {
  const whereClause: Record<string, unknown> = {};

  if (params.status) {
    whereClause.status = params.status;
  }

  const tasks = await db.task.findMany({
    where: whereClause,
    include: {
      agent: {
        select: { name: true },
      },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: params.limit || 20,
  });

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      assignee: t.agent?.name || "Unassigned",
    })),
  };
}
