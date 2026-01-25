import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "../activities/agentActivities.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TASK_QUEUE = "generic-corp-agent-tasks";

/**
 * Start the Temporal worker
 */
export async function startWorker(): Promise<Worker> {
  console.log(`[Temporal] Connecting to ${TEMPORAL_ADDRESS}...`);

  // Create connection to Temporal server
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  console.log("[Temporal] Connected. Starting worker...");

  // Create and start the worker
  const worker = await Worker.create({
    connection,
    namespace: "default",
    taskQueue: TASK_QUEUE,
    workflowsPath: path.resolve(__dirname, "../workflows"),
    activities,
  });

  console.log(`[Temporal] Worker started on task queue: ${TASK_QUEUE}`);

  return worker;
}

/**
 * Run the worker (blocking)
 */
export async function runWorker(): Promise<void> {
  const worker = await startWorker();

  // Handle shutdown signals
  const shutdown = async () => {
    console.log("[Temporal] Shutting down worker...");
    worker.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Run until shutdown
  await worker.run();
}

// Export task queue name for client usage
export { TASK_QUEUE };
