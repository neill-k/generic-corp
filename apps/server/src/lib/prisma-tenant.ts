/**
 * Multi-Tenant Prisma Client Factory
 *
 * Provides Prisma clients with dynamic schema selection for multi-tenancy.
 * Architecture approved by Sable Chen, Principal Engineer.
 *
 * Pattern: Shared database, separate schemas per tenant
 * Security: Tenant validation before client creation
 * Performance: Client caching to avoid recreation overhead
 */

import { PrismaClient } from '@prisma/client';

// Cache Prisma clients per tenant to avoid recreation overhead
const tenantClients = new Map<string, PrismaClient>();

// Public schema client for tenant registry queries
const publicPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});

/**
 * Get or create a Prisma client for a specific tenant schema
 * @throws Error if tenant doesn't exist or is not active
 */
export async function getPrismaForTenant(tenantSlug: string): Promise<PrismaClient> {
  // Validate tenant slug format (prevent SQL injection)
  if (!/^[a-z0-9-]+$/.test(tenantSlug)) {
    throw new Error(`Invalid tenant slug format: ${tenantSlug}`);
  }

  // Check cache first
  if (tenantClients.has(tenantSlug)) {
    return tenantClients.get(tenantSlug)!;
  }

  // Validate tenant exists and is active
  const tenant = await publicPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { schemaName: true, status: true }
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantSlug}`);
  }

  if (tenant.status !== 'active') {
    throw new Error(`Tenant not active: ${tenantSlug} (status: ${tenant.status})`);
  }

  // Create new client with tenant schema
  const baseUrl = process.env.DATABASE_URL!.split('?')[0];
  const tenantUrl = `${baseUrl}?schema=${tenant.schemaName}`;

  const client = new PrismaClient({
    datasources: {
      db: { url: tenantUrl }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

  // Test connection before caching
  try {
    await client.$connect();
  } catch (error) {
    throw new Error(`Failed to connect to tenant schema: ${tenant.schemaName}`);
  }

  // Cache for future requests
  tenantClients.set(tenantSlug, client);

  console.log(`[Tenant] Created Prisma client for tenant: ${tenantSlug} (schema: ${tenant.schemaName})`);

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
  const client = tenantClients.get(tenantSlug);
  if (client) {
    await client.$disconnect();
    tenantClients.delete(tenantSlug);
    console.log(`[Tenant] Cleared cache for tenant: ${tenantSlug}`);
  }
}

/**
 * Disconnect all tenant clients (for graceful shutdown)
 */
export async function disconnectAll(): Promise<void> {
  console.log('[Tenant] Disconnecting all Prisma clients...');

  await publicPrisma.$disconnect();

  for (const [slug, client] of tenantClients.entries()) {
    await client.$disconnect();
    console.log(`[Tenant] Disconnected client for: ${slug}`);
  }

  tenantClients.clear();
  console.log('[Tenant] All Prisma clients disconnected');
}

/**
 * Get tenant client cache statistics (for monitoring)
 */
export function getTenantCacheStats(): {
  totalCached: number;
  tenants: string[];
} {
  return {
    totalCached: tenantClients.size,
    tenants: Array.from(tenantClients.keys())
  };
}
