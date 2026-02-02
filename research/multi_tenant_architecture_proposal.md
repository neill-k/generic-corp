# Multi-Tenant Data Architecture Proposal
## Usage Analytics & Billing Infrastructure

**Author:** Graham "Gray" Sutton, Data Engineer
**Reviewer:** Sable Chen, Principal Engineer
**Date:** Week 1
**Status:** DRAFT - Pending Architecture Review

---

## Purpose

This document proposes a multi-tenant data architecture for our usage analytics and billing infrastructure. It requires security validation and architectural review before implementation.

**Critical Requirements:**
1. **Data isolation:** Zero risk of cross-tenant data leakage
2. **Performance:** Sub-100ms query latency for dashboards
3. **Scalability:** Support 10k+ tenants without degradation
4. **Compliance:** SOC2/GDPR-ready audit trails
5. **Cost efficiency:** Optimized storage and query patterns

---

## Architecture Overview

### Approach: Hybrid Multi-Tenancy

**Data Layer:**
- Shared database with tenant-based row-level security (PostgreSQL RLS)
- Logical isolation via `tenant_id` column in all tables
- Physical isolation for high-value enterprise customers (future option)

**Application Layer:**
- Tenant context injection at middleware level
- Query-level filtering enforced in ORM
- API-level authorization checks

**Rationale:**
- Shared DB: Cost-effective, easier maintenance, simpler backups
- RLS: Defense-in-depth, prevents application-layer bugs from leaking data
- Enterprise option: Flexibility for customers with strict compliance needs

---

## Database Schema Design

### Core Tables

#### 1. usage_events (Time-Series Data)

**Purpose:** Track individual agent executions, API calls, and resource usage

```sql
CREATE TABLE usage_events (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Multi-Tenant Isolation (CRITICAL)
    tenant_id UUID NOT NULL,

    -- Event Context
    user_id UUID NOT NULL,
    project_id UUID,
    environment VARCHAR(50) DEFAULT 'production',

    -- Event Details
    event_type VARCHAR(100) NOT NULL, -- 'agent_execution', 'api_call', 'llm_request', etc.
    agent_id UUID,
    execution_id UUID,
    workflow_id UUID,

    -- Timing
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,

    -- Cost Attribution
    cost_usd DECIMAL(10, 6),
    tokens_used INTEGER,
    compute_units DECIMAL(10, 4),

    -- Status
    status VARCHAR(50) NOT NULL, -- 'success', 'failure', 'timeout', 'cancelled'
    error_code VARCHAR(100),
    error_message TEXT,

    -- Metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_usage_events_tenant_time ON usage_events(tenant_id, timestamp DESC);
CREATE INDEX idx_usage_events_user_time ON usage_events(user_id, timestamp DESC);
CREATE INDEX idx_usage_events_project_time ON usage_events(project_id, timestamp DESC) WHERE project_id IS NOT NULL;
CREATE INDEX idx_usage_events_execution ON usage_events(execution_id) WHERE execution_id IS NOT NULL;
CREATE INDEX idx_usage_events_status ON usage_events(tenant_id, status, timestamp DESC);

-- JSONB Indexes for Metadata Queries
CREATE INDEX idx_usage_events_metadata ON usage_events USING GIN(metadata);

-- Partitioning for Scalability (Time-based)
-- Partition by month for efficient archival and query performance
-- Implementation: pg_partman or manual partition management
-- Example: usage_events_2024_01, usage_events_2024_02, etc.

-- Row-Level Security (RLS)
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's data
CREATE POLICY tenant_isolation_policy ON usage_events
    FOR ALL
    TO authenticated_user
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Policy: Service accounts can see all data (for admin/support)
CREATE POLICY admin_access_policy ON usage_events
    FOR ALL
    TO admin_user
    USING (true);
```

**Design Decisions:**

1. **BIGSERIAL vs UUID for PK:**
   - Using BIGSERIAL for performance (smaller index size, sequential inserts)
   - UUIDs for tenant_id, user_id to prevent enumeration attacks

