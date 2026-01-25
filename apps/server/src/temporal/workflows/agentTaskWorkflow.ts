import {
  proxyActivities,
  defineQuery,
  defineSignal,
  setHandler,
  condition,
  sleep,
  CancellationScope,
  isCancellation,
} from "@temporalio/workflow";
import type * as activities from "../activities/agentActivities.js";
import type { TaskResult } from "@generic-corp/shared";

// Proxy activities with activity-specific timeouts and retry policies
// Short-running activities (DB operations, notifications)
const {
  loadAgentConfig,
  updateTaskStatus,
  updateAgentStatus,
  emitProgress,
  storeTaskResult,
  emitTaskCompletion,
  logActivity,
  updateBudget,
  notifyLead,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  heartbeatTimeout: "10 seconds",
  retry: {
    maximumAttempts: 3,
    initialInterval: "500ms",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
  },
});

// Long-running activity: executeAgentTask (may take several minutes for LLM calls)
const { executeAgentTask } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  heartbeatTimeout: "2 minutes",
  retry: {
    maximumAttempts: 2, // Fewer retries for expensive LLM calls
    initialInterval: "5 seconds",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
  },
});

// Medium-duration activity: verifyTaskCompletion (may run tests/checks)
const { verifyTaskCompletion } = proxyActivities<typeof activities>({
  startToCloseTimeout: "2 minutes",
  heartbeatTimeout: "30 seconds",
  retry: {
    maximumAttempts: 2,
    initialInterval: "2 seconds",
    backoffCoefficient: 2,
    maximumInterval: "20 seconds",
  },
});

// Query to get current workflow status
export const getWorkflowStatus = defineQuery<{
  status: string;
  progress: number;
  currentStep: string;
  isPaused: boolean;
  turns: number;
}>("getStatus");

// Signals for workflow control
export const cancelSignal = defineSignal("cancel");
export const pauseSignal = defineSignal("pause");
export const resumeSignal = defineSignal("resume");

export interface AgentTaskWorkflowInput {
  taskId: string;
  agentId: string;
  title: string;
  description: string;
  priority: string;
  playerId: string;
  acceptanceCriteria?: string[];
  maxTurns?: number;
  leadId?: string;
}

export interface AgentTaskWorkflowOutput {
  success: boolean;
  result?: TaskResult;
  error?: string;
  turns: number;
  verified: boolean;
}

/**
 * Main workflow that orchestrates an agent executing a task
 * This workflow is durable - it can be resumed if the server restarts
 */
