# Multi-Agent Orchestration Platform - MVP Technical Specification

**Version:** 1.0
**Date:** January 26, 2026
**Author:** Sable Chen, Principal Engineer
**Status:** 🟢 APPROVED FOR IMPLEMENTATION

---

## Executive Summary

This document specifies the technical architecture, implementation plan, and security model for Generic Corp's Multi-Agent Orchestration Platform MVP.

**Timeline:** 3 weeks to public beta launch
**Target:** Production-ready, secure, scalable SaaS platform
**Confidence:** High (85-90%) - leveraging 80% existing infrastructure

---

## 1. Current State Assessment

### 1.1 Existing Infrastructure (80% Complete)

**✅ PRODUCTION-READY COMPONENTS:**

1. **Database Layer**
   - PostgreSQL with Prisma ORM
   - Schema includes: Agents, Tasks, Messages, ActivityLogs, Sessions, Schedules
   - Provider accounts with OAuth integration
   - Encrypted credential storage

2. **Orchestration Engine**
   - Temporal.io workflow engine (production-grade)
   - BullMQ job queuing with Redis
   - Event-driven architecture (EventBus)
   - Task dependency management

3. **Security & Authentication**
   - OAuth integration system (GitHub, OpenAI, Google)
   - Encrypted credential proxy
   - Helmet security middleware
   - TLS/HTTPS ready

4. **API Infrastructure**
   - Express.js REST API
   - WebSocket (Socket.io) for real-time
   - Prometheus metrics endpoint
   - Rate limiting middleware (production.js)

5. **Provider Integrations**
   - GitHub Copilot
   - OpenAI Codex
   - Google Code Assist
   - Abstraction layer for multi-provider support

6. **Monitoring & Observability**
   - Prometheus metrics
   - Structured logging
   - Health check endpoints
   - Activity logging

### 1.2 What Needs to Be Built (20% Remaining)

**⚠️ CRITICAL PATH ITEMS:**

1. **Multi-Tenant Infrastructure** (Week 1 - 3-4 days)
   - Tenant context middleware
   - Tenant provisioning system
   - Per-tenant rate limiting
   - Tenant isolation security layer

2. **API Authentication & Authorization** (Week 1-2 - 2-3 days)
   - JWT-based authentication
   - API key management
   - Role-based access control (RBAC)
   - Tenant-scoped queries

3. **Usage Metering & Billing** (Week 2 - 2-3 days)
   - Execution counting per tenant
   - Usage quota enforcement
   - Stripe integration (DeVonte)
   - Usage analytics pipeline (Graham)

4. **Production Deployment** (Week 2-3 - 3-4 days)
   - Kubernetes manifests (Yuki)
   - CI/CD pipeline
   - Environment configuration
   - Secrets management

5. **Security Hardening** (Week 3 - 2-3 days)
   - Multi-tenant isolation testing
   - Security audit (Sable + Yuki)
   - Penetration testing
   - Load testing

6. **Developer Documentation** (Week 2-3 - ongoing)
   - API reference
   - Quickstart guides
   - SDK examples
   - Webhooks documentation

---

## 2. Multi-Tenant Architecture Design

### 2.1 Tenancy Model: SCHEMA-BASED ISOLATION

**Decision:** Single database, schema-per-tenant approach with tenant_id on all tables.

**Rationale:**
- ✅ Fast to implement (3-4 days vs weeks for separate DBs)
- ✅ Cost-effective at our scale (0-1000 tenants)
- ✅ Easier to manage and backup
- ✅ Maintains data isolation with proper middleware
- ✅ Allows cross-tenant analytics for platform health

**Implementation:**

