import { Prisma } from "@prisma/client";
import type { TaskStatus, TaskPriority } from "@prisma/client";
import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";
import { taskStatusTransitions } from "../definitions/index.js";

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
      assignedTo: {
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
      assignee: task.assignedTo?.name || "Unassigned",
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
  const newProgressDetails = params.progressDetails
    ? JSON.parse(JSON.stringify(params.progressDetails))
    : task.progressDetails;
  await db.task.update({
    where: { id: params.taskId },
    data: {
      progressPercent: Math.min(100, Math.max(0, params.progressPercent)),
      progressDetails: newProgressDetails,
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
  agentId?: string;
  limit?: number;
}): Promise<{
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assignee: string;
    progressPercent: number;
    createdAt: Date;
  }>;
}> {
  const whereClause: Prisma.TaskWhereInput = {
    deletedAt: null,
  };

  if (params.status) {
    whereClause.status = params.status as TaskStatus;
  }

  if (params.agentId) {
    whereClause.agentId = params.agentId;
  }

  const tasks = await db.task.findMany({
    where: whereClause,
    include: {
      assignedTo: {
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
      assignee: t.assignedTo?.name || "Unassigned",
      progressPercent: t.progressPercent,
      createdAt: t.createdAt,
    })),
  };
}

// Valid task status transitions - imported from prompt-native definitions
// This ensures status transitions are defined in one place and can be queried
// by agents using config_get_status_transitions tool
const getValidTransitions = (status: TaskStatus): TaskStatus[] => {
  return (taskStatusTransitions[status] || []) as TaskStatus[];
};

/**
 * Update a task's details
 */
export async function taskUpdate(
  params: {
    taskId: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    status?: TaskStatus;
  },
  _context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
  });

  if (!task || task.deletedAt) {
    throw new Error(`Task not found: ${params.taskId}`);
  }

  // Validate status transition if status is being changed
  // Uses prompt-native taskStatusTransitions config (queryable via config_get_status_transitions)
  if (params.status && params.status !== task.status) {
    const validNextStatuses = getValidTransitions(task.status);
    if (!validNextStatuses.includes(params.status)) {
      throw new Error(
        `Invalid status transition: ${task.status} -> ${params.status}. Valid transitions: ${validNextStatuses.join(", ") || "none"}. Query config_get_status_transitions for full state machine.`
      );
    }
  }

  // Build update data
  const updateData: Prisma.TaskUpdateInput = {};
  if (params.title) updateData.title = params.title;
  if (params.description) updateData.description = params.description;
  if (params.priority) updateData.priority = params.priority;
  if (params.status) {
    updateData.status = params.status;
    updateData.previousStatus = task.status;
    if (params.status === "completed") {
      updateData.completedAt = new Date();
      updateData.progressPercent = 100;
    }
    if (params.status === "in_progress" && !task.startedAt) {
      updateData.startedAt = new Date();
    }
  }

  await db.task.update({
    where: { id: params.taskId },
    data: updateData,
  });

  // Emit event if status changed
  if (params.status && params.status !== task.status) {
    if (params.status === "completed") {
      EventBus.emit("task:completed", {
        taskId: params.taskId,
        agentId: task.agentId,
      });
    } else if (params.status === "failed") {
      EventBus.emit("task:failed", {
        taskId: params.taskId,
        agentId: task.agentId,
        error: "Manually marked as failed",
      });
    }
  }

  return { success: true };
}

/**
 * Cancel a task
 */
export async function taskCancel(
  params: {
    taskId: string;
    reason?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
  });

  if (!task || task.deletedAt) {
    throw new Error(`Task not found: ${params.taskId}`);
  }

  const validNextStatuses = getValidTransitions(task.status);
  if (!validNextStatuses.includes("cancelled")) {
    throw new Error(
      `Cannot cancel task in status ${task.status}. Only pending, in_progress, or blocked tasks can be cancelled. Query config_get_status_transitions for valid transitions.`
    );
  }

  await db.task.update({
    where: { id: params.taskId },
    data: {
      status: "cancelled",
      previousStatus: task.status,
      errorDetails: params.reason ? { cancelReason: params.reason } : undefined,
    },
  });

  // Log activity
  EventBus.emit("activity:log", {
    agentId: context.agentId,
    eventType: "task_cancelled",
    eventData: { taskId: params.taskId, reason: params.reason },
  });

  return { success: true, message: `Task ${params.taskId} cancelled` };
}

/**
 * Retry a failed task
 */
export async function taskRetry(
  params: {
    taskId: string;
  },
  _context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
  });

  if (!task || task.deletedAt) {
    throw new Error(`Task not found: ${params.taskId}`);
  }

  if (task.status !== "failed") {
    throw new Error(`Can only retry failed tasks. Current status: ${task.status}`);
  }

  if (task.retryCount >= task.maxRetries) {
    throw new Error(`Task has exceeded maximum retries (${task.maxRetries})`);
  }

  await db.task.update({
    where: { id: params.taskId },
    data: {
      status: "pending",
      previousStatus: task.status,
      retryCount: { increment: 1 },
      errorDetails: Prisma.JsonNull,
      progressPercent: 0,
    },
  });

  // Re-queue the task
  EventBus.emit("task:queued", {
    agentId: task.agentId,
    task: { id: task.id },
  });

  return { success: true, message: `Task ${params.taskId} queued for retry` };
}

/**
 * Add a dependency between tasks
 */
