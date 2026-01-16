import { Queue, Worker, Job } from "bullmq";
import type { Server as SocketIOServer } from "socket.io";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { QUEUE_NAMES } from "@generic-corp/shared";

const TASK_QUEUE_NAME = QUEUE_NAMES.AGENT_TASKS;
import { getAgent } from "../agents/index.js";
import { executeWithProvider } from "../providers/index.js";

// Redis connection config
const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
};

// Task queue for agent work
let taskQueue: Queue;
let taskWorker: Worker;

export async function initializeQueues(_io: SocketIOServer) {
  console.log("[Queues] Initializing BullMQ queues...");

  // Create task queue
  taskQueue = new Queue(TASK_QUEUE_NAME, { connection });

  // Create worker to process tasks
  taskWorker = new Worker(
    TASK_QUEUE_NAME,
    async (job: Job) => {
      const { taskId, agentId } = job.data;

      console.log(`[Worker] Processing task ${taskId} for agent ${agentId}`);

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

        // Emit status updates
        EventBus.emit("agent:status", {
          agentId,
          status: "working",
          taskId,
        });

        EventBus.emit("task:progress", {
          taskId,
          progress: 0,
          details: { message: "Task started" },
        });

        // Get task details
        const task = await db.task.findUnique({
          where: { id: taskId },
          include: { assignedTo: true, providerAccount: true },
        });

        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }

        let result;

        if (task.providerAccountId && task.provider) {
          console.log(`[Worker] Executing task ${taskId} via provider ${task.provider}`);
          const providerResult = await executeWithProvider(task.providerAccountId, {
            prompt: task.description || task.title,
          });
          result = {
            success: true,
            output: providerResult.output,
            provider: task.provider,
            tokensUsed: providerResult.tokensUsed,
          };
        } else {
          const agent = getAgent(task.assignedTo.name);

          if (agent) {
            // Ensure agent has the full record for tool permissions
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
            console.log(`[Worker] Agent ${task.assignedTo.name} not implemented, using simulation`);
            await simulateTaskExecution(taskId, agentId);
            result = { success: true, output: "Task completed (simulated)" };
          }
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
          data: {
            status: "idle",
            currentTaskId: null,
          },
        });

        // Emit completion
        EventBus.emit(result.success ? "task:completed" : "task:failed", {
          taskId,
          result,
          error: result.error,
        });

        EventBus.emit("agent:status", {
          agentId,
          status: "idle",
        });

        return { success: result.success, taskId };
      } catch (error) {
        console.error(`[Worker] Task ${taskId} failed:`, error);

        // Update task as failed
        await db.task.update({
          where: { id: taskId },
          data: {
            status: "failed",
            previousStatus: "in_progress",
            completedAt: new Date(),
            result: { error: error instanceof Error ? error.message : "Unknown error" },
          },
        });

        // Reset agent status
        await db.agent.update({
          where: { id: agentId },
          data: {
            status: "idle",
            currentTaskId: null,
          },
        });

        EventBus.emit("task:failed", {
          taskId,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        throw error;
      }
    },
    { connection, concurrency: 5 }
  );

  // Handle worker events
  taskWorker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed`);
  });

  taskWorker.on("failed", (job, error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  // Listen for task:queued events and add to queue
  EventBus.on("task:queued", async (data) => {
    const { agentId, task } = data;

    await taskQueue.add(
      "process-task",
      { taskId: task.id, agentId },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );

    console.log(`[Queues] Task ${task.id} queued for agent ${agentId}`);
  });

  console.log("[Queues] BullMQ queues initialized");
}

// Temporary simulation function - will be replaced with actual agent execution
// NOTE: This function only emits progress updates. The worker handles final task status update.
async function simulateTaskExecution(taskId: string, agentId: string) {
  // Simulate progress updates
  for (let progress = 25; progress <= 100; progress += 25) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    EventBus.emit("task:progress", {
      taskId,
      progress,
      details: { message: `Processing... ${progress}%` },
    });
  }

  // NOTE: Do NOT update task status or emit completion here.
  // The worker will handle final status update and completion event.
  // This prevents double-completion issues.

  // Log activity (using DB schema format, not event format)
  await db.activityLog.create({
    data: {
      agentId,
      taskId,
      action: "task_completed",
      details: { simulated: true },
    },
  });
}

// Graceful shutdown
export async function shutdownQueues() {
  console.log("[Queues] Shutting down...");

  if (taskWorker) {
    await taskWorker.close();
  }

  if (taskQueue) {
    await taskQueue.close();
  }

  console.log("[Queues] Shutdown complete");
}