```typescript
// 1. Add tenant_id to all domain tables
model Agent {
  id        String  @id @default(uuid())
  tenantId  String  @map("tenant_id")  // NEW
  name      String
  role      String
  // ... existing fields

  tenant    Tenant  @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, name])  // Unique within tenant
  @@index([tenantId])
  @@map("agents")
}

model Task {
  id        String  @id @default(uuid())
  tenantId  String  @map("tenant_id")  // NEW
  // ... existing fields

  tenant    Tenant  @relation(fields: [tenantId], references: [id])

  @@index([tenantId, status])
  @@index([tenantId, agentId])
  @@map("tasks")
}

// 2. Create Tenant management table
model Tenant {
  id                String    @id @default(uuid())
  name              String    @unique
  slug              String    @unique  // For subdomain: slug.genericcorp.com
  status            String    @default("active")  // active, suspended, deleted

  // Plan & Limits
  plan              String    @default("free")  // free, pro, enterprise
  monthlyExecLimit  Int       @default(1000)    // Executions per month
  monthlyExecUsed   Int       @default(0)

  // Billing
  stripeCustomerId  String?   @map("stripe_customer_id")
  stripeSubscriptionId String? @map("stripe_subscription_id")

  // Metadata
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")
  suspendedAt       DateTime? @map("suspended_at")

  // Relations
  agents            Agent[]
  tasks             Task[]
  messages          Message[]
  activityLogs      ActivityLog[]
  sessions          AgentSession[]
  users             TenantUser[]

  @@map("tenants")
}

// 3. User management (for multi-user teams)
model TenantUser {
  id        String   @id @default(uuid())
  tenantId  String   @map("tenant_id")
  email     String
  role      String   @default("member")  // owner, admin, member
  createdAt DateTime @default(now()) @map("created_at")

  tenant    Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([tenantId, email])
  @@map("tenant_users")
}
```

### 2.2 Tenant Context Middleware

**Critical Security Layer** - All requests must be scoped to a tenant.

```typescript
// src/middleware/tenantContext.ts

import { Request, Response, NextFunction } from 'express';
import { db } from '../db/index.js';
import jwt from 'jsonwebtoken';

export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    slug: string;
    plan: string;
    monthlyExecLimit: number;
    monthlyExecUsed: number;
  };
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Extract tenant context from:
 * 1. Subdomain (slug.genericcorp.com)
 * 2. JWT token (for API keys)
 * 3. X-Tenant-ID header (for debugging, admin only)
 */
export async function tenantContext(
  req: TenantRequest,
  res: Response,
  next: NextFunction
) {
  try {
    let tenantId: string | null = null;

    // Method 1: Extract from subdomain
    const host = req.headers.host || '';
    const subdomain = extractSubdomain(host);

    if (subdomain) {
      const tenant = await db.tenant.findUnique({
        where: { slug: subdomain },
        select: {
          id: true,
          slug: true,
          plan: true,
          status: true,
          monthlyExecLimit: true,
          monthlyExecUsed: true,
        },
      });

      if (tenant) {
        if (tenant.status !== 'active') {
          return res.status(403).json({
            error: 'Tenant account is suspended',
          });
        }
        req.tenant = tenant;
        return next();
      }
    }

    // Method 2: Extract from JWT (API key authentication)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      const tenant = await db.tenant.findUnique({
        where: { id: decoded.tenantId },
        select: {
          id: true,
          slug: true,
          plan: true,
          status: true,
          monthlyExecLimit: true,
          monthlyExecUsed: true,
        },
      });

      if (!tenant || tenant.status !== 'active') {
        return res.status(403).json({
          error: 'Invalid or suspended tenant',
        });
      }

      req.tenant = tenant;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
      return next();
    }

    // No tenant context found
    return res.status(401).json({
      error: 'Tenant context required. Use subdomain or API key.',
    });
  } catch (error) {
    console.error('[Middleware] Tenant context error:', error);
    return res.status(500).json({ error: 'Failed to authenticate' });
  }
}

function extractSubdomain(host: string): string | null {
  // localhost: no subdomain
  if (host.startsWith('localhost')) return null;

  // Extract subdomain from: slug.genericcorp.com
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}
```

