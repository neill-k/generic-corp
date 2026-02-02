# Multi-Tenant SaaS Development Status

**Date**: January 26, 2026
**Prepared By**: DeVonte Jackson, Full-Stack Developer
**Priority**: CRITICAL (Week 1 of Revenue Strategy)
**Status**: Assessment Complete - Ready to Build

---

## Executive Summary

Our platform has **excellent** core infrastructure but **zero** multi-tenant or SaaS capabilities. We need to add 5 major components to go from internal tool to revenue-generating product:

1. Multi-tenant data isolation
2. Authentication & user management
3. Billing integration
4. Developer-facing API layer
5. Marketing website & onboarding

**Good News**: Core tech is solid. We're packaging, not rebuilding.

**Timeline**: 7-10 days to first paid signup (if we move fast).

---

## Current Infrastructure Assessment ✅

### What We Have (Production Ready)

**Backend Services**:
- Express.js REST API with 15+ endpoints
- WebSocket server (Socket.io) for real-time updates
- BullMQ task queue with worker infrastructure
- Event bus for internal pub/sub
- PostgreSQL (Prisma ORM) + Redis

**Agent System**:
- Claude Agent SDK integration (working)
- 5 personality-driven agents (Marcus, Sable, DeVonte, Yuki, Graham)
- BaseAgent class with tool execution
- Agent session tracking
- Task orchestration with dependencies
- Provider account system (OAuth for GitHub Copilot, etc.)

**Data Models** (11 tables):
- Agent, Task, Message, TaskDependency
- ActivityLog, AgentSession, Schedule
- GameState, ProviderAccount, OAuthTransaction
- CredentialProxy

**Frontend**:
- React + Phaser 3 isometric game view
- Zustand state management
- Real-time WebSocket client
- Agent dashboard UI

### What Works Well

1. **Task Orchestration**: Proven with real agent execution
2. **Real-time Updates**: WebSocket events broadcasting changes
3. **Reliability**: BullMQ retry logic, error handling
4. **Security**: Encrypted credential storage, OAuth flows
5. **Monitoring**: Activity logs, session tracking

---

## Critical Gaps for SaaS ❌

### 1. Multi-Tenancy (BLOCKER)

**Current State**: Single-player game mode only
- Hardcoded `playerId: "default"`
- No concept of organizations or teams
- All data globally accessible
- No resource isolation

**What's Needed**:
```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  name          String
  organizationId String
  role          UserRole
  // ... auth fields
}

model Organization {
  id              String   @id @default(uuid())
  name            String
  slug            String   @unique
  subscriptionTier String  @default("free")
  // ... billing fields
}
```

**Changes Required**:
- Add `organizationId` to Agent, Task, Message, etc.
- Row-level security in all queries
- Resource limits per org (agent count, task queue depth)
- Data isolation guarantees

**Complexity**: Medium (2-3 days)

### 2. Authentication (BLOCKER)

**Current State**: No auth whatsoever
- API endpoints completely open
- No user sessions
- No access control

**What's Needed**:
- User signup/login flow
- Session management (JWT or session cookies)
- API key system for developer access
- OAuth for social login (optional)

**Recommended Approach**:
- **Option A**: Use Clerk or Auth0 (1 day integration)
- **Option B**: Build with Passport.js (3-4 days)

**My Recommendation**: Clerk for speed. We're already tight on time.

**Complexity**: Low with Clerk, Medium with custom

### 3. Billing Integration (HIGH PRIORITY)

**Current State**: No payment processing
- No subscription management
- No usage tracking
- No pricing enforcement

**What's Needed**:
- Stripe integration
- Subscription lifecycle (trial → paid → churn)
- Usage metering (agent-minutes)
- Webhook handlers for payment events
- Pricing tier enforcement

**API Design**:
```typescript
// Stripe Products
- Free: $0/mo (self-hosted)
- Starter: $49/mo (5 agents, 1K agent-minutes)
- Pro: $149/mo (20 agents, 10K agent-minutes)
- Enterprise: Custom pricing
```

