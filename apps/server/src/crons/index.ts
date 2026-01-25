/**
 * Cron Jobs Index
 *
 * Initializes and registers all scheduled jobs with the CronManager.
 */

import { Redis } from "ioredis";
import { getCronManager, shutdownCronManager } from "../services/CronManager.js";
import { ceoCronJobs } from "./ceo.js";
import { workerCronJobs } from "./workers.js";
import { systemCronJobs } from "./system.js";

/**
 * Initialize all cron jobs
 */
export async function initializeCronJobs(redis: Redis): Promise<void> {
  const cronManager = getCronManager(redis);

  const allJobs = [
    ...ceoCronJobs,
    ...workerCronJobs,
    ...systemCronJobs,
  ];

  console.log(`[Crons] Registering ${allJobs.length} cron jobs...`);

  for (const job of allJobs) {
    await cronManager.register(job);
  }

  console.log("[Crons] All cron jobs registered");
}

/**
 * Shutdown cron jobs gracefully
 */
export async function shutdownCronJobs(): Promise<void> {
  console.log("[Crons] Shutting down...");
  await shutdownCronManager();
  console.log("[Crons] Shutdown complete");
}

/**
 * Get status of all cron jobs
 */
export function getCronJobStatus() {
  try {
    const cronManager = getCronManager();
    return cronManager.getStatus();
  } catch {
    return [];
  }
}

// Re-export for convenience
export { getCronManager } from "../services/CronManager.js";
export type { CronJobDefinition, CronJobStatus } from "../services/CronManager.js";