### 2.3 Tenant-Scoped Database Queries

**CRITICAL:** All Prisma queries MUST filter by tenantId.

```typescript
// ❌ WRONG - Missing tenant filter
const agents = await db.agent.findMany();

// ✅ CORRECT - Tenant-scoped
const agents = await db.agent.findMany({
  where: { tenantId: req.tenant!.id },
});
```

**Enforcement Strategy:**
1. Middleware sets `req.tenant` on every request
2. All API routes validate `req.tenant` exists
3. All database queries include `tenantId: req.tenant.id`
4. Integration tests verify cross-tenant isolation

---

## 3. API Authentication & Authorization

### 3.1 Authentication Methods

**1. JWT-Based API Keys** (Primary for developers)

```typescript
// POST /api/auth/keys (create API key)
{
  "name": "Production API Key",
  "scopes": ["agents:read", "agents:write", "tasks:*"]
}

// Response
{
  "keyId": "key_abc123",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "scopes": ["agents:read", "agents:write", "tasks:*"],
  "createdAt": "2026-01-26T10:00:00Z"
}

// Usage
curl -H "Authorization: Bearer eyJhbG..." \
  https://api.genericcorp.com/v1/agents
```

**2. Session-Based Auth** (For dashboard UI)

```typescript
// POST /api/auth/login
{
  "email": "user@example.com",
  "password": "..."
}

// Response - Sets HTTP-only cookie
Set-Cookie: session=...; HttpOnly; Secure; SameSite=Strict
```

### 3.2 Authorization Model (RBAC)

**Roles:**
- `owner` - Full access, billing, team management
- `admin` - All resources, no billing access
- `member` - Read agents/tasks, create tasks
- `readonly` - Read-only access

**Scope-Based Permissions:**
```
agents:read
agents:write
tasks:read
tasks:write
tasks:execute
usage:read
billing:read
billing:write
```

### 3.3 Rate Limiting Per Tenant

```typescript
// src/middleware/rateLimiting.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../services/redis-client.js';

export const tenantRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'ratelimit:',
  }),

  // Tier-based limits
  max: (req: TenantRequest) => {
    const plan = req.tenant?.plan || 'free';
    return {
      free: 100,        // 100 req/min
      pro: 1000,        // 1000 req/min
      enterprise: 10000 // 10k req/min
    }[plan] || 100;
  },

  windowMs: 60 * 1000, // 1 minute

  keyGenerator: (req: TenantRequest) => {
    return `tenant:${req.tenant!.id}`;
  },

  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      limit: req.rateLimit?.limit,
      remaining: req.rateLimit?.remaining,
      resetAt: new Date(Date.now() + 60000).toISOString(),
    });
  },
});
```

---

## 4. API Design (REST v1)

### 4.1 API Endpoints Specification

**Base URL:** `https://api.genericcorp.com/v1`

#### Authentication
```
POST   /auth/register      # Create new tenant account
POST   /auth/login         # Login (session)
POST   /auth/logout        # Logout
POST   /auth/keys          # Create API key
GET    /auth/keys          # List API keys
DELETE /auth/keys/:id      # Revoke API key
```

#### Agents
```
GET    /agents             # List agents (tenant-scoped)
POST   /agents             # Create agent
GET    /agents/:id         # Get agent details
PATCH  /agents/:id         # Update agent
DELETE /agents/:id         # Delete agent (soft delete)
GET    /agents/:id/tasks   # List agent tasks
GET    /agents/:id/stats   # Agent execution stats
```

#### Tasks
```
GET    /tasks              # List tasks
POST   /tasks              # Create task
GET    /tasks/:id          # Get task details
PATCH  /tasks/:id          # Update task
DELETE /tasks/:id          # Cancel task
POST   /tasks/:id/execute  # Execute task
GET    /tasks/:id/logs     # Task execution logs
```