**Complexity**: Medium (2-3 days with Stripe Checkout)

### 4. Developer API Layer (MEDIUM PRIORITY)

**Current State**: Internal-only endpoints
- No API versioning
- No rate limiting
- No public documentation
- No example code

**What's Needed**:
- Public developer endpoints (`/v1/agents`, `/v1/tasks`)
- API key authentication
- Rate limiting by tier
- OpenAPI/Swagger docs
- SDK or example projects

**Example Flow**:
```bash
# Developer creates API key in dashboard
curl -X POST https://api.genericcorp.io/v1/tasks \
  -H "Authorization: Bearer gc_sk_..." \
  -d '{"agent": "sable", "description": "Review PR #42"}'
```

**Complexity**: Medium (2-3 days)

### 5. Marketing Site & Onboarding (HIGH PRIORITY)

**Current State**: No external-facing site
- Only internal game UI
- No landing page
- No signup flow
- No demo environment

**What's Needed**:
- Landing page (genericcorp.io)
  - Hero, features, pricing, CTA
- Demo deployment (demo.genericcorp.io)
- Signup/onboarding flow
- User dashboard (manage agents, view usage)
- Documentation site

**My Assignment** (per revenue strategy):
- Landing page design + build
- Demo deployment
- Onboarding UX

**Complexity**: Low for landing page (1-2 days), Medium for full onboarding

---

## Technical Architecture: Current vs. Target

### Current (Internal Game)

```
┌─────────────────────────────────────┐
│   Game Frontend (localhost:5173)    │
│   Single player, no auth            │
└────────────┬────────────────────────┘
             │ WebSocket
┌────────────┴────────────────────────┐
│   Express API (localhost:3000)      │
│   Open endpoints, no tenancy        │
└────────────┬────────────────────────┘
             │
┌────────────┴────────────────────────┐
│   PostgreSQL (single "default" user)│
└─────────────────────────────────────┘
```

### Target (Multi-Tenant SaaS)

```
┌──────────────────┐  ┌──────────────────┐
│  Marketing Site  │  │  User Dashboard  │
│  (Public)        │  │  (Authenticated) │
└────────┬─────────┘  └────────┬─────────┘
         │                     │
         └──────────┬──────────┘
                    │ HTTPS
         ┌──────────┴──────────┐
         │   API Gateway        │
         │   - Auth (Clerk)     │
         │   - Rate Limiting    │
         │   - Routing          │
         └──────────┬───────────┘
                    │
         ┌──────────┴───────────┐
         │   Express API        │
         │   - Tenant context   │
         │   - Resource limits  │
         │   - Usage tracking   │
         └──────────┬───────────┘
                    │
    ┌───────────────┼────────────────┐
    │               │                │
┌───┴───┐      ┌────┴────┐      ┌────┴─────┐
│ DB    │      │ Redis   │      │  Stripe  │
│ (RLS) │      │ (Queue) │      │ (Billing)│
└───────┘      └─────────┘      └──────────┘
```

---

## Implementation Roadmap

### Phase 1: Foundation (Days 1-3)
**Goal**: Auth + Multi-tenancy working locally

- [ ] Add User & Organization models to Prisma schema
- [ ] Database migration with tenant foreign keys
- [ ] Integrate Clerk for authentication
- [ ] Add tenant context middleware to Express
- [ ] Update all queries to filter by organizationId
- [ ] Basic signup flow (email → org creation → dashboard)

**Deliverable**: Can sign up, create org, see isolated data

### Phase 2: Developer Experience (Days 4-5)
**Goal**: External developers can use the platform

- [ ] Landing page (hero, pricing, features, CTA)
- [ ] Deploy to genericcorp.io (Vercel)
- [ ] Developer dashboard (agents list, create task)
- [ ] API key generation & management
- [ ] Public API endpoints with auth

**Deliverable**: Landing page live, dev can sign up & create tasks

### Phase 3: Billing (Days 6-7)
**Goal**: Can collect money

