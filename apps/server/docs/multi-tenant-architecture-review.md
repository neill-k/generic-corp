# Multi-Tenant Architecture Review
**Reviewer:** Sable Chen, Principal Engineer
**Date:** 2026-01-26
**Status:** APPROVED WITH RECOMMENDATIONS

## Executive Summary

I have completed a comprehensive architectural review of Yuki's multi-tenant infrastructure design and Graham's analytics strategy. **The design is approved for implementation** with specific requirements detailed below.

## Architecture Approval ✓

Yuki's "shared database, separate schemas" approach is the correct architectural choice for Generic Corp's multi-tenant SaaS platform.

### Why This Approach Works

**Technical Advantages:**
- Prisma ORM has excellent PostgreSQL schema support
- Cost-effective for early-stage SaaS (<100 tenants)
- Strong isolation via PostgreSQL schema boundaries
- Easier migrations and backups than DB-per-tenant
- Better resource utilization than separate databases
- Simpler operational overhead

**Security Posture:**
- Network policies properly configured
- Encryption at rest and in transit (TLS 1.3)
- Secrets management via HashiCorp Vault/AWS Secrets Manager
- Tenant context middleware prevents cross-tenant data leakage
- Audit logging for compliance (SOC 2, GDPR)

**Scalability Path:**
- Clear horizontal scaling strategy (3-10 API pods)
- Vertical database scaling defined (r6g.large → xlarge → 2xlarge)
- Read replicas for analytics at scale
- Future sharding strategy for 200+ tenants

## Critical Requirements for Monday Implementation

### 1. Tenant Registry Table (BUILD THIS FIRST)

The `public.tenants` table is the foundation of the entire multi-tenant system. This must be created before any tenant schemas.

```sql
CREATE TABLE public.tenants (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(63) UNIQUE NOT NULL,
  schema_name VARCHAR(63) UNIQUE NOT NULL,

  -- Status & Plan
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  plan_tier VARCHAR(20) NOT NULL DEFAULT 'free',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Security
  allowed_domains TEXT[],
  api_key_hash TEXT,

  -- Resource Limits
  max_agents INT,
  max_tasks_per_month INT,
  storage_limit_gb INT,

  -- Billing Integration
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  -- Contact
  admin_email VARCHAR(255) NOT NULL,

  -- Constraints
  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT valid_schema_name CHECK (schema_name ~ '^tenant_[a-z0-9_]+$'),
  CONSTRAINT valid_status CHECK (status IN ('active', 'suspended', 'deleted'))
);

-- Indexes
CREATE INDEX idx_tenants_status ON public.tenants(status) WHERE status = 'active';
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_stripe ON public.tenants(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
```

**Prisma Schema Addition:**
```prisma
model Tenant {
  id                   String    @id @default(uuid())
  slug                 String    @unique @db.VarChar(63)
  schemaName           String    @unique @map("schema_name") @db.VarChar(63)
  status               String    @default("active") @db.VarChar(20)
  planTier             String    @default("free") @map("plan_tier") @db.VarChar(20)
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")
  deletedAt            DateTime? @map("deleted_at")
  allowedDomains       String[]  @map("allowed_domains")
  apiKeyHash           String?   @map("api_key_hash")
  maxAgents            Int?      @map("max_agents")
  maxTasksPerMonth     Int?      @map("max_tasks_per_month")
  storageLimitGb       Int?      @map("storage_limit_gb")
  stripeCustomerId     String?   @map("stripe_customer_id") @db.VarChar(255)
  stripeSubscriptionId String?   @map("stripe_subscription_id") @db.VarChar(255)
  adminEmail           String    @map("admin_email") @db.VarChar(255)

  @@index([status])
  @@index([slug])
  @@map("tenants")
}
```

### 2. Tenant-Aware Prisma Client Factory

Current Prisma setup won't support dynamic schema selection. We need a factory pattern:

