# Multi-Tenant SaaS Architecture - Analysis & Migration Plan

**Author**: Sable Chen, Principal Engineer
**Date**: January 26, 2026
**Priority**: CRITICAL (Week 1 Deliverable)
**Status**: Architecture Review - Awaiting Strategic Decisions

---

## Executive Summary

Our current architecture is **single-tenant** with no isolation mechanisms. To support the SaaS revenue strategy ($49-$149/mo tiers), we need a **complete multi-tenant redesign**. This is not a small refactor - it's a foundational architectural change affecting every layer of the stack.

**Timeline Impact**: 2-3 weeks for proper multi-tenant migration
**Risk Level**: HIGH - Security, data isolation, scalability all at stake
**Recommendation**: Row-level multi-tenancy with clear phase-based rollout

---

## Current Architecture Assessment

### ✅ What Works (Keep These)
- **Infrastructure**: Docker, PostgreSQL 16, Redis 7 - solid foundation
- **Orchestration**: BullMQ + Temporal setup - scalable
- **Real-time**: WebSocket (Socket.io) - proven pattern
- **Agent SDK**: Claude Agent SDK integration - competitive advantage
- **API Design**: RESTful patterns, clean separation of concerns

### ❌ Critical Gaps (Must Fix)

#### 1. **Database Schema - Zero Tenant Isolation**
```sql
-- CURRENT: No tenant field anywhere
model Agent {
  id          String  @id
  name        String  @unique  -- ⚠️ GLOBAL uniqueness
  // No organizationId or tenantId
}

model Task {
  id          String  @id
  agentId     String
  // No tenant isolation - any agent can see any task
}
```

**Problem**: All data is globally shared. Customer A can see Customer B's agents, tasks, and messages.

#### 2. **API Layer - No Authentication/Authorization**
```typescript
// CURRENT: No auth checks
app.get("/api/agents", async (_req, res) => {
  const agents = await db.agent.findMany({
    where: { deletedAt: null },  // Returns ALL agents
  });
});
```

**Problem**: No user context, no API keys, no tenant filtering.

#### 3. **Agent Execution - No Resource Isolation**
- All agents share same database connection pool
- No per-tenant rate limiting
- No per-tenant token budgets
- No cost attribution

#### 4. **WebSocket - No Session Management**
- No authentication on WebSocket connections
- Events broadcast globally (no tenant filtering)
- No tenant-specific rooms

---

## Multi-Tenant Architecture Options

### Option 1: Row-Level Tenancy (RECOMMENDED)
**Pattern**: Shared database, shared schema, tenant ID in every table

```prisma
model Organization {
  id            String   @id @default(uuid())
  slug          String   @unique  // e.g., "acme-corp"
  name          String
  plan          Plan     // starter, pro, enterprise
  stripeCustomerId String?

  users         User[]
  agents        Agent[]
  tasks         Task[]
  subscriptions Subscription[]
}

model User {
  id             String  @id @default(uuid())
  organizationId String
  email          String  @unique
  role           Role    // owner, admin, member

  organization   Organization @relation(fields: [organizationId], references: [id])
  apiKeys        ApiKey[]
}

model Agent {
  id             String  @id @default(uuid())
  organizationId String  // 🔑 TENANT ISOLATION
  name           String  // No longer globally unique

  organization   Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, name])  // Unique within tenant
  @@index([organizationId])         // Fast tenant queries
}
```

**Pros**:
- ✅ Simplest to implement and maintain
- ✅ Cost-efficient (shared infrastructure)
- ✅ Easy to query across tenants (analytics, admin)
- ✅ Standard pattern for B2B SaaS

**Cons**:
- ⚠️ Must be disciplined about `WHERE organizationId = ?` in EVERY query
- ⚠️ Risk of data leakage if query missing tenant filter
- ⚠️ Noisy neighbor problem (one tenant can slow others)

**Mitigation**:
- Prisma middleware to auto-inject tenant filters
- Database-level Row-Level Security (RLS) policies
- Rate limiting per organization
- Monitoring query patterns

---

### Option 2: Schema-Per-Tenant
**Pattern**: Shared database, separate PostgreSQL schema per tenant

```typescript
// Dynamic schema switching
const getTenantDb = (tenantId: string) => {
  return new PrismaClient({
    datasources: {
      db: { url: `${DATABASE_URL}?schema=tenant_${tenantId}` }
    }
  });
};
```

**Pros**:
- ✅ Strong isolation (accidental leaks impossible)
- ✅ Easier to backup/restore single tenant
- ✅ Can customize schema per tenant if needed

