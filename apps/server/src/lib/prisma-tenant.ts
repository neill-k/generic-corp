/**
 * Multi-Tenant Prisma Client Factory
 *
 * Provides Prisma clients with dynamic schema selection for multi-tenancy.
 *
 * Pattern: Shared database, separate schemas per tenant
 * Security: Tenant validation before client creation
 * Performance: LRU client cache (max 20) to bound memory; evicted clients are disconnected
 */

import { PrismaClient } from "@prisma/client";

/**
 * Simple LRU cache backed by a Map (iteration order = insertion order).
 * When the cache exceeds maxSize, the least-recently-used entry is evicted.
 */
class LruCache<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number) {}

  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      // Move to end (most recently used)
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }

  set(key: K, value: V): V | undefined {
    let evicted: V | undefined;
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict oldest (first entry)
      const oldest = this.map.keys().next().value;
      evicted = this.map.get(oldest!);
      this.map.delete(oldest!);
    }
    this.map.set(key, value);
    return evicted;
  }

  delete(key: K): boolean {
    return this.map.delete(key);
  }
  values(): IterableIterator<V> {
    return this.map.values();
  }
  clear(): void {
    this.map.clear();
  }
  get size(): number {
    return this.map.size;
  }
}

const MAX_CACHED_CLIENTS = 20;

// LRU cache of Prisma clients per tenant (evicted clients are disconnected)
const tenantClients = new LruCache<string, PrismaClient>(MAX_CACHED_CLIENTS);

// Public schema client for tenant registry queries
const publicPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env["DATABASE_URL"] },
  },
  log:
    process.env["NODE_ENV"] === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

/**
 * Get or create a Prisma client for a specific tenant schema.
 * Clients are cached in an LRU with automatic eviction + disconnect.
 * @throws Error if tenant slug is invalid, tenant doesn't exist, or is not active
 */
export async function getPrismaForTenant(
  tenantSlug: string,
): Promise<PrismaClient> {
  // Validate tenant slug format (must be valid PG schema name -- no hyphens)
  if (!/^[a-z][a-z0-9_]*$/.test(tenantSlug)) {
    throw new Error(`Invalid tenant slug format: ${tenantSlug}`);
  }

  // Check cache first
  const cached = tenantClients.get(tenantSlug);
  if (cached) {
    return cached;
  }

  // Validate tenant exists and is active
  const tenant = await publicPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { schemaName: true, status: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  if (tenant.status !== "active") {
    throw new Error(
      `Tenant not active: ${tenantSlug} (status: ${tenant.status})`,
    );
  }

  // Build tenant URL with schema and connection limit
  const baseUrl = process.env["DATABASE_URL"]!.split("?")[0];
  const tenantUrl = `${baseUrl}?schema=${tenant.schemaName}&connection_limit=5`;

  const client = new PrismaClient({
    datasources: {
      db: { url: tenantUrl },
    },
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // Test connection before caching
  try {
    await client.$connect();
  } catch (error) {
    throw new Error(
      `Failed to connect to tenant schema: ${tenant.schemaName}`,
    );
  }

  // Cache -- if an old client is evicted, disconnect it
  const evicted = tenantClients.set(tenantSlug, client);
  if (evicted) {
    evicted.$disconnect().catch((err) => {
      console.error("[Tenant] Error disconnecting evicted client:", err);
    });
  }

  console.log(
    `[Tenant] Created Prisma client for tenant: ${tenantSlug} (schema: ${tenant.schemaName})`,
  );

  return client;
}

/**
 * Get the public schema Prisma client (for tenant registry queries)
 */
export function getPublicPrisma(): PrismaClient {
  return publicPrisma;
}

/**
 * Clear cached client for a tenant (e.g., after schema migration)
 */
export async function clearTenantCache(tenantSlug: string): Promise<void> {
  const cached = tenantClients.get(tenantSlug);
  if (cached) {
    tenantClients.delete(tenantSlug);
    await cached.$disconnect();
    console.log(`[Tenant] Cleared cache for tenant: ${tenantSlug}`);
  }
}

/**
 * Disconnect all tenant clients (for graceful shutdown)
 */
export async function disconnectAll(): Promise<void> {
  console.log("[Tenant] Disconnecting all Prisma clients...");

  await publicPrisma.$disconnect();

  const disconnects: Promise<void>[] = [];
  for (const client of tenantClients.values()) {
    disconnects.push(client.$disconnect());
  }
  await Promise.all(disconnects);

  tenantClients.clear();
  console.log("[Tenant] All Prisma clients disconnected");
}

/**
 * Get tenant client cache statistics (for monitoring)
 */
export function getTenantCacheStats(): {
  totalCached: number;
  maxSize: number;
} {
  return {
    totalCached: tenantClients.size,
    maxSize: MAX_CACHED_CLIENTS,
  };
}