export async function agentTaskWorkflow(
  input: AgentTaskWorkflowInput
): Promise<AgentTaskWorkflowOutput> {
  // Workflow state
  let currentStatus = "initializing";
  let currentProgress = 0;
  let currentStep = "Loading agent configuration";
  let isPaused = false;
  let isCancelled = false;
  let turns = 0;
  const maxTurns = input.maxTurns || 20;

  // Set up query handler
  setHandler(getWorkflowStatus, () => ({
    status: currentStatus,
    progress: currentProgress,
    currentStep,
    isPaused,
    turns,
  }));

  // Set up signal handlers
  setHandler(cancelSignal, () => {
    isCancelled = true;
    currentStatus = "cancelling";
  });

  setHandler(pauseSignal, () => {
    isPaused = true;
    currentStatus = "paused";
  });

  setHandler(resumeSignal, () => {
    isPaused = false;
    if (currentStatus === "paused") {
      currentStatus = "in_progress";
    }
  });

  try {
    // Step 1: Load agent configuration
    currentStep = "Loading agent configuration";
    currentProgress = 5;

    const agentConfig = await loadAgentConfig(input.agentId);

    await logActivity({
      agentId: input.agentId,
      taskId: input.taskId,
      eventType: "task_started",
      eventData: { title: input.title },
    });

    // Step 2: Update task status to in_progress
    currentStep = "Starting task execution";
    currentProgress = 10;
    currentStatus = "in_progress";

    await updateTaskStatus({
      taskId: input.taskId,
      status: "in_progress",
      progressPercent: 10,
    });

    // Step 3: Update agent status to working
    await updateAgentStatus({
      agentId: input.agentId,
      status: "working",
    });

    await emitProgress({
      taskId: input.taskId,
      agentId: input.agentId,
      progress: 10,
      details: { step: "Task started" },
    });

    // Check for cancellation/pause before main work
    if (isCancelled) {
      throw new Error("Task cancelled by user");
    }
    await condition(() => !isPaused, "30 minutes");

    // Step 4: Execute agent task in loop
    currentStep = "Executing agent task";
    let result: TaskResult | undefined;
    let lastOutput = "";

    while (turns < maxTurns && !isCancelled) {
      // Check for pause
      if (isPaused) {
        currentStep = "Paused - waiting for resume";
        await condition(() => !isPaused || isCancelled, "30 minutes");
        if (isCancelled) break;
        currentStep = "Resuming execution";
      }

      turns++;
      currentProgress = 10 + Math.floor((turns / maxTurns) * 60);

      await emitProgress({
        taskId: input.taskId,
        agentId: input.agentId,
        progress: currentProgress,
        details: { step: `Turn ${turns}/${maxTurns}`, lastOutput },
      });

      // Execute one turn of agent work
      result = await executeAgentTask({
        agentId: input.agentId,
        agentName: agentConfig.agentName,
        taskId: input.taskId,
        title: input.title,
        description: input.description,
        priority: input.priority,
      });

      lastOutput = result.output;

      // Check if task is complete or failed
      if (result.success || result.error) {
        break;
      }

      // Sleep between turns to avoid rate limits
      await sleep("1 second");
    }

    // Check for cancellation
    if (isCancelled) {
      await updateAgentStatus({
        agentId: input.agentId,
        status: "idle",
      });

      await updateTaskStatus({
        taskId: input.taskId,
        status: "cancelled",
      });

      return {
        success: false,
        error: "Task cancelled",
        turns,
        verified: false,
      };
    }

    // Step 5: Verify task completion
    currentStep = "Verifying completion";
    currentProgress = 75;

    let verified = false;
    if (result?.success && input.acceptanceCriteria) {
      const verification = await verifyTaskCompletion({
        taskId: input.taskId,
        acceptanceCriteria: input.acceptanceCriteria,
      });
      verified = verification.allPassed;

      if (!verified) {
        await logActivity({
          agentId: input.agentId,
          taskId: input.taskId,
          eventType: "verification_failed",
          eventData: { failedCriteria: verification.failedCriteria },
        });
      }
    } else {
      // No acceptance criteria, consider verified if successful
      verified = result?.success || false;
    }

    // Step 6: Store the result
    currentStep = "Storing results";
    currentProgress = 85;

    if (result) {
      await storeTaskResult({
        taskId: input.taskId,
        result,
      });
    }

    // Step 7: Update budget if task succeeded
    if (result?.success && result.costUsd > 0) {
      await updateBudget({
        playerId: input.playerId,
        costUsd: result.costUsd,
      });
    }

    // Step 8: Notify lead if task failed
    if (!result?.success && input.leadId) {
      await notifyLead({
        leadId: input.leadId,
        agentId: input.agentId,
        taskId: input.taskId,
        message: `Task "${input.title}" failed: ${result?.error || "Unknown error"}`,
      });
    }

    // Step 9: Set agent back to idle
    await updateAgentStatus({
      agentId: input.agentId,
      status: "idle",
    });

    // Step 10: Emit completion event
    currentStep = "Completed";
    currentProgress = 100;
    currentStatus = result?.success ? "completed" : "failed";

    await emitTaskCompletion({
      taskId: input.taskId,
      agentId: input.agentId,
      success: result?.success || false,
      result: result?.success ? result : undefined,
      error: result?.error,
    });

    await logActivity({
      agentId: input.agentId,
      taskId: input.taskId,
      eventType: result?.success ? "task_completed" : "task_failed",
      eventData: {
        success: result?.success,
        tokensUsed: result?.tokensUsed,
        costUsd: result?.costUsd,
        error: result?.error,
        turns,
        verified,
      },
    });

    return {
      success: result?.success || false,
      result,
      error: result?.error,
      turns,
      verified,
    };
  } catch (error) {
    currentStatus = "failed";
    currentStep = "Error occurred";

    const errorMessage = isCancellation(error)
      ? "Task cancelled"
      : error instanceof Error
        ? error.message
        : "Unknown error";

    // Try to clean up on error
    try {
      await CancellationScope.nonCancellable(async () => {
        await updateAgentStatus({
          agentId: input.agentId,
          status: "idle",
        });

        await updateTaskStatus({
          taskId: input.taskId,
          status: "failed",
          errorDetails: { error: errorMessage },
        });

        // Notify lead on failure
        if (input.leadId) {
          await notifyLead({
            leadId: input.leadId,
            agentId: input.agentId,
            taskId: input.taskId,
            message: `Task "${input.title}" failed: ${errorMessage}`,
          });
        }

        await emitTaskCompletion({
          taskId: input.taskId,
          agentId: input.agentId,
          success: false,
          error: errorMessage,
        });

        await logActivity({
          agentId: input.agentId,
          taskId: input.taskId,
          eventType: "task_failed",
          eventData: { error: errorMessage, turns },
        });
      });
    } catch (cleanupError) {
      // Log cleanup error but don't throw
      console.error("Error during cleanup:", cleanupError);
    }

    return {
      success: false,
      error: errorMessage,
      turns,
      verified: false,
    };
  }
}

/**
 * Workflow for scheduled/recurring tasks
 */
export async function scheduledAgentTaskWorkflow(
  input: AgentTaskWorkflowInput & { scheduleId: string }
): Promise<AgentTaskWorkflowOutput> {
  // Log that this is a scheduled execution
  await logActivity({
    agentId: input.agentId,
    taskId: input.taskId,
    eventType: "scheduled_task_started",
    eventData: {
      scheduleId: input.scheduleId,
      title: input.title,
    },
  });

  // Execute the main workflow
  return agentTaskWorkflow(input);
}
