/**
 * CronManager - Scheduled Job Management Service
 *
 * Uses BullMQ repeatable jobs for scheduling cron-style tasks.
 * This is the backbone of autonomous operation.
 */

import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { EventBus } from "./event-bus.js";

export interface CronJobDefinition {
  name: string;
  pattern: string; // Cron pattern (e.g., "0 9 * * *" for 9 AM daily)
  handler: (job: Job) => Promise<void>;
  data?: Record<string, unknown>;
  description?: string;
  enabled?: boolean;
}

export interface CronJobStatus {
  name: string;
  pattern: string;
  description?: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastError?: string;
  runCount: number;
}

export class CronManager {
  private queue: Queue;
  private worker: Worker;
  private jobs: Map<string, CronJobDefinition> = new Map();
  private jobStatus: Map<string, CronJobStatus> = new Map();

  constructor(redisConnection: Redis) {

    // Create the cron queue
    this.queue = new Queue("crons", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed
        removeOnFail: 50, // Keep last 50 failed
      },
    });

    // Create the worker
    this.worker = new Worker(
      "crons",
      async (job: Job) => {
        await this.executeJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 cron jobs concurrently
      }
    );

    // Handle worker events
    this.worker.on("completed", (job) => {
      if (job) {
        this.updateJobStatus(job.name, { lastError: undefined });
        console.log(`[CronManager] Job completed: ${job.name}`);
      }
    });

    this.worker.on("failed", (job, error) => {
      if (job) {
        this.updateJobStatus(job.name, { lastError: error.message });
        console.error(`[CronManager] Job failed: ${job.name}`, error);
      }
    });

    console.log("[CronManager] Initialized");
  }

  /**
   * Register a new cron job
   */
  async register(definition: CronJobDefinition): Promise<void> {
    const { name, pattern, data = {}, enabled = true, description } = definition;

    // Store the definition
    this.jobs.set(name, definition);

    // Initialize status
    this.jobStatus.set(name, {
      name,
      pattern,
      description,
      enabled,
      runCount: 0,
    });

    if (enabled) {
      // Add as repeatable job to BullMQ
      await this.queue.add(
        name,
        { ...data, cronName: name },
        {
          repeat: { pattern },
          jobId: name,
        }
      );

      console.log(`[CronManager] Registered: ${name} (${pattern})`);
    }
  }

  /**
   * Unregister a cron job
   */
  async unregister(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) return;

    // Remove repeatable job
    await this.queue.removeRepeatable(name, { pattern: definition.pattern });

    this.jobs.delete(name);
    this.jobStatus.delete(name);

    console.log(`[CronManager] Unregistered: ${name}`);
  }

  /**
   * Pause a cron job
   */
  async pause(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) return;

    await this.queue.removeRepeatable(name, { pattern: definition.pattern });
    this.updateJobStatus(name, { enabled: false });

    console.log(`[CronManager] Paused: ${name}`);
  }

  /**
   * Resume a paused cron job
   */
  async resume(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) return;

    await this.queue.add(
      name,
      { ...definition.data, cronName: name },
      {
        repeat: { pattern: definition.pattern },
        jobId: name,
      }
    );

    this.updateJobStatus(name, { enabled: true });

    console.log(`[CronManager] Resumed: ${name}`);
  }

  /**
   * Manually trigger a cron job (for testing)
   */
  async trigger(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) {
      throw new Error(`Unknown cron job: ${name}`);
    }

    await this.queue.add(
      name,
      { ...definition.data, cronName: name, manual: true },
      { jobId: `${name}-manual-${Date.now()}` }
    );

    console.log(`[CronManager] Manually triggered: ${name}`);
  }

  /**
   * Get status of all cron jobs
   */
  getStatus(): CronJobStatus[] {
    return Array.from(this.jobStatus.values());
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(name: string): CronJobStatus | undefined {
    return this.jobStatus.get(name);
  }

  /**
   * Execute a cron job
   */
  private async executeJob(job: Job): Promise<void> {
    const cronName = job.data.cronName || job.name;
    const definition = this.jobs.get(cronName);

    if (!definition) {
      console.warn(`[CronManager] No handler for job: ${cronName}`);
      return;
    }

    const startTime = Date.now();

    try {
      // Update status
      this.updateJobStatus(cronName, {
        lastRun: new Date(),
        runCount: (this.jobStatus.get(cronName)?.runCount || 0) + 1,
      });

      // Emit event
      EventBus.emit("cron:started", { name: cronName });

      // Execute the handler
      await definition.handler(job);

      // Emit completion event
      EventBus.emit("cron:completed", {
        name: cronName,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      EventBus.emit("cron:failed", {
        name: cronName,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      });

      throw error; // Re-throw for BullMQ to handle
    }
  }

  /**
   * Update job status
   */
  private updateJobStatus(name: string, updates: Partial<CronJobStatus>): void {
    const current = this.jobStatus.get(name);
    if (current) {
      this.jobStatus.set(name, { ...current, ...updates });
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    console.log("[CronManager] Shutdown complete");
  }
}

// Singleton instance
let cronManager: CronManager | null = null;

export function getCronManager(redis?: Redis): CronManager {
  if (!cronManager) {
    if (!redis) {
      throw new Error("Redis connection required for first initialization");
    }
    cronManager = new CronManager(redis);
  }
  return cronManager;
}

export function shutdownCronManager(): Promise<void> {
  if (cronManager) {
    return cronManager.shutdown();
  }
  return Promise.resolve();
}
