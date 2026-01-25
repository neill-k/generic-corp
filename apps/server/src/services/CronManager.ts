import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import parser from "cron-parser";
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
  private _redis: Redis;
  private jobs: Map<string, CronJobDefinition> = new Map();
  private jobStatus: Map<string, CronJobStatus> = new Map();

  get redis(): Redis {
    return this._redis;
  }

  constructor(redisConnection: Redis) {
    this._redis = redisConnection;

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
      console.log(`[CronManager] Job ${job.name} completed`);
    });

    this.worker.on("failed", (job, error) => {
      console.error(`[CronManager] Job ${job?.name} failed:`, error);
    });
  }

  /**
   * Register a cron job
   */
  async register(definition: CronJobDefinition): Promise<void> {
    const { name, pattern, description, enabled = true, data = {} } = definition;

    // Store job definition
    this.jobs.set(name, definition);

    // Initialize job status
    this.jobStatus.set(name, {
      name,
      pattern,
      description,
      enabled,
      runCount: 0,
      nextRun: this.calculateNextRun(pattern),
    });

    if (!enabled) {
      console.log(`[CronManager] Registered job ${name} (disabled)`);
      return;
    }

    // Remove existing job with same name
    await this.queue.removeRepeatableByKey(`${name}:::${pattern}`);

    // Add as repeatable job
    await this.queue.add(
      name,
      { ...data, jobName: name },
      {
        repeat: { pattern },
        jobId: name,
      }
    );

    console.log(`[CronManager] Registered job ${name} with pattern: ${pattern}`);
  }

  /**
   * Unregister a cron job
   */
  async unregister(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) {
      throw new Error(`Job ${name} not found`);
    }

    // Remove from queue
    await this.queue.removeRepeatableByKey(`${name}:::${definition.pattern}`);

    // Remove from maps
    this.jobs.delete(name);
    this.jobStatus.delete(name);

    console.log(`[CronManager] Unregistered job ${name}`);
  }

  /**
   * Pause a cron job
   */
  async pause(name: string): Promise<void> {
    const status = this.jobStatus.get(name);
    if (!status) {
      throw new Error(`Job ${name} not found`);
    }

    const definition = this.jobs.get(name);
    if (definition) {
      await this.queue.removeRepeatableByKey(`${name}:::${definition.pattern}`);
    }

    status.enabled = false;
    console.log(`[CronManager] Paused job ${name}`);
  }

  /**
   * Resume a cron job
   */
  async resume(name: string): Promise<void> {
    const status = this.jobStatus.get(name);
    const definition = this.jobs.get(name);

    if (!status || !definition) {
      throw new Error(`Job ${name} not found`);
    }

    // Re-add as repeatable job
    await this.queue.add(
      name,
      { ...definition.data, jobName: name },
      {
        repeat: { pattern: definition.pattern },
        jobId: name,
      }
    );

    status.enabled = true;
    status.nextRun = this.calculateNextRun(definition.pattern);
    console.log(`[CronManager] Resumed job ${name}`);
  }

  /**
   * Manually trigger a job
   */
  async trigger(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) {
      throw new Error(`Job ${name} not found`);
    }

    // Add a one-time job
    await this.queue.add(
      name,
      { ...definition.data, jobName: name, manual: true },
      {
        jobId: `${name}-manual-${Date.now()}`,
      }
    );

    console.log(`[CronManager] Manually triggered job ${name}`);
  }

  /**
   * Get status of all jobs
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
   * Execute a job
   */
  private async executeJob(job: Job): Promise<void> {
    const jobName = job.data.jobName || job.name;
    const definition = this.jobs.get(jobName);

    if (!definition) {
      console.warn(`[CronManager] No handler found for job: ${jobName}`);
      return;
    }

    const status = this.jobStatus.get(jobName);
    if (status) {
      status.lastRun = new Date();
      status.runCount++;
      status.nextRun = this.calculateNextRun(definition.pattern);
    }

    console.log(`[CronManager] Executing job: ${jobName}`);

    try {
      await definition.handler(job);

      // Emit success event
      EventBus.emit("cron:completed", {
        jobName,
        runCount: status?.runCount || 0,
      });

      if (status) {
        status.lastError = undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (status) {
        status.lastError = errorMessage;
      }

      // Emit failure event
      EventBus.emit("cron:failed", {
        jobName,
        error: errorMessage,
      });

      throw error; // Re-throw for BullMQ to handle
    }
  }

  /**
   * Calculate next run time for a cron pattern
   */
  private calculateNextRun(pattern: string): Date {
    try {
      const interval = parser.parseExpression(pattern);
      return interval.next().toDate();
    } catch (error) {
      // Return placeholder if parsing fails
      return new Date(Date.now() + 60000);
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

export function resetCronManager(): void {
  cronManager = null;
}