**Cons**:
- ❌ Complex migrations (run N times for N tenants)
- ❌ Connection pool management harder
- ❌ Analytics/reporting across tenants difficult
- ❌ More operational overhead

---

### Option 3: Database-Per-Tenant
**Pattern**: Separate PostgreSQL database per tenant

**Pros**:
- ✅ Maximum isolation and security
- ✅ Easy to move tenants between servers
- ✅ Perfect for compliance (HIPAA, SOC2)

**Cons**:
- ❌ Extremely expensive (connection pools, resources)
- ❌ Migration nightmare
- ❌ Not suitable for $49/mo customers
- ❌ Complex routing layer needed

**Use Case**: Only for Enterprise tier ($25K+/year)

---

## Recommended Architecture: Hybrid Row-Level + Database-Per-Tenant

### Tier-Based Isolation Strategy

| Tier | Strategy | Rationale |
|------|----------|-----------|
| **Free/Starter** | Row-level (shared DB) | Cost-efficient, easy to scale |
| **Pro** | Row-level (shared DB) | Balance of cost and isolation |
| **Enterprise** | Database-per-tenant | Maximum isolation, SLA guarantees |

### Phase 1: Row-Level Multi-Tenancy (Weeks 1-2)

#### Database Schema Changes

```prisma
// New models
model Organization {
  id               String   @id @default(uuid())
  slug             String   @unique
  name             String
  plan             PlanType @default(free)

  // Billing
  stripeCustomerId String?  @unique
  subscriptionStatus SubscriptionStatus?

  // Limits
  maxAgents        Int      @default(5)
  maxAgentMinutes  Int      @default(1000)  // per month

  // Usage tracking
  agentMinutesUsed Int      @default(0)
  billingPeriodStart DateTime @default(now())
  billingPeriodEnd   DateTime

  // Relations
  users            User[]
  agents           Agent[]
  tasks            Task[]
  messages         Message[]
  sessions         AgentSession[]

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@map("organizations")
}

model User {
  id             String   @id @default(uuid())
  organizationId String
  email          String   @unique
  passwordHash   String?  // For email/password auth
  role           UserRole @default(member)

  // Auth
  emailVerified  Boolean  @default(false)

  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  apiKeys        ApiKey[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@map("users")
}

model ApiKey {
  id             String   @id @default(uuid())
  userId         String
  organizationId String

  name           String
  keyHash        String   @unique  // bcrypt hash of API key
  keyPrefix      String   // First 8 chars for display

  lastUsedAt     DateTime?
  expiresAt      DateTime?

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt      DateTime @default(now())

  @@index([userId])
  @@index([organizationId])
  @@map("api_keys")
}

enum PlanType {
  free
  starter
  pro
  enterprise
}

enum SubscriptionStatus {
  active
  past_due
  canceled
  trialing
}

enum UserRole {
  owner
  admin
  member
}

// Update existing models to add organizationId
model Agent {
  id               String       @id @default(uuid())
  organizationId   String       // 🔑 NEW
  name             String
  // ... rest of fields ...

  organization     Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([organizationId, name])
  @@index([organizationId])
  @@map("agents")
}

model Task {
  id                String       @id @default(uuid())
  organizationId    String       // 🔑 NEW
  // ... rest of fields ...

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([organizationId, status])
  @@map("tasks")
}

// Repeat for: Message, ActivityLog, AgentSession, Schedule
```

#### Authentication Layer

```typescript
// apps/server/src/middleware/auth.ts

import jwt from 'jsonwebtoken';
import { db } from '../db';

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: UserRole;
}

export async function authenticateRequest(req: Request): Promise<AuthContext> {
  // Support both JWT (session) and API keys
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new UnauthorizedError('Missing authorization header');
  }

  if (authHeader.startsWith('Bearer ')) {
    // JWT token (for web app sessions)
    const token = authHeader.substring(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!);

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { organization: true }
    });

    if (!user) throw new UnauthorizedError('User not found');

    return {
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role
    };
  } else if (authHeader.startsWith('Key ')) {
    // API Key (for programmatic access)
    const apiKey = authHeader.substring(4);
    const keyHash = await bcrypt.hash(apiKey, 10);

    const key = await db.apiKey.findUnique({
      where: { keyHash },
      include: { user: { include: { organization: true } } }
    });

    if (!key) throw new UnauthorizedError('Invalid API key');
    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedError('API key expired');
    }

    // Update last used timestamp
    await db.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      userId: key.userId,
      organizationId: key.user.organizationId,
      role: key.user.role
    };
  }

  throw new UnauthorizedError('Invalid authorization format');
}

// Express middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  authenticateRequest(req)
    .then(auth => {
      req.auth = auth;  // Attach to request
      next();
    })
    .catch(err => {
      res.status(401).json({ error: err.message });
    });
}
```