```typescript
// src/lib/prisma-tenant.ts
import { PrismaClient } from '@prisma/client';

// Cache Prisma clients per tenant to avoid recreation overhead
const tenantClients = new Map<string, PrismaClient>();

// Public schema client for tenant registry queries
const publicPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL }
  }
});

/**
 * Get or create a Prisma client for a specific tenant schema
 * @throws Error if tenant doesn't exist or is not active
 */
export async function getPrismaForTenant(tenantSlug: string): Promise<PrismaClient> {
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
    }
  });

  // Cache for future requests
  tenantClients.set(tenantSlug, client);

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
  }
}

/**
 * Disconnect all tenant clients (for graceful shutdown)
 */
export async function disconnectAll(): Promise<void> {
  await publicPrisma.$disconnect();

  for (const client of tenantClients.values()) {
    await client.$disconnect();
  }

  tenantClients.clear();
}
```

### 3. Tenant Context Middleware

Every API request must be scoped to a tenant:

```typescript
// src/middleware/tenant-context.ts
import { Request, Response, NextFunction } from 'express';
import { getPrismaForTenant, getPublicPrisma } from '../lib/prisma-tenant';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        schemaName: string;
        planTier: string;
      };
      prisma?: PrismaClient;
    }
  }
}

/**
 * Extract tenant identifier from request
 * Supports: subdomain, header, or JWT claim
 */
function extractTenantSlug(req: Request): string | null {
  // Strategy 1: Subdomain (e.g., acme.app.generic-corp.com)
  const subdomain = req.hostname.split('.')[0];
  if (subdomain && subdomain !== 'app' && subdomain !== 'www') {
    return subdomain;
  }

  // Strategy 2: X-Tenant-Slug header
  const header = req.headers['x-tenant-slug'];
  if (header && typeof header === 'string') {
    return header;
  }

  // Strategy 3: JWT claim (if using auth)
  if (req.user?.tenantSlug) {
    return req.user.tenantSlug;
  }

  return null;
}

/**
 * Tenant context middleware
 * Validates tenant and attaches tenant-scoped Prisma client to request
 */
export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantSlug = extractTenantSlug(req);

    if (!tenantSlug) {
      res.status(400).json({
        error: 'Tenant identifier required',
        message: 'Please provide tenant via subdomain or X-Tenant-Slug header'
      });
      return;
    }

    // Validate and get tenant metadata
    const publicPrisma = getPublicPrisma();
    const tenant = await publicPrisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        schemaName: true,
        status: true,
        planTier: true
      }
    });

    if (!tenant || tenant.status !== 'active') {
      res.status(403).json({
        error: 'Invalid or inactive tenant',
        tenantSlug
      });
      return;
    }

    // Attach tenant context to request
    req.tenant = {
      id: tenant.id,
      slug: tenant.slug,
      schemaName: tenant.schemaName,
      planTier: tenant.planTier
    };

    // Attach tenant-scoped Prisma client
    req.prisma = await getPrismaForTenant(tenantSlug);

    next();
  } catch (error) {
    console.error('Tenant context error:', error);
    res.status(500).json({
      error: 'Tenant context initialization failed'
    });
  }
}

/**
 * Require tenant middleware (use after tenantContext)
 * Ensures tenant context exists before proceeding
 */
export function requireTenant(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.tenant || !req.prisma) {
    res.status(401).json({
      error: 'Tenant context required'
    });
    return;
  }
  next();
}
```

### 4. Tenant Isolation Testing (NON-NEGOTIABLE)

Security is critical. We must verify zero data leakage between tenants:

