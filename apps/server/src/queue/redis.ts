import { Redis } from "ioredis";

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (redis) return redis;

  redis = new Redis({
    host: process.env["REDIS_HOST"] ?? "localhost",
    port: parsePort(process.env["REDIS_PORT"], 6379),
    maxRetriesPerRequest: null,
  });

  return redis;
}

export async function closeRedis() {
  if (!redis) return;
  const existing = redis;
  redis = null;
  await existing.quit();
}
