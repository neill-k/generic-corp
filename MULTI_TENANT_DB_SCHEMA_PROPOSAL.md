# Multi-Tenant Database Schema - Proposal for Review

**Date:** January 26, 2026
**Prepared by:** DeVonte Jackson
**For Review by:** Sable Chen (Architecture/Security), Yuki Tanaka (Infrastructure)

---

## 🎯 OBJECTIVE

Design a multi-tenant database architecture that:
- ✅ Isolates customer data securely
- ✅ Scales efficiently with our pricing tiers
- ✅ Enables usage tracking and billing
- ✅ Maintains performance at scale
- ✅ Supports our 6-week launch timeline

---

## 🏗️ PROPOSED APPROACH: SHARED DATABASE WITH TENANT ISOLATION

### Why This Approach?

**Considered Options:**
1. **Database-per-tenant** (too expensive, complex management)
2. **Schema-per-tenant** (better isolation, still complex)
3. **Shared database with tenant_id** (best balance for MVP) ✅

**Recommendation:** Shared database with row-level tenant_id isolation

**Rationale:**
- ✅ **Cost-effective:** Single database to manage
- ✅ **Simple operations:** One backup, one migration
- ✅ **Fast to implement:** 2-3 days vs 1-2 weeks
- ✅ **Scales to 100-500 tenants:** Sufficient for first 6 months
- ✅ **Migration path:** Can move large tenants to dedicated DB later

---

## 📊 SCHEMA DESIGN

### Core Tables

#### 1. Tenants Table (Organization/Company)
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  plan_tier VARCHAR(50) NOT NULL, -- 'free', 'starter', 'pro', 'enterprise'
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'cancelled'

  -- Resource limits per tier
  max_agents INT NOT NULL,
  max_tasks_per_month INT NOT NULL,
  max_concurrent_workflows INT NOT NULL,

  -- Billing
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP NULL -- Soft deletes
);

-- Indexes
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
```

#### 2. Users Table (Individual accounts)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Auth (via Clerk)
  clerk_user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),

  -- Role-based access
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX idx_users_email ON users(email);

-- Constraint: Email unique per tenant
CREATE UNIQUE INDEX idx_users_email_tenant ON users(tenant_id, email);
```

#### 3. Workflows Table (Agent orchestration flows)
```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Workflow definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'paused', 'archived'

  -- Configuration (stored as JSONB for flexibility)
  config JSONB NOT NULL,

  -- Temporal integration
  temporal_workflow_id VARCHAR(255),
  temporal_namespace VARCHAR(255),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflows_tenant_id ON workflows(tenant_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_temporal_id ON workflows(temporal_workflow_id);
```

#### 4. Workflow Executions Table (Runs/instances)
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

  -- Execution details
  status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Input/output
  input JSONB,
  output JSONB,
  error TEXT,

  -- Temporal tracking
  temporal_workflow_id VARCHAR(255),
  temporal_run_id VARCHAR(255),

  -- Usage tracking for billing
  agent_minutes_consumed DECIMAL(10, 2) DEFAULT 0,
  task_count INT DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_executions_tenant_id ON workflow_executions(tenant_id);
CREATE INDEX idx_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_status ON workflow_executions(status);
CREATE INDEX idx_executions_created_at ON workflow_executions(created_at);
```

#### 5. Usage Tracking Table (For billing)
```sql
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'workflow_started', 'agent_minute', 'task_completed'
  resource_id UUID, -- Reference to workflow_execution, agent, etc.

  -- Usage metrics
  agent_minutes DECIMAL(10, 2),
  task_count INT,
  api_calls INT,

  -- Timestamp
  occurred_at TIMESTAMP DEFAULT NOW(),

  -- Aggregation tracking
  billing_period VARCHAR(50), -- 'YYYY-MM' for monthly aggregation
  processed BOOLEAN DEFAULT FALSE
);