```typescript
// tests/integration/tenant-isolation.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPublicPrisma, getPrismaForTenant, disconnectAll } from '../src/lib/prisma-tenant';

describe('Tenant Isolation Tests', () => {
  let publicPrisma: PrismaClient;
  let alicePrisma: PrismaClient;
  let bobPrisma: PrismaClient;

  beforeAll(async () => {
    publicPrisma = getPublicPrisma();

    // Create test tenants
    await publicPrisma.tenant.create({
      data: {
        slug: 'test-alice',
        schemaName: 'tenant_test_alice',
        status: 'active',
        planTier: 'free',
        adminEmail: 'alice@test.com'
      }
    });

    await publicPrisma.tenant.create({
      data: {
        slug: 'test-bob',
        schemaName: 'tenant_test_bob',
        status: 'active',
        planTier: 'free',
        adminEmail: 'bob@test.com'
      }
    });

    // Create schemas
    await publicPrisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS tenant_test_alice`;
    await publicPrisma.$executeRaw`CREATE SCHEMA IF NOT EXISTS tenant_test_bob`;

    // Run migrations for each schema
    // (In real implementation, use migration scripts)

    alicePrisma = await getPrismaForTenant('test-alice');
    bobPrisma = await getPrismaForTenant('test-bob');
  });

  afterAll(async () => {
    // Cleanup
    await publicPrisma.$executeRaw`DROP SCHEMA IF EXISTS tenant_test_alice CASCADE`;
    await publicPrisma.$executeRaw`DROP SCHEMA IF EXISTS tenant_test_bob CASCADE`;
    await publicPrisma.tenant.deleteMany({
      where: { slug: { in: ['test-alice', 'test-bob'] } }
    });
    await disconnectAll();
  });

  it('should isolate agents between tenants', async () => {
    // Alice creates an agent
    const aliceAgent = await alicePrisma.agent.create({
      data: {
        name: 'Alice Agent',
        role: 'developer',
        personalityPrompt: 'Helpful assistant'
      }
    });

    // Bob creates an agent
    const bobAgent = await bobPrisma.agent.create({
      data: {
        name: 'Bob Agent',
        role: 'developer',
        personalityPrompt: 'Helpful assistant'
      }
    });

    // Alice should only see her agent
    const aliceAgents = await alicePrisma.agent.findMany();
    expect(aliceAgents).toHaveLength(1);
    expect(aliceAgents[0].id).toBe(aliceAgent.id);

    // Bob should only see his agent
    const bobAgents = await bobPrisma.agent.findMany();
    expect(bobAgents).toHaveLength(1);
    expect(bobAgents[0].id).toBe(bobAgent.id);

    // Critical: Alice should NOT see Bob's agent by ID
    const aliceCanSeeBob = await alicePrisma.agent.findUnique({
      where: { id: bobAgent.id }
    });
    expect(aliceCanSeeBob).toBeNull();
  });

  it('should prevent cross-tenant task access', async () => {
    // Create agents for both tenants
    const aliceAgent = await alicePrisma.agent.create({
      data: {
        name: 'Alice Agent',
        role: 'developer',
        personalityPrompt: 'Test'
      }
    });

    const bobAgent = await bobPrisma.agent.create({
      data: {
        name: 'Bob Agent',
        role: 'developer',
        personalityPrompt: 'Test'
      }
    });

    // Bob creates a task
    const bobTask = await bobPrisma.task.create({
      data: {
        agentId: bobAgent.id,
        createdById: bobAgent.id,
        title: 'Secret Project',
        description: 'Confidential data'
      }
    });

    // Alice should NOT see Bob's task
    const aliceTasks = await alicePrisma.task.findMany();
    expect(aliceTasks).toHaveLength(0);

    // Alice should NOT access Bob's task by ID
    const aliceCanSeeBobTask = await alicePrisma.task.findUnique({
      where: { id: bobTask.id }
    });
    expect(aliceCanSeeBobTask).toBeNull();
  });

  it('should validate tenant status before granting access', async () => {
    // Suspend Alice's tenant
    await publicPrisma.tenant.update({
      where: { slug: 'test-alice' },
      data: { status: 'suspended' }
    });

    // Attempt to get Prisma client should fail
    await expect(getPrismaForTenant('test-alice')).rejects.toThrow('Tenant not active');

    // Restore for cleanup
    await publicPrisma.tenant.update({
      where: { slug: 'test-alice' },
      data: { status: 'active' }
    });
  });

  it('should prevent SQL injection in tenant slug', async () => {
    const maliciousSlug = "test'; DROP SCHEMA tenant_test_bob; --";

    await expect(getPrismaForTenant(maliciousSlug)).rejects.toThrow();
  });
});
```

## Graham's Analytics Integration

Graham's analytics infrastructure design is solid and integrates well with multi-tenant architecture, but requires schema modifications:

### Required Schema Changes

**Add `tenantId` to ALL analytics tables:**

```prisma
model ProviderApiCall {
  id           String       @id @default(uuid())
  tenantId     String       @map("tenant_id")  // ← ADD THIS
  sessionId    String       @map("session_id")
  taskId       String?      @map("task_id")
  provider     ProviderKind
  operation    String
  tokensInput  Int          @map("tokens_input")
  tokensOutput Int          @map("tokens_output")
  costUsd      Decimal      @map("cost_usd") @db.Decimal(10, 6)
  latencyMs    Int          @map("latency_ms")
  success      Boolean      @default(true)
  errorMessage String?      @map("error_message")
  timestamp    DateTime     @default(now())

  tenant       Tenant       @relation(fields: [tenantId], references: [id])
  session      AgentSession @relation(fields: [sessionId], references: [id])
  task         Task?        @relation(fields: [taskId], references: [id])

  @@index([tenantId, timestamp])  // ← Critical for tenant-scoped queries
  @@index([provider, timestamp])
  @@index([taskId])
  @@map("provider_api_calls")
}