2. **JSONB Metadata:**
   - Flexibility for event-specific data without schema changes
   - Enables custom attributes per event type
   - GIN index for efficient querying

3. **Partitioning Strategy:**
   - Monthly partitions balance query performance and maintenance
   - Older partitions can be archived to cheaper storage
   - Partition pruning improves query speed

4. **RLS vs Application-Level:**
   - RLS provides defense-in-depth
   - Prevents accidental cross-tenant queries
   - Performance impact is minimal with proper indexing

**Questions for Sable:**
- ✅ Is PostgreSQL RLS acceptable, or should we use application-level filtering only?
- ✅ Should we use TimescaleDB extension for better time-series performance?
- ✅ Partitioning strategy: Manual vs pg_partman vs native declarative partitioning?

---

#### 2. usage_aggregates (Pre-Computed Metrics)

**Purpose:** Fast dashboard queries without scanning raw events

```sql
CREATE TABLE usage_aggregates (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Multi-Tenant Isolation
    tenant_id UUID NOT NULL,

    -- Aggregation Scope
    project_id UUID,
    user_id UUID,

    -- Time Window
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    granularity VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week', 'month'

    -- Aggregated Metrics
    total_executions BIGINT DEFAULT 0,
    successful_executions BIGINT DEFAULT 0,
    failed_executions BIGINT DEFAULT 0,
    total_cost_usd DECIMAL(12, 6) DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_duration_ms BIGINT DEFAULT 0,

    -- Calculated Metrics
    avg_duration_ms INTEGER,
    success_rate DECIMAL(5, 4), -- 0.0000 to 1.0000
    p50_duration_ms INTEGER,
    p95_duration_ms INTEGER,
    p99_duration_ms INTEGER,

    -- Metadata
    event_type_breakdown JSONB DEFAULT '{}'::jsonb, -- {"agent_execution": 100, "api_call": 50}

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_usage_aggregates_unique ON usage_aggregates(
    tenant_id,
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
    period_start,
    granularity
);

CREATE INDEX idx_usage_aggregates_tenant_time ON usage_aggregates(tenant_id, period_start DESC);
CREATE INDEX idx_usage_aggregates_project_time ON usage_aggregates(project_id, period_start DESC) WHERE project_id IS NOT NULL;

-- RLS
ALTER TABLE usage_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON usage_aggregates
    FOR ALL
    TO authenticated_user
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Design Decisions:**

1. **Granularity Levels:**
   - Hourly: Real-time dashboards
   - Daily: Trend analysis
   - Monthly: Billing and reporting
   - Weekly: Optional, for week-over-week comparisons

2. **Percentile Metrics:**
   - P50/P95/P99 duration for performance monitoring
   - Calculated during aggregation job
   - Enables SLA monitoring

3. **Incremental Updates:**
   - Upsert pattern (ON CONFLICT DO UPDATE)
   - Re-aggregate only new events
   - Reduces computation cost

**Questions for Sable:**
- ✅ Should we store percentiles or calculate on-demand from raw events?
- ✅ Is JSONB event_type_breakdown flexible enough, or separate columns?
- ✅ Materialized views vs manual aggregation jobs?

---

#### 3. audit_events (Compliance & Security)

**Purpose:** Immutable audit trail for compliance (SOC2, GDPR, HIPAA)

```sql
CREATE TABLE audit_events (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Multi-Tenant Isolation
    tenant_id UUID NOT NULL,

    -- Actor
    user_id UUID,
    service_account_id UUID,
    ip_address INET,
    user_agent TEXT,

    -- Action
    action_type VARCHAR(100) NOT NULL, -- 'create', 'read', 'update', 'delete', 'export', 'share'
    resource_type VARCHAR(100) NOT NULL, -- 'agent', 'execution', 'project', 'api_key', etc.
    resource_id UUID,

    -- Changes (for update/delete actions)
    old_values JSONB,
    new_values JSONB,

    -- Context
    request_id UUID,
    session_id UUID,

    -- Timing
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Immutability Hash (for tamper detection)
    event_hash VARCHAR(64), -- SHA-256 of event data
    previous_hash VARCHAR(64) -- Links to previous event (blockchain-style)
);

