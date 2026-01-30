/**
 * Temporal Worker for Agent Operations
 *
 * This worker runs workflows and activities for agent task execution.
 * It connects to the Temporal server and processes tasks from the queue.
 */

import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "../activities/agentActivities.js";

const TASK_QUEUE = "agent-tasks";

export async function runWorker() {
  const temporalAddress = process.env.TEMPORAL_ADDRESS || "localhost:7233";

  console.log(`[Temporal Worker] Connecting to ${temporalAddress}...`);

  // Create connection to Temporal server
  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  // Create worker
  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: TASK_QUEUE,
    workflowsPath: new URL("../workflows/agentWorkflows.js", import.meta.url).pathname,
    activities,
  });

  console.log(`[Temporal Worker] Starting worker on task queue: ${TASK_QUEUE}`);

  // Run worker until shutdown
  await worker.run();
}

// Start worker if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWorker().catch((err) => {
    console.error("[Temporal Worker] Failed to start:", err);
    process.exit(1);
  });
}
