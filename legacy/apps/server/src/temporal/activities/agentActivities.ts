/**
 * Temporal Activities for Agent Operations
 *
 * Activities are non-deterministic code that does actual work:
 * - LLM calls
 * - Database operations
 * - Message sending
 * - External API calls
 */

import { db } from "../../db/index.js";
import { getAgent } from "../../agents/index.js";
import { MessageService } from "../../services/message-service.js";
import { EventBus } from "../../services/event-bus.js";
import type { TaskResult, TaskPriority } from "@generic-corp/shared";
import type { Prisma } from "@prisma/client";

export interface TaskInput {
  taskId: string;
  agentId: string;
  agentName: string;
  title: string;
  description: string;
  priority: string;
}

export interface UnreadMessage {
  id: string;
  fromAgentName: string;
  subject: string;
  body: string;
  createdAt: Date;
}

/**
 * Execute an agent task using the configured agent runtime
 */
export async function executeAgentTask(input: TaskInput): Promise<TaskResult> {
  console.log(`[Activity] Executing task ${input.taskId} for ${input.agentName}`);

  const agent = getAgent(input.agentName);

  if (!agent) {
    throw new Error(`Agent ${input.agentName} not found in registry`);
  }

  // Execute the task using the agent's implementation
  const result = await agent.executeTask({
    taskId: input.taskId,
    agentId: input.agentId,
    title: input.title,
    description: input.description,
    priority: input.priority,
  });

  return result;
}

/**
 * Update task status in database
 */
export async function updateTaskStatus(
  taskId: string,
  status: "pending" | "in_progress" | "completed" | "failed",
  result?: any
): Promise<void> {
  console.log(`[Activity] Updating task ${taskId} status to ${status}`);

  const updateData: any = {
    status,
    previousStatus: status === "in_progress" ? "pending" : "in_progress",
  };

  if (status === "in_progress") {
    updateData.startedAt = new Date();
  }

  if (status === "completed" || status === "failed") {
    updateData.completedAt = new Date();
    if (result) {
      updateData.result = JSON.parse(JSON.stringify(result));
    }
  }

  await db.task.update({
    where: { id: taskId },
    data: updateData,
  });
}

/**
 * Update agent status in database
 */
export async function updateAgentStatus(
  agentId: string,
  status: "idle" | "working",
  currentTaskId: string | null
): Promise<void> {
  console.log(`[Activity] Updating agent ${agentId} status to ${status}`);

  await db.agent.update({
    where: { id: agentId },
    data: {
      status,
      currentTaskId,
    },
  });

  // Emit event for WebSocket
  EventBus.emit("agent:status", {
    agentId,
    status,
    taskId: currentTaskId || undefined,
  });
}

/**
 * Emit task progress event
 */
export async function emitTaskProgress(
  taskId: string,
  progress: number,
  message: string
): Promise<void> {
  EventBus.emit("task:progress", {
    taskId,
    progress,
    details: { message },
  });
}

/**
 * Emit task completion event
 */
export async function emitTaskCompleted(taskId: string, result: TaskResult): Promise<void> {
  EventBus.emit(result.success ? "task:completed" : "task:failed", {
    taskId,
    result,
    error: result.error,
  });
}

/**
 * Get unread messages for an agent
 */
export async function getUnreadMessages(agentId: string): Promise<UnreadMessage[]> {
  const messages = await MessageService.getUnread(agentId);

  return messages.map((m) => ({
    id: m.id,
    fromAgentName: m.fromAgent?.name || "Unknown",
    subject: m.subject,
    body: m.body,
    createdAt: m.createdAt,
  }));
}

/**
 * Check if agent has unread messages
 */
export async function hasUnreadMessages(agentId: string): Promise<boolean> {
  const count = await db.message.count({
    where: {
      toAgentId: agentId,
      readAt: null,
      deletedAt: null,
    },
  });
  return count > 0;
}

/**
 * Get agent by ID
 */
export async function getAgentById(agentId: string): Promise<{ id: string; name: string; status: string } | null> {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
    select: { id: true, name: true, status: true },
  });
  return agent;
}

/**
 * Create a task for an agent
 */
export async function createTask(input: {
  agentId: string;
  title: string;
  description: string;
  priority: string;
}): Promise<string> {
  const task = await db.task.create({
    data: {
      agentId: input.agentId,
      createdById: input.agentId,
      title: input.title,
      description: input.description,
      priority: input.priority as TaskPriority,
      status: "pending",
    },
  });

  return task.id;
}

/**
 * Get task by ID
 */
export async function getTaskById(taskId: string): Promise<TaskInput | null> {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignedTo: true },
  });

  if (!task) return null;

  return {
    taskId: task.id,
    agentId: task.agentId,
    agentName: task.assignedTo.name,
    title: task.title,
    description: task.description || "",
    priority: task.priority,
  };
}

/**
 * Log activity
 */
export async function logActivity(
  agentId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  await db.activityLog.create({
    data: {
      agentId,
      action: eventType,
      details: eventData as Prisma.InputJsonValue,
    },
  });

  EventBus.emit("activity:log", {
    agentId,
    eventType,
    eventData,
  });
}