#### Orchestration (NEW - Core value prop)
```
POST   /orchestrations           # Create multi-agent workflow
GET    /orchestrations           # List workflows
GET    /orchestrations/:id       # Get workflow status
POST   /orchestrations/:id/pause # Pause workflow
POST   /orchestrations/:id/resume # Resume workflow
DELETE /orchestrations/:id        # Cancel workflow
```

#### Usage & Billing
```
GET    /usage                    # Current month usage
GET    /usage/history           # Historical usage
GET    /billing/subscription    # Subscription details
POST   /billing/subscription    # Update subscription
GET    /billing/invoices        # List invoices
```

#### Webhooks
```
POST   /webhooks                # Create webhook
GET    /webhooks                # List webhooks
GET    /webhooks/:id            # Get webhook
PATCH  /webhooks/:id            # Update webhook
DELETE /webhooks/:id            # Delete webhook
POST   /webhooks/:id/test       # Test webhook
```

### 4.2 API Response Format

**Success Response:**
```json
{
  "data": {
    "id": "agent_abc123",
    "name": "code-reviewer",
    "status": "idle"
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-01-26T10:30:00Z"
  }
}
```

**Error Response:**
```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent with ID 'agent_abc123' not found",
    "details": {},
    "requestId": "req_xyz789"
  }
}
```

**List Response (Paginated):**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 234,
    "hasMore": true
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

---

## 5. Security Architecture

### 5.1 Multi-Tenant Data Isolation

**Threats:**
1. Cross-tenant data access (CRITICAL)
2. Tenant enumeration attacks
3. Quota bypass
4. Privilege escalation

**Mitigations:**

**Layer 1: Middleware Enforcement**
```typescript
// All API routes require tenantContext middleware
app.use('/api', tenantContext);
app.use('/api', tenantRateLimiter);
```

**Layer 2: Query-Level Filtering**
```typescript
// Prisma middleware (global enforcement)
db.$use(async (params, next) => {
  // Skip for Tenant model itself
  if (params.model === 'Tenant') return next(params);

  // Ensure tenantId filter exists
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args.where?.tenantId) {
      throw new Error('SECURITY: Missing tenantId filter');
    }
  }

  return next(params);
});
```

**Layer 3: Integration Testing**
```typescript
// Test cross-tenant isolation
describe('Tenant Isolation', () => {
  it('prevents cross-tenant agent access', async () => {
    const tenant1Agent = await createAgent(tenant1);
    const tenant2Token = await getToken(tenant2);

    const res = await request(app)
      .get(`/api/agents/${tenant1Agent.id}`)
      .set('Authorization', `Bearer ${tenant2Token}`);

    expect(res.status).toBe(404); // Should not find
  });
});
```

### 5.2 Security Checklist

**Pre-Launch Security Audit:**

- [ ] Multi-tenant isolation tests (all endpoints)
- [ ] SQL injection prevention (Prisma ORM)
- [ ] XSS prevention (input sanitization)
- [ ] CSRF protection (tokens)
- [ ] Rate limiting per tenant
- [ ] API key rotation capability
- [ ] Encrypted credentials at rest
- [ ] TLS 1.3 for all connections
- [ ] Security headers (Helmet.js)
- [ ] Audit logging for sensitive actions
- [ ] Dependency vulnerability scan
- [ ] Container security scan
- [ ] Secrets not in code/env files
- [ ] Database backups encrypted
- [ ] Incident response plan documented

---

## 6. Implementation Timeline

### Week 1: Foundation Sprint (Jan 26 - Feb 1)

**Sable (Principal Engineer):**
- [ ] Day 1-2: Database schema migration (add Tenant model, tenant_id to all tables)
- [ ] Day 2-3: Tenant context middleware implementation
- [ ] Day 3-4: Authentication system (JWT, API keys)
- [ ] Day 4-5: Update all existing APIs with tenant scoping
- [ ] Day 5: Code review & security validation

