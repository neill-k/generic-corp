import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";
import { getAgentByName } from "../../agents/index.js";
import type { TaskResult } from "@generic-corp/shared";

/**
 * Activity: Load agent configuration
 */
export async function loadAgentConfig(agentId: string): Promise<{
  agentId: string;
  agentName: string;
  personalityPrompt: string;
  capabilities: string[];
  toolPermissions: Record<string, boolean>;
}> {
  const agent = await db.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  return {
    agentId: agent.id,
    agentName: agent.name,
    personalityPrompt: agent.personalityPrompt,
    capabilities: Array.isArray(agent.capabilities)
      ? agent.capabilities as string[]
      : [],
    toolPermissions: typeof agent.toolPermissions === "object" && agent.toolPermissions !== null
      ? agent.toolPermissions as Record<string, boolean>
      : {},
  };
}

/**
 * Activity: Execute agent task
 * This calls the actual agent implementation to run the task
 */
export async function executeAgentTask(params: {
  agentId: string;
  agentName: string;
  taskId: string;
  title: string;
  description: string;
  priority: string;
}): Promise<TaskResult> {
  // Get the agent implementation
  const agent = getAgentByName(params.agentName);

  if (!agent) {
    return {
      success: false,
      output: "",
      tokensUsed: { input: 0, output: 0 },
      costUsd: 0,
      toolsUsed: [],
      error: `No agent implementation found for ${params.agentName}`,
    };
  }

  // Get agent record from DB for tool permissions
  const agentRecord = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  if (agentRecord) {
    agent.setAgentRecord(agentRecord);
  }

  // Execute the task
  const result = await agent.executeTask({
    taskId: params.taskId,
    agentId: params.agentId,
    title: params.title,
    description: params.description,
    priority: params.priority,
  });

  return result;
}

// Valid task status transitions to prevent invalid state changes
const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "failed", "blocked", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  completed: [], // Terminal state
  failed: ["pending"], // Can retry
  cancelled: [], // Terminal state
};

/**
 * Activity: Update task status in database
 * Uses atomic updateMany with current status check to prevent race conditions
 */
export async function updateTaskStatus(params: {
  taskId: string;
  status: string;
  expectedCurrentStatus?: string;
  progressPercent?: number;
  progressDetails?: Record<string, unknown>;
  errorDetails?: Record<string, unknown>;
  completedAt?: Date;
}): Promise<{ success: boolean; message?: string }> {
  // Build the where clause - always include taskId and optionally check current status
  const whereClause: { id: string; status?: { in: string[] }; deletedAt: null } = {
    id: params.taskId,
    deletedAt: null,
  };

  // If expectedCurrentStatus is provided, validate the transition
  if (params.expectedCurrentStatus) {
    const validNextStatuses = VALID_STATUS_TRANSITIONS[params.expectedCurrentStatus] || [];
    if (!validNextStatuses.includes(params.status)) {
      return {
        success: false,
        message: `Invalid status transition: ${params.expectedCurrentStatus} -> ${params.status}`,
      };
    }
    whereClause.status = { in: [params.expectedCurrentStatus] };
  }

  // Atomic update - only updates if the current status matches expected
  const result = await db.task.updateMany({
    where: whereClause,
    data: {
      status: params.status,
      previousStatus: params.expectedCurrentStatus,
      progressPercent: params.progressPercent,
      progressDetails: params.progressDetails ?? undefined,
      errorDetails: params.errorDetails ?? undefined,
      completedAt: params.completedAt,
      startedAt: params.status === "in_progress" ? new Date() : undefined,
    },
  });

  if (result.count === 0) {
    return {
      success: false,
      message: params.expectedCurrentStatus
        ? `Task ${params.taskId} status was not ${params.expectedCurrentStatus} (may have been updated concurrently)`
        : `Task ${params.taskId} not found or already deleted`,
    };
  }

  return { success: true };
}

/**
 * Activity: Update agent status
 * Uses optimistic locking with version field to detect concurrent modifications
 */
