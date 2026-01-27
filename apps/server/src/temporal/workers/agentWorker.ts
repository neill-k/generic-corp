/**
 * Temporal Worker for Agent Operations
 *
 * This worker runs workflows and activities for agent task execution.
 * It connects to the Temporal server and processes tasks from the queue.
 */

import { Worker, NativeConnection, bundleWorkflowCode } from "@temporalio/worker";
import * as activities from "../activities/agentActivities.js";
import { fileURLToPath } from "url";
import path from "path";

const TASK_QUEUE = "agent-tasks";

export async function runWorker() {
  const temporalAddress = process.env.TEMPORAL_ADDRESS || "localhost:7233";

  console.log(`[Temporal Worker] Connecting to ${temporalAddress}...`);

  // Create connection to Temporal server
  const connection = await NativeConnection.connect({
    address: temporalAddress,
  });

  // Get the path to workflows - handle both .ts and .js extensions
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const workflowsPath = path.resolve(__dirname, "../workflows/agentWorkflows.ts");

  console.log(`[Temporal Worker] Bundling workflows from: ${workflowsPath}`);

  // Bundle workflow code (required when running with tsx/ts-node)
  const workflowBundle = await bundleWorkflowCode({
    workflowsPath,
  });

  // Create worker with bundled workflows
  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: TASK_QUEUE,
    workflowBundle,
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