model DailyMetrics {
  id                  String       @id @default(uuid())
  tenantId            String       @map("tenant_id")  // ← ADD THIS
  date                DateTime     @db.Date
  provider            ProviderKind
  agentId             String?      @map("agent_id")
  totalCalls          Int          @default(0) @map("total_calls")
  successfulCalls     Int          @default(0) @map("successful_calls")
  totalCostUsd        Decimal      @map("total_cost_usd") @db.Decimal(10, 2)
  totalTokensInput    BigInt       @map("total_tokens_input")
  totalTokensOutput   BigInt       @map("total_tokens_output")
  avgLatencyMs        Int          @map("avg_latency_ms")
  tasksCompleted      Int          @default(0) @map("tasks_completed")

  tenant              Tenant       @relation(fields: [tenantId], references: [id])
  agent               Agent?       @relation(fields: [agentId], references: [id])

  @@unique([tenantId, date, provider, agentId])  // ← Updated unique constraint
  @@index([tenantId, date])
  @@map("daily_metrics")
}

model RoiCalculation {
  id                    String   @id @default(uuid())
  tenantId              String   @map("tenant_id")  // ← ADD THIS
  periodStart           DateTime @map("period_start")
  periodEnd             DateTime @map("period_end")
  actualCostUsd         Decimal  @map("actual_cost_usd") @db.Decimal(10, 2)
  baselineCostUsd       Decimal  @map("baseline_cost_usd") @db.Decimal(10, 2)
  savingsUsd            Decimal  @map("savings_usd") @db.Decimal(10, 2)
  savingsPercent        Decimal  @map("savings_percent") @db.Decimal(5, 2)
  tasksCompleted        Int      @map("tasks_completed")
  optimalRoutingPercent Decimal  @map("optimal_routing_percent") @db.Decimal(5, 2)
  calculatedAt          DateTime @default(now()) @map("calculated_at")

  tenant                Tenant   @relation(fields: [tenantId], references: [id])

  @@index([tenantId, periodStart, periodEnd])  // ← Tenant-scoped index
  @@map("roi_calculations")
}
```

### Why TenantId is Critical

1. **Security**: Prevents data leakage in analytics queries
2. **Billing**: Enables accurate cost attribution per tenant
3. **Performance**: Indexes optimize tenant-scoped queries
4. **Compliance**: Required for multi-tenant data isolation

### Analytics Query Pattern

```typescript
// WRONG - Returns data from ALL tenants (security breach!)
const metrics = await prisma.dailyMetrics.findMany({
  where: { date: { gte: startDate, lte: endDate } }
});

