import { proxyActivities, defineQuery, setHandler } from "@temporalio/workflow";
import type * as activities from "../activities/agentActivities.js";
import type { TaskResult } from "@generic-corp/shared";

// Proxy activities with timeouts
const {
  loadAgentConfig,
  executeAgentTask,
  updateTaskStatus,
  updateAgentStatus,
  emitProgress,
  storeTaskResult,
  emitTaskCompletion,
  logActivity,
  updateBudget,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: "5 minutes",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2,
  },
});

// Query to get current workflow status
export const getWorkflowStatus = defineQuery<{
  status: string;
  progress: number;
  currentStep: string;
}>("getStatus");

export interface AgentTaskWorkflowInput {
  taskId: string;
  agentId: string;
  title: string;
  description: string;
  priority: string;
  playerId: string;
}

export interface AgentTaskWorkflowOutput {
  success: boolean;
  result?: TaskResult;
  error?: string;
}

/**
 * Main workflow that orchestrates an agent executing a task
 * This workflow is durable - it can be resumed if the server restarts
 */
export async function agentTaskWorkflow(
  input: AgentTaskWorkflowInput
): Promise<AgentTaskWorkflowOutput> {
  let currentStatus = "initializing";
  let currentProgress = 0;
  let currentStep = "Loading agent configuration";

  // Set up query handler
  setHandler(getWorkflowStatus, () => ({
    status: currentStatus,
    progress: currentProgress,
    currentStep,
  }));

  try {
    // Step 1: Load agent configuration
    currentStep = "Loading agent configuration";
    currentProgress = 10;

    const agentConfig = await loadAgentConfig(input.agentId);

    await logActivity({
      agentId: input.agentId,
      taskId: input.taskId,
      eventType: "task_started",
      eventData: { title: input.title },
    });

    // Step 2: Update task status to in_progress
    currentStep = "Starting task execution";
    currentProgress = 20;
    currentStatus = "in_progress";

    await updateTaskStatus({
      taskId: input.taskId,
      status: "in_progress",
      progressPercent: 20,
    });

    // Step 3: Update agent status to working
    await updateAgentStatus({
      agentId: input.agentId,
      status: "working",
    });

    await emitProgress({
      taskId: input.taskId,
      agentId: input.agentId,
      progress: 20,
      details: { step: "Task started" },
    });

    // Step 4: Execute the agent task (this is the main work)
    currentStep = "Executing agent task";
    currentProgress = 40;

    await emitProgress({
      taskId: input.taskId,
      agentId: input.agentId,
      progress: 40,
      details: { step: "Agent working on task" },
    });

    const result = await executeAgentTask({
      agentId: input.agentId,
      agentName: agentConfig.agentName,
      taskId: input.taskId,
      title: input.title,
      description: input.description,
      priority: input.priority,
    });

    // Step 5: Store the result
    currentStep = "Storing results";
    currentProgress = 80;

    await storeTaskResult({
      taskId: input.taskId,
      result,
    });

    await emitProgress({
      taskId: input.taskId,
      agentId: input.agentId,
      progress: 90,
      details: { step: "Finalizing" },
    });

    // Step 6: Update budget if task succeeded
    if (result.success && result.costUsd > 0) {
      await updateBudget({
        playerId: input.playerId,
        costUsd: result.costUsd,
      });
    }

    // Step 7: Set agent back to idle
    await updateAgentStatus({
      agentId: input.agentId,
      status: "idle",
    });

    // Step 8: Emit completion event
    currentStep = "Completed";
    currentProgress = 100;
    currentStatus = result.success ? "completed" : "failed";

    await emitTaskCompletion({
      taskId: input.taskId,
      agentId: input.agentId,
      success: result.success,
      result: result.success ? result : undefined,
      error: result.error,
    });

    await logActivity({
      agentId: input.agentId,
      taskId: input.taskId,
      eventType: result.success ? "task_completed" : "task_failed",
      eventData: {
        success: result.success,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        error: result.error,
      },
    });

    return {
      success: result.success,
      result,
      error: result.error,
    };
  } catch (error) {
    currentStatus = "failed";
    currentStep = "Error occurred";

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Try to clean up on error
    try {
      await updateAgentStatus({
        agentId: input.agentId,
        status: "idle",
      });

      await updateTaskStatus({
        taskId: input.taskId,
        status: "failed",
        errorDetails: { error: errorMessage },
      });

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
        eventData: { error: errorMessage },
      });
    } catch (cleanupError) {
      // Log cleanup error but don't throw
      console.error("Error during cleanup:", cleanupError);
    }

    return {
      success: false,
      error: errorMessage,
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