- [ ] Stripe integration (products, checkout, webhooks)
- [ ] Pricing tiers (Free, Starter, Pro, Enterprise)
- [ ] Usage tracking (agent-minutes counter)
- [ ] Subscription management UI
- [ ] Payment success/failure flows

**Deliverable**: First paid subscription possible

### Phase 4: Polish & Launch (Days 8-10)
**Goal**: Ready for Show HN

- [ ] Demo environment (demo.genericcorp.io)
- [ ] Documentation site (quickstart, API reference)
- [ ] Onboarding improvements (tooltips, examples)
- [ ] Analytics setup (Plausible)
- [ ] Error monitoring (Sentry or similar)
- [ ] Launch checklist (security, performance, legal)

**Deliverable**: Announce on Hacker News, r/MachineLearning

---

## Risk Assessment

### Technical Risks

**Risk: Database Migration Breaks Existing Data**
- Mitigation: Test migration on local DB first
- Rollback plan: Keep backups, reversible migrations

**Risk: Multi-Tenant Queries Miss Edge Cases**
- Mitigation: Write E2E tests for data isolation
- Test: User A cannot see User B's agents/tasks

**Risk: Stripe Webhooks Fail Silently**
- Mitigation: Webhook logging, retry logic, alerts
- Test: Simulate failed payments, cancellations

### Product Risks

**Risk: Developers Don't Want Visual Orchestration**
- Mitigation: User interviews before launch
- Pivot option: Offer headless API mode

**Risk: Onboarding Too Complex**
- Mitigation: Watch first 10 signups, iterate quickly
- Fallback: Live onboarding calls

### Timeline Risks

**Risk: 10 Days Too Aggressive**
- Mitigation: Cut scope (no demo env, minimal docs)
- Fallback: Launch with waitlist, slower rollout

---

## Dependencies & Blockers

### Need from Team

**Sable** (Principal Engineer):
- Review multi-tenant architecture plan
- Security audit of auth flow
- API design feedback

**Yuki** (SRE):
- Production deployment plan (domains, SSL, CI/CD)
- Resource limits (rate limiting, DB connections)
- Monitoring/alerting setup

**Graham** (Data Engineer):
- Usage analytics design (track agent-minutes)
- Pricing validation (market research)

**Marcus** (CEO):
- Domain purchase (genericcorp.io)
- Stripe account setup
- Approve landing page copy

### External Dependencies

- Clerk account (free tier OK for now)
- Stripe account (activation takes 1-2 days)
- Domain registrar (Namecheap, Cloudflare)
- Hosting (Vercel for frontend, Railway/Render for backend)

---

## Success Metrics (Week 1)

- [ ] Landing page live (10+ waitlist signups)
- [ ] Multi-tenant DB schema deployed
- [ ] Auth flow working (sign up → login → dashboard)
- [ ] 1+ test user can create agent & task
- [ ] Demo deployed and publicly accessible

**Stretch Goals**:
- [ ] Stripe integration complete
- [ ] API documentation published
- [ ] First paid trial signup

---

## Open Questions for Marcus

1. **Domain**: Do we have genericcorp.io or need to buy it?
2. **Pricing**: Are we locked into $49/$149/custom tiers?
3. **Branding**: Any specific design direction for landing page?
4. **Launch Timeline**: Still targeting Week 3 (Feb 9-15) for public launch?
5. **Coordination**: Should I sync with Sable before starting DB changes?

---

## Next Actions (Immediate)

**Awaiting Marcus's Direction**:
1. Confirm I should proceed with landing page
2. Get domain/Stripe account info
3. Sync with Sable on multi-tenant architecture

**Ready to Start**:
- Landing page (can ship in 1 day)
- Multi-tenant schema design (can PR for review)

**Timeline**:
- Once I get greenlight, I can have Phase 1 done in 3 days
- Landing page can be parallel work (doesn't block backend)

Let's ship this! 🚀

---

**Status**: ✅ Assessment Complete | ⏸️ Awaiting Greenlight | 🎯 Ready to Execute