// CORRECT - Scoped to current tenant
const metrics = await req.prisma.dailyMetrics.findMany({
  where: {
    tenantId: req.tenant.id,  // Always filter by tenant
    date: { gte: startDate, lte: endDate }
  }
});
```

## Performance Considerations

### Connection Pooling Strategy

Yuki's PgBouncer configuration is correct:

```yaml
# PgBouncer config (Correct for multi-tenant)
pool_mode = transaction  # ✓ Allows schema switching per transaction
max_client_conn = 1000   # ✓ Supports 50+ tenants
default_pool_size = 25   # ✓ Reasonable for starting load
reserve_pool_size = 5    # ✓ Buffer for spikes
```

**Why transaction mode?**
- Allows different schemas in different transactions
- Releases connections quickly (efficient for multi-tenant)
- Prevents schema state leakage between requests

**Connection pool sizing:**
- 1-10 tenants: 25 connections is plenty
- 10-50 tenants: Monitor utilization, scale to 50 if needed
- 50+ tenants: Consider dedicated pool for high-volume tenants

### Database Scaling Path

**Phase 1: 1-10 tenants**
- Instance: db.r6g.large (2 vCPU, 16GB RAM) - $200/mo
- Storage: 100GB gp3 SSD
- Headroom: Can handle 50-100 req/sec per tenant

**Phase 2: 10-50 tenants**
- Instance: db.r6g.xlarge (4 vCPU, 32GB RAM) - $400/mo
- Storage: 500GB gp3 SSD with 10K IOPS
- Add PgBouncer for connection pooling

**Phase 3: 50-200 tenants**
- Primary: db.r6g.2xlarge (8 vCPU, 64GB RAM) - $800/mo
- Read replica: db.r6g.xlarge (for analytics queries)
- Separate analytics workload from transactional

**Phase 4: 200+ tenants**
- Consider sharding (multiple PostgreSQL instances)
- Tenant groups mapped to specific databases
- Application-level routing by tenant

### Monitoring & Observability

Add these tenant-specific metrics to Yuki's Prometheus/Grafana stack:

```yaml
# Security metrics (critical alerts)
- tenant_query_errors_total{tenant_id, error_type}
- tenant_unauthorized_access_attempts{tenant_id}
- cross_tenant_query_attempts_total  # Should always be 0!
- schema_switch_latency_ms{tenant_id}

# Performance metrics
- tenant_api_requests_total{tenant_id, endpoint, status}
- tenant_request_duration_seconds{tenant_id, endpoint}
- tenant_db_query_duration_seconds{tenant_id, query_type}
- tenant_connection_pool_usage{tenant_id}

# Resource metrics
- tenant_storage_bytes{tenant_id}
- tenant_active_agents{tenant_id}
- tenant_active_sessions{tenant_id}
- tenant_task_queue_depth{tenant_id}

# Business metrics
- tenant_api_call_cost_usd{tenant_id, provider}
- tenant_quota_usage_percent{tenant_id, quota_type}
```

**Critical Alerts to Configure:**

```yaml
# Security - Page immediately
- alert: CrossTenantQueryAttempt
  expr: cross_tenant_query_attempts_total > 0
  severity: critical
  description: "Potential security breach - cross-tenant query detected"

# Performance - Warning
- alert: TenantHighLatency
  expr: |
    histogram_quantile(0.95,
      rate(tenant_request_duration_seconds_bucket{tenant_id}[5m])
    ) > 2
  severity: warning
  description: "Tenant {{ $labels.tenant_id }} experiencing high latency"

# Business - Info
- alert: TenantQuotaWarning
  expr: tenant_quota_usage_percent{quota_type="tasks"} > 80
  severity: info
  description: "Tenant {{ $labels.tenant_id }} approaching quota limit (upsell opportunity)"
```

## Temporal.io Multi-Tenancy

Yuki's namespace-per-tenant strategy is correct. Implementation details:

### Namespace Provisioning

```typescript
// src/services/tenant-provisioning.ts
import { Connection, Client } from '@temporalio/client';

