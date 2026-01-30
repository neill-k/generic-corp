/**
 * Temporal Workflows for Agent Operations
 *
 * Workflows are deterministic orchestration code.
 * They can be replayed to rebuild state after crashes.
 *
 * Key workflows:
 * - agentTaskWorkflow: Execute a single task
 * - agentLifecycleWorkflow: Long-running agent that handles messages
 */

import {
  proxyActivities,
  defineSignal,
  defineQuery,
  setHandler,
  condition,
  continueAsNew,
} from "@temporalio/workflow";

import type * as activities from "../activities/agentActivities.js";

// Proxy activities with retry policy
const {
  executeAgentTask,
  updateTaskStatus,
  updateAgentStatus,
  emitTaskProgress,
  emitTaskCompleted,
  getUnreadMessages,
  hasUnreadMessages,
  createTask,
  logActivity,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumAttempts: 3,
    maximumInterval: "30 seconds",
  },
});

// ============================================
// Signals - External events that wake up workflows
// ============================================

export const newMessageSignal = defineSignal<[{ messageId: string; fromAgentName: string; subject: string }]>(
  "newMessage"
);

export const cancelTaskSignal = defineSignal("cancelTask");

// ============================================
// Queries - Read workflow state
// ============================================

export const getStatusQuery = defineQuery<{
  status: "idle" | "working" | "waiting_for_message";
  currentTaskId?: string;
  messagesProcessed: number;
}>("getStatus");

// ============================================
// Agent Task Workflow
// ============================================

export interface AgentTaskWorkflowInput {
  taskId: string;
  agentId: string;
  agentName: string;
  title: string;
  description: string;
  priority: string;
}

 /**
  * Execute a single agent task
  *
  * This workflow:
  * 1. Updates task/agent status to working
  * 2. Executes the task via the agent runtime
  * 3. Updates status on completion
  * 4. Handles cancellation signals
  */
export async function agentTaskWorkflow(input: AgentTaskWorkflowInput): Promise<{
  success: boolean;
  output?: string;
  error?: string;
}> {
  let cancelled = false;

  // Handle cancellation signal
  setHandler(cancelTaskSignal, () => {
    cancelled = true;
  });

  try {
    // Mark as in progress
    await updateTaskStatus(input.taskId, "in_progress");
    await updateAgentStatus(input.agentId, "working", input.taskId);
    await emitTaskProgress(input.taskId, 0, "Task started");
    await logActivity(input.agentId, "task_started", { taskId: input.taskId, title: input.title });

    // Check for cancellation
    if (cancelled) {
      await updateTaskStatus(input.taskId, "failed", { error: "Cancelled" });
      await updateAgentStatus(input.agentId, "idle", null);
      return { success: false, error: "Task was cancelled" };
    }

    // Execute the task
    await emitTaskProgress(input.taskId, 10, "Executing task...");
    const result = await executeAgentTask(input);

    // Update completion status
    await updateTaskStatus(input.taskId, result.success ? "completed" : "failed", result);
    await updateAgentStatus(input.agentId, "idle", null);
    await emitTaskCompleted(input.taskId, result);
    await logActivity(input.agentId, result.success ? "task_completed" : "task_failed", {
      taskId: input.taskId,
      tokensUsed: result.tokensUsed,
      costUsd: result.costUsd,
    });

    return {
      success: result.success,
      output: result.output,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await updateTaskStatus(input.taskId, "failed", { error: errorMessage });
    await updateAgentStatus(input.agentId, "idle", null);
    await logActivity(input.agentId, "task_failed", { taskId: input.taskId, error: errorMessage });

    return { success: false, error: errorMessage };
  }
}

// ============================================
// Agent Lifecycle Workflow
// ============================================

export interface AgentLifecycleInput {
  agentId: string;
  agentName: string;
}

interface AgentState {
  status: "idle" | "working" | "waiting_for_message";
  currentTaskId?: string;
  messagesProcessed: number;
  pendingMessages: Array<{ messageId: string; fromAgentName: string; subject: string }>;
}

/**
 * Long-running agent lifecycle workflow
 *
 * This workflow:
 * 1. Stays alive indefinitely (uses continueAsNew to avoid history limits)
 * 2. Listens for newMessage signals
 * 3. Creates inbox tasks when messages arrive
 * 4. Periodically checks for unread messages
 */
export async function agentLifecycleWorkflow(input: AgentLifecycleInput): Promise<void> {
  const state: AgentState = {
    status: "idle",
    messagesProcessed: 0,
    pendingMessages: [],
  };

  const MAX_ITERATIONS = 1000; // ContinueAsNew after this many to prevent history bloat
  let iterations = 0;

  // Handle status query
  setHandler(getStatusQuery, () => ({
    status: state.status,
    currentTaskId: state.currentTaskId,
    messagesProcessed: state.messagesProcessed,
  }));

  // Handle new message signal
  setHandler(newMessageSignal, (message) => {
    console.log(`[Workflow] ${input.agentName} received message signal: ${message.subject}`);
    state.pendingMessages.push(message);
  });

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Wait for either: a message signal, or a periodic check (every 60 seconds)
    const hasMessage = await condition(() => state.pendingMessages.length > 0, "60 seconds");

    // Check if we have pending messages (from signal or periodic check)
    if (hasMessage || state.pendingMessages.length > 0) {
      // Process pending messages
      while (state.pendingMessages.length > 0) {
        const message = state.pendingMessages.shift()!;
        state.status = "working";

        // Create inbox task
        const taskId = await createTask({
          agentId: input.agentId,
          title: `Handle message from ${message.fromAgentName}: "${message.subject}"`,
          description: `You received a message that needs your attention.

**From:** ${message.fromAgentName}
**Subject:** ${message.subject}

Use check_inbox to read the full message and respond appropriately.`,
          priority: "high",
        });

        state.currentTaskId = taskId;
        state.messagesProcessed++;

        await logActivity(input.agentId, "inbox_task_created", {
          taskId,
          fromAgent: message.fromAgentName,
          subject: message.subject,
        });

        // Note: The task execution happens in a separate workflow
        // This workflow just creates the task and moves on

        state.status = "idle";
        state.currentTaskId = undefined;
      }
    } else {
      // Periodic check - look for any unread messages we might have missed
      const hasUnread = await hasUnreadMessages(input.agentId);
      if (hasUnread) {
        const messages = await getUnreadMessages(input.agentId);
        for (const msg of messages) {
          state.pendingMessages.push({
            messageId: msg.id,
            fromAgentName: msg.fromAgentName,
            subject: msg.subject,
          });
        }
      }
    }
  }

  // Continue as new to prevent history from growing too large
  await continueAsNew<typeof agentLifecycleWorkflow>(input);
}