#### Tenant-Scoped Database Access

```typescript
// apps/server/src/db/tenant-client.ts

import { PrismaClient } from '@prisma/client';

// Middleware to auto-inject organizationId in queries
export function createTenantClient(organizationId: string) {
  const prisma = new PrismaClient();

  // Add middleware to automatically filter by organizationId
  prisma.$use(async (params, next) => {
    // Models that have organizationId
    const tenantModels = ['agent', 'task', 'message', 'activityLog', 'agentSession'];

    if (tenantModels.includes(params.model?.toLowerCase() || '')) {
      if (params.action === 'findMany' || params.action === 'findFirst') {
        params.args.where = {
          ...params.args.where,
          organizationId
        };
      } else if (params.action === 'create') {
        params.args.data = {
          ...params.args.data,
          organizationId
        };
      }
    }

    return next(params);
  });

  return prisma;
}
```

#### Updated API Routes

```typescript
// apps/server/src/api/index.ts

import { requireAuth } from '../middleware/auth';
import { createTenantClient } from '../db/tenant-client';

export function setupRoutes(app: Express) {
  // ================== AGENTS ==================

  app.get("/api/agents", requireAuth, async (req, res) => {
    try {
      const db = createTenantClient(req.auth.organizationId);

      const agents = await db.agent.findMany({
        where: { deletedAt: null },  // organizationId auto-injected
        include: {
          assignedTasks: {
            where: { status: { in: ["pending", "in_progress", "blocked"] } },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });

      res.json(agents);
    } catch (error) {
      console.error("[API] Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Similar updates for all other routes...
}
```

#### Resource Limits & Usage Tracking

```typescript
// apps/server/src/middleware/usage-limits.ts

export async function enforceUsageLimits(
  organizationId: string,
  action: 'create_agent' | 'execute_task'
) {
  const org = await db.organization.findUnique({
    where: { id: organizationId }
  });

  if (!org) throw new Error('Organization not found');

  if (action === 'create_agent') {
    const agentCount = await db.agent.count({
      where: { organizationId, deletedAt: null }
    });

    if (agentCount >= org.maxAgents) {
      throw new UsageLimitError(
        `Agent limit reached (${org.maxAgents}). Upgrade to create more agents.`
      );
    }
  }

  if (action === 'execute_task') {
    // Check if within billing period limits
    if (org.agentMinutesUsed >= org.maxAgentMinutes) {
      throw new UsageLimitError(
        `Agent-minutes limit reached (${org.maxAgentMinutes}). Upgrade or wait for next billing period.`
      );
    }
  }
}

// Track usage after task completion
export async function trackUsage(
  organizationId: string,
  agentMinutes: number
) {
  await db.organization.update({
    where: { id: organizationId },
    data: {
      agentMinutesUsed: {
        increment: agentMinutes
      }
    }
  });
}
```

---

## Migration Plan

### Phase 1: Database Migration (Week 1, Days 1-3)

1. **Create migration script**
   - Add Organization, User, ApiKey models
   - Add organizationId to all existing models
   - Add indexes for performance

2. **Data migration**
   - Create default organization for current data
   - Migrate existing agents/tasks to default org
   - Create admin user for default org

3. **Testing**
   - Test migration on development DB
   - Verify all queries still work
   - Performance test with tenant filters

### Phase 2: Authentication (Week 1, Days 4-5)

1. **Implement auth middleware**
   - JWT token generation/validation
   - API key generation/hashing
   - Role-based access control

2. **Add signup/login endpoints**
   - POST /api/auth/signup
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/me

3. **Add API key management**
   - POST /api/api-keys (create)
   - GET /api/api-keys (list)
   - DELETE /api/api-keys/:id (revoke)

### Phase 3: API Updates (Week 2, Days 1-3)

1. **Update all API routes**
   - Add requireAuth middleware
   - Use tenant-scoped database client
   - Add usage limit checks

2. **Update WebSocket**
   - Authenticate socket connections
   - Create tenant-specific rooms
   - Filter events by organization

3. **Update agent execution**
   - Pass organizationId to agent workflows
   - Track usage per execution
   - Enforce rate limits

### Phase 4: Testing & Validation (Week 2, Days 4-5)