-- Indexes (critical for billing queries)
CREATE INDEX idx_usage_tenant_id ON usage_events(tenant_id);
CREATE INDEX idx_usage_billing_period ON usage_events(billing_period);
CREATE INDEX idx_usage_occurred_at ON usage_events(occurred_at);
CREATE INDEX idx_usage_processed ON usage_events(processed);
```

#### 6. API Keys Table (Authentication)
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Key details
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed, never store plain
  key_prefix VARCHAR(20), -- First few chars for identification

  -- Permissions
  scopes JSONB, -- ['workflows:read', 'workflows:write', etc.]

  -- Security
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  revoked_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

---

## 🔒 SECURITY MEASURES

### 1. Row-Level Security (RLS)
```sql
-- Enable RLS on all tenant tables
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's data
CREATE POLICY tenant_isolation ON workflows
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation ON workflow_executions
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### 2. Application-Level Enforcement
```javascript
// Middleware to set tenant context
export function tenantContext(req, res, next) {
  const user = req.auth.user // From Clerk
  const tenantId = user.tenantId

  // Set tenant context for database queries
  req.tenantId = tenantId

  // Set PostgreSQL session variable for RLS
  await db.query('SET app.current_tenant_id = $1', [tenantId])

  next()
}

// All queries automatically filtered by tenant_id
const workflows = await db.query('SELECT * FROM workflows WHERE user_id = $1', [userId])
// RLS ensures only current tenant's workflows are returned
```

### 3. Tenant Isolation Checks
```javascript
// Before any write operation
function validateTenantAccess(resourceTenantId, userTenantId) {
  if (resourceTenantId !== userTenantId) {
    throw new Error('Unauthorized: Tenant mismatch')
  }
}
```

---

## 📈 RESOURCE LIMITS ENFORCEMENT

### Tier-Based Limits
```javascript
const PLAN_LIMITS = {
  free: {
    max_agents: 10,
    max_tasks_per_month: 1000,
    max_concurrent_workflows: 2
  },
  starter: {
    max_agents: 50,
    max_tasks_per_month: 10000,
    max_concurrent_workflows: 10
  },
  pro: {
    max_agents: 100,
    max_tasks_per_month: 100000,
    max_concurrent_workflows: 50
  },
  enterprise: {
    max_agents: -1, // Unlimited
    max_tasks_per_month: -1,
    max_concurrent_workflows: -1
  }
}
```

### Enforcement Middleware
```javascript
async function checkTenantLimits(tenantId, resourceType) {
  const tenant = await db.tenants.findUnique({ where: { id: tenantId } })
  const limits = PLAN_LIMITS[tenant.plan_tier]

  if (resourceType === 'workflow') {
    const activeCount = await db.workflows.count({
      where: { tenant_id: tenantId, status: 'active' }
    })

    if (activeCount >= limits.max_concurrent_workflows) {
      throw new Error('Workflow limit reached for your plan')
    }
  }

  // Similar checks for agents, tasks, etc.
}
```

---

## 📊 USAGE TRACKING & BILLING

### Real-Time Usage Aggregation
```javascript
// Track usage event
async function recordUsage(tenantId, eventType, metrics) {
  await db.usage_events.create({
    data: {
      tenant_id: tenantId,
      event_type: eventType,
      agent_minutes: metrics.agentMinutes,
      task_count: metrics.taskCount,
      occurred_at: new Date(),
      billing_period: format(new Date(), 'yyyy-MM')
    }
  })
}

// Monthly aggregation for billing
async function getMonthlyUsage(tenantId, month) {
  const result = await db.usage_events.aggregate({
    where: {
      tenant_id: tenantId,
      billing_period: month
    },
    _sum: {
      agent_minutes: true,
      task_count: true
    }
  })

  return {
    agentMinutes: result._sum.agent_minutes || 0,
    taskCount: result._sum.task_count || 0
  }
}
```

---

## 🚀 MIGRATION STRATEGY