export async function updateAgentStatus(params: {
  agentId: string;
  status: "idle" | "working" | "blocked" | "offline";
  expectedVersion?: number;
}): Promise<{ success: boolean; newVersion?: number; message?: string }> {
  try {
    // If version provided, use optimistic locking
    if (params.expectedVersion !== undefined) {
      const result = await db.agent.updateMany({
        where: {
          id: params.agentId,
          version: params.expectedVersion,
          deletedAt: null,
        },
        data: {
          status: params.status,
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        return {
          success: false,
          message: `Agent ${params.agentId} version mismatch (expected ${params.expectedVersion}) - concurrent modification detected`,
        };
      }

      // Emit status change event
      EventBus.emit("agent:status", {
        agentId: params.agentId,
        status: params.status,
      });

      return { success: true, newVersion: params.expectedVersion + 1 };
    }

    // Without version check, just update directly
    const agent = await db.agent.update({
      where: { id: params.agentId },
      data: {
        status: params.status,
        version: { increment: 1 },
      },
    });

    // Emit status change event
    EventBus.emit("agent:status", {
      agentId: params.agentId,
      status: params.status,
    });

    return { success: true, newVersion: agent.version };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update agent status",
    };
  }
}

/**
 * Activity: Emit progress event
 */
export async function emitProgress(params: {
  taskId: string;
  agentId: string;
  progress: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  EventBus.emit("task:progress", {
    taskId: params.taskId,
    agentId: params.agentId,
    progress: params.progress,
    details: params.details,
  });
}

/**
 * Activity: Store task result in database
 */
export async function storeTaskResult(params: {
  taskId: string;
  result: TaskResult;
}): Promise<void> {
  await db.task.update({
    where: { id: params.taskId },
    data: {
      status: params.result.success ? "completed" : "failed",
      completedAt: new Date(),
      progressPercent: params.result.success ? 100 : undefined,
      progressDetails: {
        output: params.result.output,
        tokensUsed: params.result.tokensUsed,
        costUsd: params.result.costUsd,
        toolsUsed: params.result.toolsUsed,
      },
      errorDetails: params.result.error ? { error: params.result.error } : undefined,
    },
  });
}

/**
 * Activity: Emit task completion event
 */
export async function emitTaskCompletion(params: {
  taskId: string;
  agentId: string;
  success: boolean;
  result?: TaskResult;
  error?: string;
}): Promise<void> {
  if (params.success && params.result) {
    EventBus.emit("task:completed", {
      taskId: params.taskId,
      agentId: params.agentId,
      result: params.result,
    });
  } else {
    EventBus.emit("task:failed", {
      taskId: params.taskId,
      agentId: params.agentId,
      error: params.error || "Unknown error",
    });
  }
}

/**
 * Activity: Log activity event
 */
export async function logActivity(params: {
  agentId: string;
  taskId?: string;
  eventType: string;
  eventData: Record<string, unknown>;
}): Promise<void> {
  await db.activityLog.create({
    data: {
      agentId: params.agentId,
      taskId: params.taskId,
      eventType: params.eventType,
      eventData: params.eventData,
    },
  });

  EventBus.emit("activity:log", params);
}

/**
 * Activity: Update game budget
 * Uses atomic transaction with Serializable isolation to prevent TOCTOU race conditions
 */
export async function updateBudget(params: {
  playerId: string;
  costUsd: number;
}): Promise<{ success: boolean; newBalance: number }> {
  try {
    const result = await db.$transaction(
      async (tx) => {
        // Lock and read the current state
        const gameState = await tx.gameState.findFirst({
          where: { playerId: params.playerId },
        });

        if (!gameState) {
          return { success: false, newBalance: 0 };
        }

        const currentBalance = Number(gameState.budgetRemainingUsd);
        const newBalance = currentBalance - params.costUsd;

        if (newBalance < 0) {
          return { success: false, newBalance: currentBalance };
        }

        // Atomic update within the transaction
        await tx.gameState.update({
          where: { id: gameState.id },
          data: { budgetRemainingUsd: newBalance },
        });

        return { success: true, newBalance };
      },
      {
        // Use Serializable isolation to prevent concurrent read-modify-write races
        isolationLevel: "Serializable",
        timeout: 5000, // 5 second timeout
      }
    );

    return result;
  } catch (error) {
    // Handle transaction conflicts (retry logic could be added here)
    console.error("[Budget] Transaction failed:", error);
    return { success: false, newBalance: 0 };
  }
}

/**
 * Activity: Verify task completion against acceptance criteria
 */
export async function verifyTaskCompletion(params: {
  taskId: string;
  acceptanceCriteria: string[];
}): Promise<{
  allPassed: boolean;
  passedCriteria: string[];
  failedCriteria: string[];
}> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
    include: { agent: true },
  });

  if (!task) {
    return {
      allPassed: false,
      passedCriteria: [],
      failedCriteria: params.acceptanceCriteria,
    };
  }

  const passedCriteria: string[] = [];
  const failedCriteria: string[] = [];

  // Simple verification - check if task was marked as completed
  // In a real implementation, this would run tests, check files, etc.
  for (const criterion of params.acceptanceCriteria) {
    const criterionLower = criterion.toLowerCase();

    // Check for common verification patterns
    if (criterionLower.includes("test") || criterionLower.includes("spec")) {
      // Would run tests here
      // For now, assume passed if task completed
      if (task.status === "completed") {
        passedCriteria.push(criterion);
      } else {
        failedCriteria.push(criterion);
      }
    } else if (criterionLower.includes("file") || criterionLower.includes("create")) {
      // Would check file existence here
      if (task.status === "completed") {
        passedCriteria.push(criterion);
      } else {
        failedCriteria.push(criterion);
      }
    } else if (criterionLower.includes("commit") || criterionLower.includes("git")) {
      // Would check git history here
      if (task.status === "completed") {
        passedCriteria.push(criterion);
      } else {
        failedCriteria.push(criterion);
      }
    } else {
      // Default: assume passed if task completed
      if (task.status === "completed") {
        passedCriteria.push(criterion);
      } else {
        failedCriteria.push(criterion);
      }
    }
  }

  return {
    allPassed: failedCriteria.length === 0,
    passedCriteria,
    failedCriteria,
  };
}

/**
 * Activity: Notify lead agent about task status
 */
export async function notifyLead(params: {
  leadId: string;
  agentId: string;
  taskId: string;
  message: string;
}): Promise<{ success: boolean; messageId?: string }> {
  // Get agent name for the message
  const agent = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  const agentName = agent?.name || "Unknown Agent";

  // Create a message to the lead
  const message = await db.message.create({
    data: {
      fromAgentId: params.agentId,
      toAgentId: params.leadId,
      subject: `Task Update: ${agentName}`,
      body: params.message,
      type: "system",
      status: "pending",
      isExternalDraft: false,
    },
  });

  // Emit event for real-time notification
  EventBus.emit("message:new", {
    toAgentId: params.leadId,
    message,
  });

  // Log the notification
  await db.activityLog.create({
    data: {
      agentId: params.agentId,
      taskId: params.taskId,
      eventType: "lead_notified",
      eventData: {
        leadId: params.leadId,
        message: params.message,
      },
    },
  });

  return { success: true, messageId: message.id };
}
