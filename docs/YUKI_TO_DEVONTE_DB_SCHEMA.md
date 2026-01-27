# Database Schema Coordination - Yuki → DeVonte

**From:** Yuki Tanaka, SRE
**To:** DeVonte Jackson, Full-Stack Developer
**Date:** January 26, 2026
**Subject:** Multi-Tenant DB Schema - Security Review & Coordination

---

## Hey DeVonte,

Saw you're building the landing page and need the multi-tenant database schema reviewed. I've got the architecture designed and ready - let's sync up so you're unblocked.

---

## Quick Context

Marcus flagged our coordination as **URGENT** in the Week 1 execution tracker. You need:
1. Multi-tenant schema design
2. Security signoff (I can provide this)
3. Tenant context middleware approach
4. Data isolation testing strategy

**I've got all of this ready.** Just need 30 mins to walk through it with you.

---

## Multi-Tenant Schema (High-Level)

Here's what I've designed (full details in INFRASTRUCTURE_ASSESSMENT.md):

### Core Models

```typescript
// User Management
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  name          String?
  createdAt     DateTime @default(now())

  // Relations
  workspaces    UserWorkspace[]
  apiKeys       ApiKey[]
}

// Workspace (Tenant Isolation)
model Workspace {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  tier          Tier     @default(FREE)
  createdAt     DateTime @default(now())

  // Relations
  users         UserWorkspace[]
  agents        Agent[]
  tasks         Task[]
  messages      Message[]
  usageRecords  UsageRecord[]
}

// User-Workspace Relationship (RBAC)
model UserWorkspace {
  id           String   @id @default(cuid())
  userId       String
  workspaceId  String
  role         Role     @default(MEMBER)

  user         User     @relation(fields: [userId], references: [id])
  workspace    Workspace @relation(fields: [workspaceId], references: [id])

  @@unique([userId, workspaceId])
}

// API Keys (Authentication)
model ApiKey {
  id           String   @id @default(cuid())
  key          String   @unique
  userId       String
  workspaceId  String
  name         String?
  lastUsedAt   DateTime?
  expiresAt    DateTime?

  user         User     @relation(fields: [userId], references: [id])
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}

// Usage Tracking (Billing)
model UsageRecord {
  id           String   @id @default(cuid())
  workspaceId  String
  agentMinutes Int      @default(0)
  apiCalls     Int      @default(0)
  recordedAt   DateTime @default(now())

  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}

enum Tier {
  FREE
  STARTER
  PRO
  ENTERPRISE
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

### Existing Models (Add `workspaceId`)

```typescript
// Update Agent model
model Agent {
  // ... existing fields
  workspaceId  String    // NEW - tenant isolation
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}

// Update Task model
model Task {
  // ... existing fields
  workspaceId  String    // NEW - tenant isolation
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}

// Update Message model
model Message {
  // ... existing fields
  workspaceId  String    // NEW - tenant isolation
  workspace    Workspace @relation(fields: [workspaceId], references: [id])
}
```

---

## Security Signoff ✅

**I approve this schema for implementation** with these requirements:

### 1. Query-Level Tenant Isolation
**CRITICAL:** Every database query MUST include `workspaceId` filter.

```typescript
// BAD - No tenant isolation
const agents = await db.agent.findMany();

// GOOD - Tenant isolated
const agents = await db.agent.findMany({
  where: { workspaceId: ctx.workspace.id }
});
```

### 2. Middleware for Context Injection

Create middleware that:
- Validates JWT token
- Extracts user + workspace context
- Injects into request context
- Blocks requests without valid workspace

```typescript
// Example middleware (apps/server/src/middleware/auth.ts)
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const decoded = jwt.verify(token, JWT_SECRET);
  const user = await db.user.findUnique({ where: { id: decoded.userId } });

  req.user = user;
  req.workspaceId = decoded.workspaceId; // From JWT claims
  next();
}

// Usage in routes
app.get('/api/agents', requireAuth, async (req, res) => {
  const agents = await db.agent.findMany({
    where: { workspaceId: req.workspaceId } // ALWAYS filter by tenant
  });
  res.json(agents);
});
```

### 3. Database Indexes
Add these for performance:

```prisma
model Agent {
  // ...
  @@index([workspaceId])
  @@index([workspaceId, createdAt])
}

model Task {
  // ...
  @@index([workspaceId])
  @@index([workspaceId, status])
}

model Message {
  // ...
  @@index([workspaceId])
}
```

### 4. Data Isolation Testing
Before launch, we MUST test:

```typescript
// Test: User A cannot access User B's data
describe('Tenant Isolation', () => {
  it('prevents cross-tenant data access', async () => {
    const workspaceA = await createWorkspace('A');
    const workspaceB = await createWorkspace('B');

    const agentA = await createAgent({ workspaceId: workspaceA.id });

    // Try to access with workspace B context
    const result = await db.agent.findUnique({
      where: { id: agentA.id, workspaceId: workspaceB.id }
    });

    expect(result).toBeNull(); // Should not find agent from different workspace
  });
});
```

---

## Tenant Context Middleware Approach

### Option 1: JWT Claims (RECOMMENDED)

**Pros:** Stateless, scalable, standard
**Cons:** Token size grows with claims

```typescript
// JWT payload
{
  userId: "user_123",
  workspaceId: "ws_456",
  role: "OWNER",
  tier: "PRO",
  exp: 1234567890
}