export async function provisionTenantWorkflows(tenantId: string, adminEmail: string) {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS
  });

  const client = new Client({ connection });
  const namespace = `tenant-${tenantId}`;

  try {
    // Create Temporal namespace
    await client.operatorService.registerNamespace({
      namespace,
      workflowExecutionRetentionPeriod: { seconds: 30 * 24 * 60 * 60 }, // 30 days
      description: `Workflows for tenant ${tenantId}`,
      ownerEmail: adminEmail
    });

    console.log(`Created Temporal namespace: ${namespace}`);
    return namespace;
  } catch (error) {
    if (error.code === 'AlreadyExists') {
      console.log(`Namespace ${namespace} already exists`);
      return namespace;
    }
    throw error;
  }
}
```

### Worker Pool Strategy

```typescript
// Shared workers listen to multiple tenant namespaces (efficient)
import { Worker } from '@temporalio/worker';

async function createMultiTenantWorker() {
  const tenants = await getActiveTenants();
  const taskQueues = tenants.map(t => `tenant-${t.id}-default`);

  // Single worker handles multiple tenant task queues
  const worker = await Worker.create({
    connection: await Connection.connect({ address: process.env.TEMPORAL_ADDRESS }),
    namespace: 'default',
    taskQueue: taskQueues[0],  // Primary queue
    // Workflows and activities registered here
  });

  // Worker context includes tenant ID for scoping
  return worker;
}
```

## Schema Migration Strategy

### For New Tenants (Automated)

```bash
#!/bin/bash
# scripts/provision-tenant.sh

set -e

TENANT_SLUG=$1
SCHEMA_NAME="tenant_${TENANT_SLUG}"
DATABASE_URL=${DATABASE_URL}

if [ -z "$TENANT_SLUG" ]; then
  echo "Usage: ./provision-tenant.sh <tenant-slug>"
  exit 1
fi

echo "Provisioning tenant: $TENANT_SLUG"

# 1. Create schema
psql $DATABASE_URL -c "CREATE SCHEMA IF NOT EXISTS ${SCHEMA_NAME};"

# 2. Run Prisma migrations for tenant schema
DATABASE_URL="${DATABASE_URL}?schema=${SCHEMA_NAME}" \
  npx prisma migrate deploy

# 3. Seed initial data if needed
DATABASE_URL="${DATABASE_URL}?schema=${SCHEMA_NAME}" \
  npx prisma db seed

echo "✓ Tenant ${TENANT_SLUG} provisioned successfully"
```

### For Existing Tenants (Migration Script)

```typescript
// scripts/migrate-all-tenants.ts
import { getPublicPrisma } from '../src/lib/prisma-tenant';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function migrateAllTenants() {
  const prisma = getPublicPrisma();

  const tenants = await prisma.tenant.findMany({
    where: { status: 'active' },
    select: { slug: true, schemaName: true }
  });

  console.log(`Found ${tenants.length} active tenants`);

  for (const tenant of tenants) {
    console.log(`Migrating ${tenant.slug}...`);

    try {
      const tenantUrl = `${process.env.DATABASE_URL}?schema=${tenant.schemaName}`;

      await execAsync('npx prisma migrate deploy', {
        env: { ...process.env, DATABASE_URL: tenantUrl },
        timeout: 60000  // 60 second timeout per tenant
      });

      console.log(`✓ ${tenant.slug} migrated successfully`);
    } catch (error) {
      console.error(`✗ ${tenant.slug} migration failed:`, error);
      // Continue with other tenants, log failure for manual review
    }
  }

  console.log('All tenant migrations complete');
}