**Yuki (SRE):**
- [ ] Day 1-2: Audit current infrastructure, identify gaps
- [ ] Day 2-3: Rate limiting implementation
- [ ] Day 3-4: Monitoring setup (tenant-specific metrics)
- [ ] Day 4-5: Load testing harness setup

**Deliverables:**
- ✅ Multi-tenant database schema migrated
- ✅ Tenant context middleware working
- ✅ API authentication functional
- ✅ Technical specification finalized

### Week 2: Build Sprint (Feb 2 - Feb 8)

**Sable:**
- [ ] Day 6-7: Orchestration API endpoints (workflows)
- [ ] Day 7-8: Usage metering implementation
- [ ] Day 8-9: Webhook system
- [ ] Day 9-10: Integration test suite

**Yuki:**
- [ ] Day 6-7: Kubernetes deployment manifests
- [ ] Day 7-8: CI/CD pipeline (GitHub Actions)
- [ ] Day 8-9: Production environment setup
- [ ] Day 9-10: Secrets management integration

**DeVonte (Frontend/Product):**
- [ ] Day 6-8: Landing page + docs site
- [ ] Day 8-10: Stripe integration

**Graham (Analytics):**
- [ ] Day 6-8: Usage analytics pipeline
- [ ] Day 8-10: Developer documentation

**Deliverables:**
- ✅ MVP API complete
- ✅ Usage metering working
- ✅ Deployment pipeline ready
- ✅ Landing page live

### Week 3: Launch Sprint (Feb 9 - Feb 15)

**Sable + Yuki:**
- [ ] Day 11-12: Security audit (multi-tenant isolation)
- [ ] Day 12-13: Load testing & performance tuning
- [ ] Day 13: Production deployment
- [ ] Day 14: Beta user testing
- [ ] Day 15: PUBLIC BETA LAUNCH 🚀

**Deliverables:**
- ✅ Security audit complete
- ✅ Load tests passing
- ✅ Production deployed
- ✅ Public beta live

---

## 7. Testing Strategy

### 7.1 Unit Tests
- All middleware functions
- Authentication logic
- Usage metering calculations
- Tenant provisioning

### 7.2 Integration Tests
- **Cross-tenant isolation (CRITICAL)**
- API endpoint authorization
- Rate limiting enforcement
- Webhook delivery

### 7.3 Load Tests
- 100 concurrent tenants
- 1000 requests/second
- Database query performance
- Memory leak detection

### 7.4 Security Tests
- SQL injection attempts
- XSS payloads
- CSRF attacks
- Rate limit bypass attempts
- Privilege escalation

---

## 8. Monitoring & Observability

### 8.1 Key Metrics (Per Tenant)

**Request Metrics:**
```
http_requests_total{tenant_id, endpoint, method, status}
http_request_duration_seconds{tenant_id, endpoint}
http_errors_total{tenant_id, error_type}
```

**Usage Metrics:**
```
agent_executions_total{tenant_id}
agent_executions_duration_seconds{tenant_id}
usage_quota_remaining{tenant_id}
```

**Infrastructure Metrics:**
```
db_query_duration_seconds{query_type}
db_connections_active
redis_operations_total{tenant_id}
temporal_workflow_executions{tenant_id}
```

### 8.2 Alerts

**Critical (Page On-Call):**
- Error rate > 5% for any tenant
- Response time P95 > 2 seconds
- Database connection pool > 90%
- Any tenant quota exhausted without upgrade

**Warning (Slack):**
- Error rate > 2%
- Response time P95 > 1 second
- Unusual request spike (possible attack)

---

## 9. Risk Mitigation

### 9.1 Technical Risks

| Risk | Severity | Mitigation | Owner |
|------|----------|------------|-------|
| Cross-tenant data leak | CRITICAL | Multi-layer isolation + comprehensive testing | Sable |
| Performance bottleneck | HIGH | Load testing, caching, read replicas | Yuki |
| Authentication bypass | CRITICAL | Security audit, penetration testing | Sable |
| Database migration failure | MEDIUM | Backup before migration, rollback plan | Yuki |
| Stripe integration issues | MEDIUM | Sandbox testing, error handling | DeVonte |

