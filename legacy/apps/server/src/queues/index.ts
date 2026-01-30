import type { Server as SocketIOServer } from "socket.io";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { getAgent } from "../agents/index.js";
import {
  getTemporalClient,
  startAgentTaskWorkflow,
  initializeAgentLifecycles,
  shutdownTemporalClient,
} from "../temporal/index.js";

let temporalEnabled = false;

export async function initializeQueues(_io: SocketIOServer) {
  console.log("[Queues] Initializing task orchestration...");

  // Try to connect to Temporal
  try {
    await getTemporalClient();
    temporalEnabled = true;
    console.log("[Queues] Temporal connected - using durable workflows");

    // Initialize long-running agent lifecycle workflows
    await initializeAgentLifecycles();
  } catch (error) {
    console.warn("[Queues] Temporal not available, falling back to direct execution:", error);
    temporalEnabled = false;
  }

  // Listen for task:queued events
  EventBus.on("task:queued", async (data) => {
    const { agentId, task } = data;

    // Get task details
    const fullTask = await db.task.findUnique({
      where: { id: task.id },
      include: { assignedTo: true },
    });

    if (!fullTask) {
      console.error(`[Queues] Task ${task.id} not found`);
      return;
    }

    if (temporalEnabled) {
      // Route to Temporal workflow
      try {
        const workflowId = await startAgentTaskWorkflow({
          taskId: fullTask.id,
          agentId,
          agentName: fullTask.assignedTo.name,
          title: fullTask.title,
          description: fullTask.description || "",
          priority: fullTask.priority,
        });
        console.log(`[Queues] Task ${task.id} started as Temporal workflow: ${workflowId}`);
      } catch (error) {
        console.error(`[Queues] Failed to start Temporal workflow for task ${task.id}:`, error);
        // Fall back to direct execution
        await executeTaskDirectly(fullTask, agentId);
      }
    } else {
      // Direct execution fallback
      await executeTaskDirectly(fullTask, agentId);
    }
  });

  console.log("[Queues] Task orchestration initialized");
}

/**
 * Execute a task directly without Temporal (fallback mode)
 */
async function executeTaskDirectly(task: any, agentId: string) {
  const taskId = task.id;
  console.log(`[Queues] Executing task ${taskId} directly for agent ${agentId}`);

  try {
    // Update task status
    await db.task.update({
      where: { id: taskId },
      data: {
        status: "in_progress",
        previousStatus: "pending",
        startedAt: new Date(),
      },
    });

    // Update agent status
    await db.agent.update({
      where: { id: agentId },
      data: {
        status: "working",
        currentTaskId: taskId,
      },
    });

    EventBus.emit("agent:status", { agentId, status: "working", taskId });
    EventBus.emit("task:progress", { taskId, progress: 0, details: { message: "Task started" } });

    const agent = getAgent(task.assignedTo.name);
    let result;

    if (agent) {
      if (!agent.hasAgentRecord()) {
        agent.setAgentRecord(task.assignedTo);
      }

      result = await agent.executeTask({
        taskId,
        agentId,
        title: task.title,
        description: task.description,
        priority: task.priority,
      });
    } else {
      console.log(`[Queues] Agent ${task.assignedTo.name} not implemented, using simulation`);
      await simulateTaskExecution(taskId, agentId);
      result = { success: true, output: "Task completed (simulated)" };
    }

    // Update task with result
    await db.task.update({
      where: { id: taskId },
      data: {
        status: result.success ? "completed" : "failed",
        previousStatus: "in_progress",
        completedAt: new Date(),
        result: JSON.parse(JSON.stringify(result)),
      },
    });

    // Reset agent status
    await db.agent.update({
      where: { id: agentId },
      data: { status: "idle", currentTaskId: null },
    });

    EventBus.emit(result.success ? "task:completed" : "task:failed", {
      taskId,
      result,
      error: result.error,
    });
    EventBus.emit("agent:status", { agentId, status: "idle" });
  } catch (error) {
    console.error(`[Queues] Task ${taskId} failed:`, error);

    await db.task.update({
      where: { id: taskId },
      data: {
        status: "failed",
        previousStatus: "in_progress",
        completedAt: new Date(),
        result: { error: error instanceof Error ? error.message : "Unknown error" },
      },
    });

    await db.agent.update({
      where: { id: agentId },
      data: { status: "idle", currentTaskId: null },
    });

    EventBus.emit("task:failed", {
      taskId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Simulation function for agents not yet implemented
 */
async function simulateTaskExecution(taskId: string, agentId: string) {
  for (let progress = 25; progress <= 100; progress += 25) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    EventBus.emit("task:progress", {
      taskId,
      progress,
      details: { message: `Processing... ${progress}%` },
    });
  }

  await db.activityLog.create({
    data: {
      agentId,
      taskId,
      action: "task_completed",
      details: { simulated: true },
    },
  });
}

/**
 * Graceful shutdown
 */
export async function shutdownQueues() {
  console.log("[Queues] Shutting down...");

  if (temporalEnabled) {
    await shutdownTemporalClient();
  }

  console.log("[Queues] Shutdown complete");
}