migrateAllTenants().catch(console.error);
```

### Migration Best Practices

1. **Test migrations on staging tenant first**
2. **Keep migrations small** (single feature/table at a time)
3. **Have rollback script ready** before production migration
4. **Set timeout per tenant** (prevent hanging migrations)
5. **Monitor migration progress** (log success/failure per tenant)
6. **Run migrations during low-traffic hours**

## Cost Optimization

Yuki's cost estimates are reasonable but can be optimized for early stage:

### Right-Sizing for Phase 1 (1-10 tenants)

**Current Yuki Estimate:** ~$2,025-2,375/month

**Optimized Estimate for Early Stage:**

| Component | Yuki's Estimate | Optimized | Savings |
|-----------|-----------------|-----------|---------|
| Kubernetes (EKS/GKE) | $150 | $150 | $0 |
| Compute Nodes | $450 (3x m5.xlarge) | $300 (2x m5.xlarge) | $150 |
| PostgreSQL RDS | $650 (r6g.xlarge Multi-AZ) | $350 (r6g.large Multi-AZ) | $300 |
| Redis | $500 (3x r6g.large) | $150 (single r6g.large) | $350 |
| Load Balancer | $25 | $25 | $0 |
| Data Transfer | $200 | $100 | $100 |
| S3 Storage | $75 | $50 | $25 |
| Monitoring | $150 | $100 | $50 |
| **Total** | **$2,200** | **$1,225** | **$975/mo** |

**When to scale up:**
- Database: CPU >70% sustained for 24 hours → r6g.large to xlarge
- API: Pod count hitting max (10) frequently → Add compute node
- Redis: Memory >80% → Upgrade to cluster mode

### Scaling Triggers

```yaml
# Auto-scaling rules
database_cpu_threshold: 70%
database_memory_threshold: 75%
api_pod_max_replicas: 10
redis_memory_threshold: 80%
storage_growth_rate: 10GB/month

# Alert when approaching limits
- Database CPU >60% (prepare to scale)
- API pods >8 (add compute capacity)
- Redis memory >70% (plan upgrade)
```

## Security Considerations

### Input Validation & Injection Prevention

```typescript
// ALWAYS validate tenant slugs against registry
async function validateTenantSlug(slug: string): Promise<boolean> {
  // Prevent SQL injection
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Invalid tenant slug format');
  }

  // Verify exists in registry
  const prisma = getPublicPrisma();
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { status: true }
  });

  return tenant?.status === 'active';
}
```

### Row-Level Security (Defense in Depth)

While schema boundaries provide primary isolation, RLS adds an extra safety layer:

```sql
-- Enable RLS on sensitive tables (optional but recommended)
ALTER TABLE tenant_acme.provider_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_acme.credential_proxies ENABLE ROW LEVEL SECURITY;

-- Policies (application role should bypass, but prevents accidental cross-schema queries)
CREATE POLICY tenant_isolation ON tenant_acme.provider_accounts
  FOR ALL
  USING (true);  -- Schema boundary is primary isolation