### 9.2 Schedule Risks

| Risk | Mitigation |
|------|------------|
| Scope creep | Ruthless MVP focus, defer non-essentials |
| Technical blocker | Daily standups, immediate escalation |
| Testing takes longer | Start testing in Week 2, not Week 3 |
| Team capacity | Pre-identify backup resources |

---

## 10. Success Criteria

### 10.1 Technical Goals

- [ ] All API endpoints tenant-scoped
- [ ] Zero cross-tenant data leaks in testing
- [ ] API response time P95 < 500ms
- [ ] 99.9% uptime SLA capable
- [ ] Handles 100 concurrent tenants
- [ ] Load tested to 1000 req/sec

### 10.2 Security Goals

- [ ] Security audit passed (Sable + Yuki)
- [ ] All checklist items completed
- [ ] Automated security tests in CI/CD
- [ ] Incident response plan documented

### 10.3 Launch Goals

- [ ] Public beta live by Feb 15
- [ ] Documentation complete
- [ ] 10 beta customers onboarded
- [ ] First API calls successful

---

## 11. Post-Launch Roadmap

### Month 2 (Feb 16 - Mar 15)
- SOC 2 Type 1 preparation
- Advanced RBAC features
- Webhook retry logic
- SDK libraries (Python, Node.js)

### Month 3 (Mar 16 - Apr 15)
- Multi-region deployment
- Advanced analytics dashboard
- Enterprise features (SSO, SAML)
- Partner API integrations

---

## Appendix A: Database Migration Plan

```sql
-- Migration: Add multi-tenancy support
-- Date: 2026-01-26
-- Author: Sable Chen

-- 1. Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(63) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  plan VARCHAR(50) DEFAULT 'free',
  monthly_exec_limit INTEGER DEFAULT 1000,
  monthly_exec_used INTEGER DEFAULT 0,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  suspended_at TIMESTAMP
);

-- 2. Create tenant_users table
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- 3. Add tenant_id to existing tables
ALTER TABLE agents ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE tasks ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE messages ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE activity_logs ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE agent_sessions ADD COLUMN tenant_id UUID REFERENCES tenants(id);

-- 4. Create default tenant for existing data
INSERT INTO tenants (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Tenant', 'default', 'enterprise');

-- 5. Update existing records
UPDATE agents SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE tasks SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE messages SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE activity_logs SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;
UPDATE agent_sessions SET tenant_id = '00000000-0000-0000-0000-000000000000' WHERE tenant_id IS NULL;

-- 6. Make tenant_id NOT NULL
ALTER TABLE agents ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE tasks ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE activity_logs ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE agent_sessions ALTER COLUMN tenant_id SET NOT NULL;

-- 7. Add indexes for performance
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_activity_logs_tenant_id ON activity_logs(tenant_id);

-- 8. Add unique constraints (tenant-scoped uniqueness)
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_name_key;
ALTER TABLE agents ADD CONSTRAINT agents_tenant_name_unique UNIQUE(tenant_id, name);
```

---

## Appendix B: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/genericcorp

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=<generated-secret>
JWT_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=<32-byte-hex-key>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid/Postmark)
EMAIL_API_KEY=...
EMAIL_FROM=noreply@genericcorp.com

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info

# Feature Flags
ENABLE_WEBHOOKS=true
ENABLE_USAGE_METERING=true
```

---

## Approval & Sign-Off

**Technical Lead:** Sable Chen ✅
**Infrastructure Lead:** Yuki Tanaka (pending)
**CEO:** Marcus Bell ✅

**Status:** APPROVED FOR IMPLEMENTATION
**Next Action:** Architecture sync with Yuki (tomorrow AM)

---

*This is a living document. Updates will be tracked in Git history.*