### Phase 1: Initial Schema (Week 1)
- Create core tables (tenants, users, workflows)
- Set up RLS policies
- Add basic indexes

### Phase 2: Usage Tracking (Week 2)
- Add usage_events table
- Implement tracking middleware
- Set up aggregation queries

### Phase 3: Optimization (Week 3-4)
- Add additional indexes based on query patterns
- Implement caching layer (Redis)
- Set up read replicas if needed

### Phase 4: Scale Preparation (Week 5-6)
- Partition large tables (usage_events by month)
- Implement archival strategy
- Set up monitoring and alerts

---

## 🔍 MONITORING & OBSERVABILITY

### Key Metrics to Track
```javascript
// Database metrics
- Query performance per tenant
- Table size growth
- Index usage
- Connection pool usage

// Tenant metrics
- Active tenants count
- Tenants by plan tier
- Resource usage per tenant
- API call frequency

// Security metrics
- Failed authentication attempts
- Cross-tenant access attempts (should be 0)
- API key usage patterns
```

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Tenant data leakage** | CRITICAL | RLS + app-level checks + automated testing |
| **Large tenant impacts performance** | HIGH | Query limits + rate limiting + separate namespace |
| **Database size growth** | MEDIUM | Archival strategy + partitioning |
| **Migration complexity** | MEDIUM | Phased rollout + rollback plan |

---

## 🎯 OPEN QUESTIONS FOR REVIEW

### For Sable (Architecture/Security):
1. **RLS vs App-Level Only:** Should we enforce RLS at DB level, or is application-level sufficient?
2. **Sensitive Data Encryption:** Should we encrypt workflow configs (JSONB fields) at rest?
3. **Audit Logging:** Do we need an audit_log table for compliance?
4. **API Rate Limiting:** Per-tenant or per-user? Leaky bucket vs token bucket?

### For Yuki (Infrastructure):
1. **Database Choice:** Stick with PostgreSQL or consider alternatives?
2. **Backup Strategy:** Daily snapshots sufficient or need continuous backup?
3. **Read Replicas:** When should we add read replicas? Week 3? Week 6?
4. **Connection Pooling:** PgBouncer or built-in? What pool size per tier?

### For Both:
1. **Timeline:** Can we complete Phase 1 (core tables) by Wednesday?
2. **Testing:** What level of automated testing do you want before production?
3. **Rollback Plan:** What's our rollback strategy if migration fails?

---

## ✅ NEXT STEPS

### Immediate (pending approval):
1. **Get Sable's security signoff** (mandatory per Marcus)
2. **Sync with Yuki on infrastructure** (DB setup, backups)
3. **Create Prisma schema** (translate SQL to Prisma ORM)
4. **Write migration scripts** (up/down migrations)
5. **Set up test database** (for validation before prod)

### This Week (Days 2-3):
1. **Implement core tables** (tenants, users, workflows)
2. **Add RLS policies** (if approved by Sable)
3. **Create seed data** (for testing)
4. **Write integration tests** (tenant isolation tests)

### Next Week (Days 8-10):
1. **Deploy to staging** (test with real data)
2. **Performance testing** (simulate 50-100 tenants)
3. **Security audit** (attempt cross-tenant access)
4. **Production deployment** (gradual rollout)

---

## 📞 FEEDBACK REQUESTED

**Sable:** Please review security measures and RLS approach. Any concerns or additional recommendations?

**Yuki:** Please review infrastructure requirements and timeline. Feasible to start Monday?

**Marcus:** Any business requirements I'm missing? Billing/analytics needs?

---

## 💬 DECISION TIMELINE

- **Review Period:** Monday-Tuesday (Jan 27-28)
- **Implementation Start:** Wednesday (Jan 29) - pending approval
- **Target Completion:** Friday (Jan 31)

This gives 2 days for review/feedback before I start implementation.

---

**DeVonte Jackson**
Full-Stack Developer, Generic Corp

*"Secure, scalable, and shipped on time."*