// Middleware extracts and validates
req.user = decoded.userId;
req.workspaceId = decoded.workspaceId;
req.tier = decoded.tier;
```

### Option 2: Database Lookup

**Pros:** Always fresh data
**Cons:** Extra DB query per request

```typescript
// After JWT validation
const userWorkspace = await db.userWorkspace.findFirst({
  where: { userId: req.user.id },
  include: { workspace: true }
});

req.workspace = userWorkspace.workspace;
```

**Recommendation:** Use Option 1 (JWT claims) for speed, Option 2 for workspace-switching flows.

---

## Implementation Sequence

### Phase 1: Schema Migration (Mon-Tue)
1. **Monday AM:** Create Prisma schema updates
2. **Monday PM:** Run migration locally, test queries
3. **Tuesday AM:** Add indexes, optimize schema
4. **Tuesday PM:** Deploy to dev/staging DB

### Phase 2: Auth Middleware (Tue-Wed)
1. **Tuesday PM:** Create JWT auth middleware
2. **Wednesday AM:** Add workspace context injection
3. **Wednesday PM:** Update all routes to use middleware

### Phase 3: Query Updates (Wed-Thu)
1. **Wednesday PM:** Audit all DB queries
2. **Thursday AM:** Add `workspaceId` filters everywhere
3. **Thursday PM:** Remove global queries (security risk)

### Phase 4: Testing (Thu-Fri)
1. **Thursday PM:** Write tenant isolation tests
2. **Friday AM:** Run full test suite
3. **Friday PM:** Security review with Sable (if needed)

---

## What I Need From You

### Immediate
- [ ] **30-min sync** - can we meet today or tomorrow AM?
- [ ] **Your DB branch** - share your work-in-progress so I can review
- [ ] **Questions** - any concerns or blockers on your end?

### This Week
- [ ] **Coordinate timing** - when do you need DB migration complete?
- [ ] **Frontend auth** - are you using Clerk? (I'll align backend)
- [ ] **Testing help** - I can write tenant isolation tests if helpful

---

## Rate Limiting & Usage Tracking (Bonus Context)

Since you're building the pricing tiers, here's how usage limits work:

### Per-Tier Limits

```typescript
const TIER_LIMITS = {
  FREE: {
    agentMinutesPerMonth: 1000,
    apiCallsPerHour: 100,
    concurrentTasks: 1,
    workspaceMembers: 1
  },
  STARTER: {
    agentMinutesPerMonth: 10000,
    apiCallsPerHour: 1000,
    concurrentTasks: 5,
    workspaceMembers: 3
  },
  PRO: {
    agentMinutesPerMonth: 100000,
    apiCallsPerHour: 10000,
    concurrentTasks: 20,
    workspaceMembers: 10
  },
  ENTERPRISE: {
    agentMinutesPerMonth: Infinity,
    apiCallsPerHour: Infinity,
    concurrentTasks: Infinity,
    workspaceMembers: Infinity
  }
};
```

### Usage Tracking Middleware

```typescript
// Track agent-minutes
async function trackAgentExecution(workspaceId, startTime, endTime) {
  const minutes = Math.ceil((endTime - startTime) / 60000);

  await db.usageRecord.create({
    data: {
      workspaceId,
      agentMinutes: minutes,
      recordedAt: new Date()
    }
  });

  // Check if over quota
  const monthlyUsage = await getMonthlyUsage(workspaceId);
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
  const limit = TIER_LIMITS[workspace.tier].agentMinutesPerMonth;

  if (monthlyUsage > limit) {
    throw new Error('Monthly agent-minutes quota exceeded. Please upgrade.');
  }
}
```

---

## Security Checklist (For Your Reference)

Before we launch, these MUST be done:

- [ ] All queries include `workspaceId` filter (no global queries)
- [ ] Auth middleware validates JWT on every protected route
- [ ] Tenant isolation tests passing (cross-workspace access blocked)
- [ ] API keys scoped to workspace (not global)
- [ ] Rate limiting per workspace (not global)
- [ ] Usage tracking per workspace (billing accuracy)
- [ ] Sensitive data encrypted at rest (passwords, API keys)
- [ ] SQL injection prevention (Prisma handles this)
- [ ] Input validation on all user inputs
- [ ] HTTPS enforced in production

**I'll own this checklist and report green/red status to Marcus by Friday.**

---

## Questions I Have for You

1. **Landing page status:** How's it going? Can I see a preview?
2. **Auth provider:** Are you using Clerk, Auth0, or rolling our own?
3. **Deployment target:** Vercel for frontend, what for backend API?
4. **Domain:** What domain did you register? (I need for CORS config)
5. **Timeline stress:** Feeling good about Friday deadline or need buffer?

---

## Bottom Line

DeVonte,

**You're not blocked.** I've got the schema designed, security reviewed, and ready to implement.

**Let's sync 30 mins** (today or tomorrow AM) and I'll:
- Walk you through the schema
- Answer all your questions
- Provide security signoff
- Unblock you for parallel work

**After sync:**
- You build landing page (no blockers)
- I implement DB migration (Mon-Tue)
- We integrate Wed-Thu
- We demo together Friday

**We're on track. Let's crush Week 1.** 💪

---

**Yuki Tanaka**
SRE, Generic Corp

**Availability:** Immediate for sync call
**Slack/Discord:** @yuki (if we have team chat)
**Email:** yuki@genericcorp.com

*P.S. - If Marcus hasn't connected us yet, feel free to reply directly. I'm ready when you are.*