export async function taskAddDependency(
  params: {
    taskId: string;
    dependsOnTaskId: string;
  },
  _context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  // Verify both tasks exist
  const [task, dependsOnTask] = await Promise.all([
    db.task.findUnique({ where: { id: params.taskId } }),
    db.task.findUnique({ where: { id: params.dependsOnTaskId } }),
  ]);

  if (!task || task.deletedAt) {
    throw new Error(`Task not found: ${params.taskId}`);
  }
  if (!dependsOnTask || dependsOnTask.deletedAt) {
    throw new Error(`Dependency task not found: ${params.dependsOnTaskId}`);
  }

  // Prevent self-dependency
  if (params.taskId === params.dependsOnTaskId) {
    throw new Error("A task cannot depend on itself");
  }

  // Check for circular dependency (simple check - only immediate)
  const existingReverse = await db.taskDependency.findFirst({
    where: {
      taskId: params.dependsOnTaskId,
      dependsOnTaskId: params.taskId,
    },
  });

  if (existingReverse) {
    throw new Error("Cannot create circular dependency");
  }

  // Create the dependency
  await db.taskDependency.create({
    data: {
      taskId: params.taskId,
      dependsOnTaskId: params.dependsOnTaskId,
    },
  });

  // If the dependency is not completed, mark the task as blocked
  if (dependsOnTask.status !== "completed") {
    await db.task.update({
      where: { id: params.taskId },
      data: { status: "blocked", previousStatus: task.status },
    });
  }

  return {
    success: true,
    message: `Task ${params.taskId} now depends on ${params.dependsOnTaskId}`,
  };
}

/**
 * Remove a dependency between tasks
 */
export async function taskRemoveDependency(
  params: {
    taskId: string;
    dependsOnTaskId: string;
  },
  _context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const result = await db.taskDependency.deleteMany({
    where: {
      taskId: params.taskId,
      dependsOnTaskId: params.dependsOnTaskId,
    },
  });

  if (result.count === 0) {
    throw new Error(
      `No dependency found between ${params.taskId} and ${params.dependsOnTaskId}`
    );
  }

  // Check if task can be unblocked
  const remainingDeps = await db.taskDependency.findMany({
    where: { taskId: params.taskId },
    include: { dependsOn: true },
  });

  const hasBlockingDeps = remainingDeps.some(
    (d) => d.dependsOn.status !== "completed"
  );

  if (!hasBlockingDeps) {
    const task = await db.task.findUnique({ where: { id: params.taskId } });
    if (task?.status === "blocked") {
      await db.task.update({
        where: { id: params.taskId },
        data: { status: "pending", previousStatus: task.status },
      });
    }
  }

  return { success: true, message: "Dependency removed" };
}

/**
 * List dependencies for a task
 */
export async function taskListDependencies(params: {
  taskId: string;
}): Promise<{
  dependencies: Array<{
    taskId: string;
    title: string;
    status: string;
    isBlocking: boolean;
  }>;
  dependents: Array<{
    taskId: string;
    title: string;
    status: string;
  }>;
}> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
    include: {
      dependencies: {
        include: {
          dependsOn: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      dependents: {
        include: {
          task: {
            select: { id: true, title: true, status: true },
          },
        },
      },
    },
  });

  if (!task) {
    throw new Error(`Task not found: ${params.taskId}`);
  }

  return {
    dependencies: task.dependencies.map((d) => ({
      taskId: d.dependsOn.id,
      title: d.dependsOn.title,
      status: d.dependsOn.status,
      isBlocking: d.dependsOn.status !== "completed",
    })),
    dependents: task.dependents.map((d) => ({
      taskId: d.task.id,
      title: d.task.title,
      status: d.task.status,
    })),
  };
}

/**
 * Reassign a task to a different agent
 */
export async function taskReassign(
  params: {
    taskId: string;
    newAgentId: string;
    reason?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
    include: { assignedTo: true },
  });

  if (!task || task.deletedAt) {
    throw new Error(`Task not found: ${params.taskId}`);
  }

  // Verify new agent exists
  const newAgent = await db.agent.findUnique({
    where: { id: params.newAgentId },
  });

  if (!newAgent || newAgent.deletedAt) {
    throw new Error(`Agent not found: ${params.newAgentId}`);
  }

  const oldAgentName = task.assignedTo?.name || "unassigned";
  const previousAgentId = task.agentId;

  // Update the task assignment
  await db.task.update({
    where: { id: params.taskId },
    data: {
      agentId: params.newAgentId,
      previousStatus: task.status,
      // Reset to pending if it was in progress
      status: task.status === "in_progress" ? "pending" : task.status,
    },
  });

  // Log the reassignment
  const logMessage = `Task "${task.title}" reassigned from ${oldAgentName} to ${newAgent.name}${params.reason ? `: ${params.reason}` : ""}`;
  await db.activityLog.create({
    data: {
      action: "task_reassigned",
      agentId: context.agentId,
      details: { message: logMessage, taskId: params.taskId, previousAgentId, newAgentId: params.newAgentId },
    },
  });

  // Emit events
  EventBus.emit("task:reassigned", {
    taskId: params.taskId,
    previousAgentId,
    newAgentId: params.newAgentId,
    reason: params.reason,
  });

  // Notify the new agent
  EventBus.emit("task:assigned", {
    agentId: params.newAgentId,
    task: { id: task.id, title: task.title },
  });

  return {
    success: true,
    message: `Task reassigned from ${oldAgentName} to ${newAgent.name}`,
  };
}
