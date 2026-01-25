import { Redis } from "ioredis";
import { getCronManager, type CronJobDefinition } from "../services/CronManager.js";
import { systemCronJobs } from "./system.js";
import { workerCronJobs } from "./workers.js";

/**
 * Get all cron job definitions
 */
export function getAllCronJobs(): CronJobDefinition[] {
  return [
    ...systemCronJobs,
    ...workerCronJobs,
  ];
}

/**
 * Initialize all cron jobs
 */
export async function initializeCronJobs(redis: Redis): Promise<void> {
  const cronManager = getCronManager(redis);

  const allJobs = getAllCronJobs();

  console.log(`[Crons] Registering ${allJobs.length} cron jobs...`);

  for (const job of allJobs) {
    try {
      await cronManager.register(job);
    } catch (error) {
      console.error(`[Crons] Failed to register job ${job.name}:`, error);
    }
  }

  console.log("[Crons] All cron jobs registered");
}

/**
 * Shutdown all cron jobs
 */
export async function shutdownCronJobs(): Promise<void> {
  try {
    const cronManager = getCronManager();
    await cronManager.shutdown();
  } catch (error) {
    console.error("[Crons] Error during shutdown:", error);
  }
}

// Re-export for convenience
export { getCronManager } from "../services/CronManager.js";
export type { CronJobDefinition, CronJobStatus } from "../services/CronManager.js";