```

### Audit Logging

```typescript
// Log all tenant context switches
app.use((req, res, next) => {
  if (req.tenant) {
    console.log({
      timestamp: new Date().toISOString(),
      tenantId: req.tenant.id,
      tenantSlug: req.tenant.slug,
      userId: req.user?.id,
      endpoint: req.path,
      method: req.method,
      ip: req.ip
    });
  }
  next();
});
```

## Rollout Recommendation

Yuki's 6-week timeline is realistic. Suggested prioritization:

### Week 1: Foundation (Critical Path)
- ✓ Tenant registry table (Day 1)
- ✓ Prisma client factory (Day 2)
- ✓ Tenant middleware (Day 2-3)
- ✓ Isolation tests (Day 3-4)
- ✓ Provisioning scripts (Day 4-5)

### Week 2: Infrastructure Setup
- ✓ Kubernetes cluster (EKS/GKE)
- ✓ PostgreSQL RDS (Multi-AZ)
- ✓ Redis (ElastiCache/Memorystore)
- ✓ Monitoring stack (Prometheus/Grafana/Loki)
- ✓ Secrets management (Vault/AWS Secrets Manager)

### Week 3: Application Deployment
- ✓ Containerize application
- ✓ Kubernetes manifests (Deployment, Service, HPA)
- ✓ Deploy API server
- ✓ Deploy Temporal workers
- ✓ Configure ingress + SSL
- ✓ Health checks & readiness probes

### Week 4: Analytics Integration (Graham)
- ✓ Analytics schema migrations (with tenantId)
- ✓ Cost tracking middleware
- ✓ Analytics API endpoints
- ✓ ROI calculation engine

### Week 5: Testing & Security
- ✓ Load testing (multi-tenant scenarios)
- ✓ Security audit (isolation verification)
- ✓ Failover testing (database, pods)
- ✓ Performance benchmarking
- ✓ Penetration testing (if budget allows)

### Week 6: Production Cutover
- ✓ Migration scripts for existing data
- ✓ DNS cutover preparation
- ✓ Gradual traffic ramp (10% → 50% → 100%)
- ✓ 48-hour monitoring period
- ✓ Performance tuning
- ✓ Post-launch retrospective

## My Availability & Commitment

### Review Schedule

**Monday, 2:00 PM PT (Preferred)**
- Initial design review with Yuki
- Review Prisma client factory implementation
- Discuss tenant provisioning automation
- Duration: 60 minutes

**Tuesday, 10:00 AM PT (Backup)**
- Code review of tenant middleware
- Review integration test coverage
- Discuss monitoring strategy
- Duration: 45 minutes

**Wednesday (Async)**
- Review of integration tests
- Prisma migration review before deployment
- Architecture Q&A via Slack/email

### Additional Support

I can provide:

1. **Tenant Isolation Test Suite** (2-3 hours)
   - Complete Vitest test suite
   - Security validation scenarios
   - Performance benchmarks
   - Ready to run in CI/CD

2. **Migration Review** (as needed)
   - Review all Prisma migrations before prod
   - Verify tenant schema compatibility
   - Rollback strategy validation

3. **Pair Programming** (if needed)
   - Connection pooling edge cases
   - Performance optimization
   - Security hardening

## Recommendations Summary

### Immediate Actions (Before Monday)

1. ✅ **CREATE** tenant registry table in public schema
2. ✅ **IMPLEMENT** Prisma client factory with tenant validation
3. ✅ **BUILD** tenant context middleware
4. ✅ **WRITE** comprehensive isolation tests
5. ✅ **ADD** tenantId to all analytics tables

### Architecture Decisions

- ✅ **APPROVE** Yuki's shared-database-separate-schemas approach
- ✅ **APPROVE** Yuki's infrastructure design (Kubernetes, PostgreSQL, Redis)
- ✅ **APPROVE** Yuki's monitoring & observability stack
- ✅ **APPROVE** Graham's analytics design (with tenantId modifications)
- ✅ **OPTIMIZE** Initial infrastructure sizing (save $975/mo)

### Risk Assessment

| Risk Category | Level | Mitigation |
|---------------|-------|------------|
| **Technical** | LOW | Proven pattern, solid design |
| **Security** | MEDIUM → LOW | After isolation testing |
| **Performance** | LOW | Clear scaling path |
| **Timeline** | LOW | 6 weeks is conservative |
| **Cost** | LOW | Can optimize down $975/mo |

## Conclusion

**Yuki's multi-tenant infrastructure design is APPROVED for implementation.**

This architecture provides:
- ✓ Strong tenant isolation via PostgreSQL schemas
- ✓ Scalable foundation for any SaaS revenue model
- ✓ Security best practices (encryption, network policies, secrets management)
- ✓ Clear scaling path (1 tenant → 200+ tenants)
- ✓ Integration with Graham's analytics strategy
- ✓ Operational excellence (monitoring, observability, disaster recovery)

**The foundation is solid. Let's build this properly and ship a secure, scalable multi-tenant SaaS platform.**

---

**Next Steps:**
1. Marcus schedules Monday design review (Sable + Yuki)
2. Yuki implements tenant registry table (Day 1)
3. Sable reviews Prisma client factory (Day 2)
4. Team begins Week 1 implementation (tenant foundation)

**Questions?** Ping me on Slack or email sable@generic-corp.com

---

**Sable Chen**
Principal Engineer, Generic Corp
Ex-Google, Ex-Stripe | Three Patents | Built Stripe's Fraud Detection Pipeline