-- Indexes
CREATE INDEX idx_audit_events_tenant_time ON audit_events(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_events_user_time ON audit_events(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_events_resource ON audit_events(resource_type, resource_id, timestamp DESC);
CREATE INDEX idx_audit_events_action ON audit_events(tenant_id, action_type, timestamp DESC);

-- RLS
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON audit_events
    FOR SELECT
    TO authenticated_user
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Prevent updates/deletes (immutable log)
CREATE POLICY immutable_audit_log ON audit_events
    FOR UPDATE
    TO authenticated_user
    USING (false);

CREATE POLICY immutable_audit_delete ON audit_events
    FOR DELETE
    TO authenticated_user
    USING (false);
```

**Design Decisions:**

1. **Immutability:**
   - SELECT-only policy for regular users
   - No UPDATE or DELETE allowed (compliance requirement)
   - Admin role can archive old events, but not modify

2. **Tamper Detection:**
   - Event hash: SHA-256 of event data
   - Previous hash: Links events in chain
   - Detects unauthorized database modifications

3. **GDPR Compliance:**
   - Supports "right to be forgotten" via anonymization (not deletion)
   - Export capability via `old_values`/`new_values`
   - Retention policies enforced via archival

**Questions for Sable:**
- ✅ Is blockchain-style hashing overkill, or required for compliance?
- ✅ Should audit logs be in separate database for extra isolation?
- ✅ Retention policy: Archive after N days or keep forever?

---

#### 4. tenant_usage_quotas (Rate Limiting & Billing)

**Purpose:** Enforce usage limits and prevent abuse

```sql
CREATE TABLE tenant_usage_quotas (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,

    -- Tenant
    tenant_id UUID NOT NULL UNIQUE,

    -- Subscription Tier
    tier VARCHAR(50) NOT NULL, -- 'free', 'basic', 'pro', 'enterprise'

    -- Monthly Quotas
    monthly_execution_limit INTEGER,
    monthly_api_call_limit INTEGER,
    monthly_token_limit BIGINT,
    monthly_cost_limit_usd DECIMAL(10, 2),

    -- Current Period Usage
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    current_executions INTEGER DEFAULT 0,
    current_api_calls INTEGER DEFAULT 0,
    current_tokens BIGINT DEFAULT 0,
    current_cost_usd DECIMAL(10, 6) DEFAULT 0,

    -- Rate Limiting
    max_executions_per_minute INTEGER,
    max_concurrent_executions INTEGER,

    -- Overage Settings
    allow_overage BOOLEAN DEFAULT false,
    overage_rate_per_execution DECIMAL(6, 4), -- e.g., $0.05

    -- Status
    is_active BOOLEAN DEFAULT true,
    quota_exceeded_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_tenant_quotas_tenant ON tenant_usage_quotas(tenant_id);
CREATE INDEX idx_tenant_quotas_period ON tenant_usage_quotas(period_end) WHERE is_active = true;

-- RLS
ALTER TABLE tenant_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON tenant_usage_quotas
    FOR SELECT
    TO authenticated_user
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

**Design Decisions:**

1. **Quota Enforcement:**
   - Checked before each execution (application layer)
   - Updated in real-time via triggers or background jobs
   - Hard limits vs soft limits (warnings)

2. **Billing Period:**
   - Monthly periods align with subscription billing
   - Auto-reset at period boundary
   - Grace period for payment processing

3. **Overage Handling:**
   - Allow overage: Charge extra (hybrid model)
   - Deny overage: Block executions (subscription model)
   - Configurable per tenant

**Questions for Sable:**
- ✅ Should quota checks be synchronous or asynchronous?
- ✅ How do we handle concurrent execution counting (race conditions)?
- ✅ Should we use Redis for real-time rate limiting?

---

## Multi-Tenant Isolation Strategy

### 1. Database-Level Isolation (PostgreSQL RLS)

**Configuration:**

```sql
-- Enable RLS on all multi-tenant tables
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Create database roles
CREATE ROLE authenticated_user;
CREATE ROLE admin_user;

-- Set tenant context in application
-- Application sets this at start of each request:
SET LOCAL app.current_tenant_id = '<tenant_uuid>';

-- Policies automatically filter all queries
SELECT * FROM usage_events; -- Only returns current tenant's data
```

**Advantages:**
- ✅ Defense-in-depth: Even if application has bugs, DB enforces isolation
- ✅ Audit-friendly: All queries logged with tenant context
- ✅ Consistent: Can't accidentally forget WHERE clause

**Disadvantages:**
- ⚠️ Performance: Additional filter on every query (mitigated by indexes)
- ⚠️ Complexity: Requires session variables and role management
- ⚠️ Testing: Need to set tenant context in tests

**Performance Impact:**
- ~5-10ms additional latency per query (with proper indexes)
- Negligible for dashboard queries (<100ms total)
- Acceptable trade-off for security

---

### 2. Application-Level Isolation

**Middleware:**

```typescript
// Express middleware to set tenant context
async function setTenantContext(req, res, next) {
  const tenantId = await extractTenantFromAuth(req.headers.authorization);

  if (!tenantId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Set in request context
  req.tenantId = tenantId;

  // Set in database session
  await db.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);

  next();
}

// ORM-level filtering (Prisma example)
prisma.$use(async (params, next) => {
  // Inject tenant_id into all queries
  if (params.model && MULTI_TENANT_MODELS.includes(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = params.args.where || {};
      params.args.where.tenant_id = req.tenantId;
    }
    if (params.action === 'create' || params.action === 'update') {
      params.args.data.tenant_id = req.tenantId;
    }
  }
  return next(params);
});
```

**Advantages:**
- ✅ Explicit: Clear where filtering happens
- ✅ Flexible: Easy to add custom logic
- ✅ Performance: No RLS overhead

**Disadvantages:**
- ⚠️ Error-prone: Easy to forget WHERE clause
- ⚠️ Testing: Need to ensure all code paths are covered
- ⚠️ Security: One bug can leak all data

---

### 3. Recommended Hybrid Approach

**Use both RLS and application-level filtering:**

1. **Application layer:** Primary filtering (performance)
2. **RLS layer:** Safety net (security)
3. **Monitoring:** Alert if RLS blocks queries (indicates app bug)

**Example:**

```typescript
// Application explicitly filters
const events = await prisma.usage_events.findMany({
  where: { tenant_id: req.tenantId } // Explicit filter
});

// RLS also filters (redundant but safe)
// If app forgets WHERE clause, RLS catches it
```

**Monitoring:**

```sql
-- Track RLS policy usage (detect app bugs)
SELECT schemaname, tablename, policyname,
       pg_stat_get_policy_stats(policyid)
FROM pg_policies;
```

**Questions for Sable:**
- ✅ Is hybrid approach (RLS + app-level) acceptable or overkill?
- ✅ Should we alert on RLS blocks (indicates app bug)?
- ✅ Performance monitoring strategy for multi-tenant queries?

---

## Data Retention & Archival

### Retention Policies

**Usage Events:**
- Hot storage: 90 days (PostgreSQL)
- Warm storage: 1 year (compressed partitions)
- Cold storage: 7 years (S3 Glacier) - compliance requirement
- Deletion: After 7 years (GDPR allows this)

**Aggregates:**
- Keep forever (minimal storage, high value)
- Hourly aggregates: 90 days, then delete
- Daily aggregates: 2 years
- Monthly aggregates: Forever

**Audit Events:**
- Keep forever (compliance requirement)
- Never delete (only anonymize for GDPR)
- Archive old partitions to cheaper storage

### Archival Strategy

**Automated Archival:**

```sql
-- Archive old partitions to S3
-- Run monthly via cron job

-- 1. Export partition to S3
COPY (SELECT * FROM usage_events_2023_01)
TO PROGRAM 'gzip | aws s3 cp - s3://bucket/archives/usage_events_2023_01.csv.gz';

-- 2. Verify export
-- (Check row counts, file size)

-- 3. Drop old partition
DROP TABLE usage_events_2023_01;

-- 4. Update metadata table
INSERT INTO archived_partitions (table_name, partition_name, archive_date, s3_path)
VALUES ('usage_events', 'usage_events_2023_01', NOW(), 's3://bucket/archives/usage_events_2023_01.csv.gz');
```

**GDPR Right to Be Forgotten:**

```sql
-- Anonymize user data (don't delete, for audit trail)
UPDATE usage_events
SET user_id = '00000000-0000-0000-0000-000000000000',
    metadata = metadata - 'user_email' - 'user_name'
WHERE user_id = $1;

-- Audit the anonymization
INSERT INTO audit_events (tenant_id, action_type, resource_type, resource_id, metadata)
VALUES ($tenant_id, 'anonymize', 'user', $user_id, '{"reason": "GDPR request"}'::jsonb);
```

**Questions for Sable:**
- ✅ Archival frequency: Monthly or quarterly?
- ✅ Restore process: How fast do we need to restore from S3?
- ✅ GDPR anonymization: Is setting user_id to null sufficient?

---

## Performance Optimization

### Query Patterns

**Dashboard Queries (Most Common):**

```sql
-- Real-time usage (last 24 hours)
-- Uses: usage_aggregates with hourly granularity
SELECT period_start, total_executions, total_cost_usd
FROM usage_aggregates
WHERE tenant_id = $1
  AND granularity = 'hour'
  AND period_start >= NOW() - INTERVAL '24 hours'
ORDER BY period_start DESC;

-- Expected: <50ms (uses index, ~24 rows)
```

```sql
-- Monthly cost trend
-- Uses: usage_aggregates with monthly granularity
SELECT period_start, total_cost_usd, success_rate
FROM usage_aggregates
WHERE tenant_id = $1
  AND granularity = 'month'
  AND period_start >= NOW() - INTERVAL '12 months'
ORDER BY period_start DESC;

-- Expected: <30ms (uses index, ~12 rows)
```

**Heavy Queries (Rare, Enterprise Only):**

```sql
-- Custom report: All events for a project in date range
-- Uses: usage_events with project_id index
SELECT event_type, timestamp, duration_ms, cost_usd, status
FROM usage_events
WHERE tenant_id = $1
  AND project_id = $2
  AND timestamp BETWEEN $3 AND $4
ORDER BY timestamp DESC
LIMIT 10000;

-- Expected: <500ms (partition pruning + index, max 10k rows)
```

### Indexing Strategy

**Covering Indexes (Avoid table lookups):**

```sql
-- Dashboard query can use index-only scan
CREATE INDEX idx_usage_aggregates_dashboard ON usage_aggregates(
    tenant_id,
    granularity,
    period_start DESC
) INCLUDE (total_executions, total_cost_usd, success_rate);
```

**Partial Indexes (Reduce index size):**

```sql
-- Index only active tenants (90% reduction)
CREATE INDEX idx_active_tenant_quotas ON tenant_usage_quotas(tenant_id)
WHERE is_active = true;

-- Index only failed events (20% of events)
CREATE INDEX idx_failed_events ON usage_events(tenant_id, timestamp DESC)
WHERE status = 'failure';
```

### Caching Strategy

**Application-Level Cache (Redis):**

```typescript
// Cache aggregated metrics (1-minute TTL)
async function getTenantUsage(tenantId: string) {
  const cacheKey = `usage:${tenantId}:last24h`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query database
  const data = await db.query(/* ... */);

  // Cache for 1 minute
  await redis.setex(cacheKey, 60, JSON.stringify(data));

  return data;
}
```

**Database-Level Cache (Materialized Views):**

```sql
-- Pre-compute expensive aggregations
CREATE MATERIALIZED VIEW tenant_monthly_usage AS
SELECT
  tenant_id,
  DATE_TRUNC('month', period_start) AS month,
  SUM(total_executions) AS executions,
  SUM(total_cost_usd) AS cost
FROM usage_aggregates
WHERE granularity = 'day'
GROUP BY tenant_id, month;

-- Refresh daily via cron
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_monthly_usage;
```

**Questions for Sable:**
- ✅ Redis caching: Per-tenant or global cache?
- ✅ Materialized views: CONCURRENTLY refresh or lock table?
- ✅ Cache invalidation: On write or TTL-based?

---

## Scalability Considerations

### Current Scale (Year 1)

**Assumptions:**
- 100 tenants
- 1M events/day (10k per tenant average)
- 365M events/year
- 10GB/year storage (with compression)

**Database Size:**
- usage_events: 5-10GB/year
- usage_aggregates: 100MB/year
- audit_events: 1GB/year
- **Total: ~12GB/year**

**Performance:**
- Dashboard queries: <100ms
- Aggregation jobs: <5 minutes/day
- Backup: <10 minutes

**Capacity: PostgreSQL easily handles this scale**

---

### Future Scale (Year 3)

**Projections:**
- 10,000 tenants
- 1B events/day (100k per tenant average)
- 365B events/year
- 1TB/year storage

**Database Size:**
- usage_events: 500GB-1TB/year (with partitioning & archival)
- usage_aggregates: 10GB/year
- audit_events: 100GB/year
- **Total: ~1.1TB/year (after archival)**

**Scaling Strategy:**

1. **Partitioning:**
   - Monthly partitions (12 partitions/year)
   - Partition pruning reduces query scope by 90%+
   - Archive old partitions to S3

2. **Read Replicas:**
   - Separate replica for analytics queries
   - Route dashboard queries to replica
   - Primary handles writes only

3. **Sharding (if needed):**
   - Shard by tenant_id hash
   - Enterprise customers get dedicated shards
   - Most tenants stay on shared shards

4. **Time-Series Database:**
   - Migrate usage_events to TimescaleDB
   - 10x better compression and query performance
   - Seamless upgrade path from PostgreSQL

**Questions for Sable:**
- ✅ At what point should we introduce read replicas?
- ✅ TimescaleDB now or wait until we hit scaling issues?
- ✅ Sharding strategy: By tenant count or data volume?

---

## Security Considerations

### 1. SQL Injection Prevention

**Parameterized Queries Only:**

```typescript
// ✅ SAFE
const events = await db.query(
  'SELECT * FROM usage_events WHERE tenant_id = $1',
  [tenantId]
);

// ❌ UNSAFE - NEVER DO THIS
const events = await db.query(
  `SELECT * FROM usage_events WHERE tenant_id = '${tenantId}'`
);
```

**ORM Usage:**
- Prefer ORM (Prisma, TypeORM) over raw SQL
- ORMs handle parameterization automatically
- Still validate inputs at application layer

---

### 2. Sensitive Data Handling

**PII in Metadata:**
- ⚠️ `metadata` JSONB field may contain PII
- Encrypt at application layer before storing
- Implement field-level encryption for sensitive data

**Example:**

```typescript
// Encrypt sensitive metadata fields
const encrypted = await encrypt(metadata.user_email);
await db.query(
  'INSERT INTO usage_events (tenant_id, metadata) VALUES ($1, $2)',
  [tenantId, { user_email: encrypted, ...rest }]
);
```

**Cost Data:**
- Don't expose raw LLM API keys in metadata
- Store only aggregated costs, not per-token pricing
- Redact API keys in error messages

---

### 3. Access Control

**Database Roles:**
- `authenticated_user`: Read own tenant, write own tenant
- `admin_user`: Read all, write all (support/ops)
- `analytics_readonly`: Read all, write none (BI tools)

**API Authorization:**
- JWT with tenant_id claim
- Validate tenant_id matches resource being accessed
- Rate limiting per tenant (prevent DoS)

**Audit Logging:**
- Log all data exports (GDPR compliance)
- Log all admin access (SOC2 compliance)
- Alert on suspicious patterns (security monitoring)

---

## Migration Strategy

### Phase 1: MVP (Week 1-2)

**Goal:** Basic usage metering for billing

1. Create core tables (usage_events, usage_aggregates, tenant_usage_quotas)
2. Implement RLS policies
3. Build ingestion pipeline (REST API → PostgreSQL)
4. Create basic aggregation job (hourly)
5. Test multi-tenant isolation

**Success Criteria:**
- ✅ Can track usage per tenant
- ✅ Can calculate monthly bills
- ✅ Zero cross-tenant data leaks in testing

---

### Phase 2: Pro Features (Week 3-4)

**Goal:** Real-time analytics dashboard

1. Add audit_events table
2. Build real-time aggregation (streaming)
3. Create dashboard API endpoints
4. Optimize query performance
5. Add caching layer (Redis)

**Success Criteria:**
- ✅ Dashboard loads <1 second
- ✅ Real-time updates (<1 minute lag)
- ✅ Support 1000 concurrent dashboard users

---

### Phase 3: Enterprise (Week 5-8)

**Goal:** Compliance and advanced analytics

1. Implement audit event hashing (tamper detection)
2. Add GDPR anonymization workflows
3. Build data export API
4. Create read replicas for analytics
5. Optimize for 10k+ tenants

**Success Criteria:**
- ✅ SOC2 compliance requirements met
- ✅ GDPR data export <1 hour
- ✅ Support 10,000 tenants without degradation

---

## Open Questions for Sable

### High Priority

1. **RLS vs Application-Level Filtering:**
   - Should we use PostgreSQL RLS, application-level filtering, or both?
   - What's your recommendation for defense-in-depth vs performance?

2. **TimescaleDB Adoption:**
   - Should we start with TimescaleDB or plain PostgreSQL?
   - What's the migration path if we start with PostgreSQL?

3. **Multi-Tenant Isolation Testing:**
   - How do we test for cross-tenant data leaks comprehensively?
   - Should we build automated security tests into CI/CD?

### Medium Priority

4. **Partitioning Strategy:**
   - Manual partitions, pg_partman, or declarative partitioning?
   - What's your experience with partition management at scale?

5. **Read Replica Architecture:**
   - At what scale should we introduce read replicas?
   - How do we handle replication lag for real-time dashboards?

6. **Caching Strategy:**
   - Redis for application-level cache vs PostgreSQL materialized views?
   - How do we handle cache invalidation across services?

### Low Priority

7. **Audit Event Hashing:**
   - Is blockchain-style hashing overkill for audit logs?
   - What's the minimum compliance requirement?

8. **Monitoring & Alerting:**
   - What should we monitor for multi-tenant data architecture?
   - What alerts indicate security issues vs performance issues?

---

## Next Steps

**Immediate (Today):**
1. ✅ Send this proposal to Sable for review
2. ⏳ Create initial schema migration files
3. ⏳ Set up local development database

**This Week:**
1. ⏳ Implement core tables with RLS
2. ⏳ Build basic ingestion API
3. ⏳ Test multi-tenant isolation
4. ⏳ Coordinate with Yuki on infrastructure

**Next Week:**
1. ⏳ Deploy to staging environment
2. ⏳ Load testing with simulated tenant data
3. ⏳ Security audit of isolation mechanisms
4. ⏳ Performance benchmarking

---

## Approval Checklist

**Before Implementation:**
- [ ] Sable approves multi-tenant isolation approach
- [ ] Yuki confirms database infrastructure (PostgreSQL vs TimescaleDB)
- [ ] Marcus confirms retention policies align with compliance requirements
- [ ] Security team reviews RLS policies (if applicable)

**After Implementation:**
- [ ] Security testing confirms zero cross-tenant leaks
- [ ] Performance testing confirms <100ms dashboard queries
- [ ] Load testing confirms 10k+ tenant scalability
- [ ] Documentation completed for maintenance team

---

**Status:** Awaiting Sable's architectural review and feedback

**Timeline:** Need approval by Tuesday EOD to stay on schedule

**Contact:** Gray Sutton, Data Engineer