1. **Multi-tenant testing**
   - Create multiple test organizations
   - Verify data isolation
   - Test resource limits
   - Load testing with concurrent tenants

2. **Security audit**
   - Test for data leakage between tenants
   - Verify all endpoints require auth
   - Test API key security
   - Check for SQL injection, XSS

---

## Critical Decisions Needed

### Decision 1: Authentication Provider

**Options**:
- **A) Custom JWT + bcrypt** (Build ourselves)
  - Pros: Full control, no external dependencies, free
  - Cons: More code to maintain, security responsibility

- **B) Auth0 / Clerk / Supabase Auth** (Third-party)
  - Pros: Battle-tested, OAuth support, less code
  - Cons: Cost ($25-100/mo), external dependency

- **C) NextAuth.js** (Self-hosted but library)
  - Pros: Free, popular, OAuth providers
  - Cons: Designed for Next.js (we use Express)

**Recommendation**: **Option A (Custom)** for Week 1-2, migrate to Option B later if needed. We need speed, and custom auth is fastest with our stack.

### Decision 2: Billing Integration Timing

**Options**:
- **A) Week 1** - Build Stripe integration immediately
- **B) Week 2** - Build after core multi-tenancy works
- **C) Week 3+** - Defer until launch

**Recommendation**: **Option B (Week 2)**. Get auth/tenancy right first, then add billing. Can do manual invoicing initially if needed.

### Decision 3: Migration of Existing Data

**Options**:
- **A) Keep existing data** (current agents/tasks stay)
- **B) Fresh start** (wipe and rebuild for SaaS)

**Recommendation**: **Option B (Fresh start)**. Current data is development/testing only. Clean slate for production SaaS.

### Decision 4: Self-Service Signup vs. Waitlist

**Options**:
- **A) Open self-service signup** (anyone can create account)
- **B) Waitlist + manual approval** (curated early access)

**Recommendation**: **Option B (Waitlist)** for Week 1-2, then Option A for Week 3+. Gives us time to validate system under controlled load.

---

## Risk Assessment

### High Risk
- **Data leakage between tenants**: One query without tenant filter = breach
  - Mitigation: Prisma middleware, extensive testing, RLS policies

- **Performance degradation**: Shared DB = noisy neighbor problem
  - Mitigation: Per-tenant rate limits, connection pooling, monitoring

### Medium Risk
- **Authentication vulnerabilities**: Custom auth = potential security holes
  - Mitigation: Follow OWASP guidelines, bcrypt for passwords, short JWT expiry

- **Migration complexity**: Schema changes + data migration = downtime risk
  - Mitigation: Test thoroughly in staging, can afford downtime (no prod users yet)

### Low Risk
- **Billing edge cases**: Free trial -> paid conversion issues
  - Mitigation: Manual override capability, grace periods

---

## Success Criteria

### Week 1
- ✅ Multi-tenant database schema deployed
- ✅ Authentication working (signup, login, API keys)
- ✅ At least one protected endpoint (e.g., GET /api/agents)
- ✅ Can create 2+ test organizations with isolated data

### Week 2
- ✅ All API endpoints tenant-scoped
- ✅ Usage limits enforced
- ✅ WebSocket tenant isolation
- ✅ Stripe integration (basic)
- ✅ No data leaks in security tests

---

## Recommended Next Steps

1. **This Week (Marcus approves architecture)**
   - Choose: Auth provider (Custom vs. third-party)
   - Choose: Migration strategy (keep vs. fresh start)
   - Choose: Signup approach (open vs. waitlist)

2. **Once Approved**
   - I'll create detailed Prisma migration
   - Build auth middleware
   - Update API layer incrementally
   - DeVonte builds signup UI in parallel

3. **Parallel Work Streams**
   - **Sable**: Backend multi-tenancy (this doc)
   - **DeVonte**: Landing page + signup UI
   - **Yuki**: Infrastructure hardening, monitoring
   - **Graham**: Competitor research, pricing validation

---

## Questions for Marcus

1. **Auth approach**: Custom or third-party? (I recommend custom for speed)
2. **Billing timing**: Week 1 or Week 2? (I recommend Week 2)
3. **Data migration**: Keep or fresh start? (I recommend fresh start)
4. **Launch mode**: Waitlist or open signup? (I recommend waitlist initially)
5. **Priority**: Should we de-scope anything to ship faster?

---

**Bottom Line**: Multi-tenant SaaS is achievable in 2 weeks, but requires these critical decisions NOW. Once you approve the approach, I can start implementation immediately.

Ready to build this. Let me know your decisions and I'll execute.

— Sable Chen
