import { Redis } from "ioredis";

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

/**
 * Get Redis client for publishing (singleton)
 */
export function getRedisPubClient(): Redis {
  if (!pubClient) {
    pubClient = new Redis({
      host: process.env["REDIS_HOST"] || "localhost",
      port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
      maxRetriesPerRequest: null, // Required for BullMQ
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        console.error("[Redis Pub] Connection error:", err.message);
        return true;
      },
    });

    pubClient.on("connect", () => {
      console.log("[Redis Pub] Connected");
    });

    pubClient.on("error", (err) => {
      console.error("[Redis Pub] Error:", err);
    });
  }

  return pubClient;
}

/**
 * Get Redis client for subscribing (singleton)
 */
export function getRedisSubClient(): Redis {
  if (!subClient) {
    subClient = new Redis({
      host: process.env["REDIS_HOST"] || "localhost",
      port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        console.error("[Redis Sub] Connection error:", err.message);
        return true;
      },
    });

    subClient.on("connect", () => {
      console.log("[Redis Sub] Connected");
    });

    subClient.on("error", (err) => {
      console.error("[Redis Sub] Error:", err);
    });
  }

  return subClient;
}

/**
 * Get a regular Redis client for general use (creates new instance)
 */
export function createRedisClient(): Redis {
  const client = new Redis({
    host: process.env["REDIS_HOST"] || "localhost",
    port: parseInt(process.env["REDIS_PORT"] || "6379", 10),
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  return client;
}

/**
 * Graceful shutdown
 */
export async function shutdownRedisClients(): Promise<void> {
  console.log("[Redis] Shutting down clients...");

  const promises: Promise<void>[] = [];

  if (pubClient) {
    promises.push(
      pubClient.quit().then(() => undefined).catch((err) => {
        console.error("[Redis Pub] Shutdown error:", err);
      })
    );
  }

  if (subClient) {
    promises.push(
      subClient.quit().then(() => undefined).catch((err) => {
        console.error("[Redis Sub] Shutdown error:", err);
      })
    );
  }

  await Promise.all(promises);
  console.log("[Redis] Shutdown complete");
}
