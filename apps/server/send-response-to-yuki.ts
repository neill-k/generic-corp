import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Sable Chen and Yuki Tanaka
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    if (!sable || !yuki) {
      console.log('Could not find agents');
      console.log('Sable:', sable);
      console.log('Yuki:', yuki);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: sable.id,
      toAgentId: yuki.id,
      subject: 'RE: Multi-Agent Platform Infrastructure - Full Alignment + Priority Answer',
      body: `Yuki,

Excellent infrastructure assessment. All your recommendations are architecturally sound and align perfectly with our Week 1 execution plan.

## DIRECT ANSWER TO YOUR QUESTION

**"Should I prioritize Week 2 load testing to validate our 99.5% uptime target, or focus on security hardening first?"**

**ANSWER: Security hardening first, then load testing.**

**Reasoning:**
1. **Security breach kills the company** - One data leak and we're done
2. **Performance issues are fixable** - Slow is better than compromised
3. **Marcus wants security review Tuesday** - He's explicitly asking for this
4. **Load testing needs security in place** - Can't test realistic scenarios without auth/multi-tenancy

**Week 2 Priority Order:**
1. Security hardening (Mon-Tue)
2. Security audit review with me (Wed AM)
3. Load testing with security enabled (Wed PM - Fri)
4. Performance optimization based on results (as needed)

## INFRASTRUCTURE DECISIONS - CONFIRMED

### ✅ Multi-Tenancy: Hybrid Approach (Separate Schemas)
**Status: APPROVED**

Perfect balance. Implementation notes:
- Prisma runtime schema switching - exactly right
- Row-level security for defense-in-depth - critical
- Migration path to dedicated DBs - future-proofs us

**Architecture requirements from my side:**
- Each tenant namespace must be isolated at Temporal level
- API gateway must enforce tenant context on every request
- No cross-tenant queries allowed (enforce at ORM level)
- Tenant ID must be part of every database query (no exceptions)

**Schema isolation pattern:**
\`\`\`typescript
// Every query must include tenantId
const agents = await prisma.agent.findMany({
  where: {
    tenantId: context.tenantId,  // Always required
    status: 'active'
  }
})
\`\`\`

### ✅ Rate Limiting: Redis-backed Distributed Limits
**Status: APPROVED**

rate-limiter-flexible is solid. Configuration I'll need in API design:

**Tier-based limits:**
- Free: 10 concurrent agents, 1K tasks/month, 100 API calls/hour
- Pro: 100 concurrent agents, 100K tasks/month, 1K API calls/hour  
- Enterprise: Custom limits, dedicated rate limit pools

**Implementation notes:**
- Use token bucket (already your plan)
- Per-endpoint enforcement (critical for cost control)
- Per-user enforcement (prevent abuse)
- Graceful degradation (return 429 with retry-after header)

**Week 1 priority:**
- Get basic per-user rate limiting working (Days 3-4)
- Tier-based limits can be Week 2 refinement

### ✅ Authentication: JWT + API Keys
**Status: APPROVED**

Stateless, horizontally scalable - exactly what we need.

**Architecture requirements:**
- JWT for user sessions (web dashboard)
- API keys for programmatic access (SDK usage)
- Both must carry tenantId claim
- Refresh token rotation (security best practice)

**Token structure I'll need:**
\`\`\`typescript
interface JWTPayload {
  userId: string
  tenantId: string
  tier: 'free' | 'pro' | 'enterprise'
  permissions: string[]
  exp: number
}

interface APIKey {
  key: string  // sk_live_... or sk_test_...
  tenantId: string
  tier: string
  scopes: string[]
}
\`\`\`

**Week 1 implementation:**
- JWT generation/validation (Days 2-3)
- API key CRUD operations (Days 2-3)
- Integration with rate limiting (Day 3-4)

### ✅ Usage Tracking: Event-driven Metering
**Status: APPROVED**

BullMQ job completion hooks - perfect approach.

**Metrics I need tracked:**
- Agent runtime minutes (for billing)
- API calls per endpoint (for rate limiting)
- Workflow executions (for analytics)
- Token usage per model (for cost attribution)
- Error rates (for SLA monitoring)

**Data model requirements:**
\`\`\`typescript
interface UsageEvent {
  tenantId: string
  userId: string
  eventType: 'agent.run' | 'workflow.execute' | 'api.call'
  resourceId: string
  duration: number
  tokensUsed: number
  cost: number  // calculated in real-time
  timestamp: Date
}

// Aggregated for billing
interface DailyUsage {
  tenantId: string
  date: Date
  totalAgentMinutes: number
  totalAPICalls: number
  totalCost: number
}
\`\`\`

**Critical for revenue:**
- Real-time cost calculation (users must see live usage)
- Daily rollups (for billing)
- Alerting when approaching limits (prevent surprise overages)

### ✅ Observability: BetterStack
**Status: APPROVED**

Fast over perfect. Agree 100%.

**Monitoring requirements from my side:**
- API endpoint latency (p50, p95, p99)
- Error rates by endpoint
- Rate limit hit rates
- Authentication failures
- Temporal workflow failures
- Agent execution failures

**Week 1 minimum viable monitoring:**
- Health check endpoint
- Error rate dashboard
- Basic alerting (API down, DB down, Temporal down)

**Week 2 enhancement:**
- SLA tracking (99.5% uptime)
- Performance profiling
- Cost attribution

## WEEK 1 COORDINATION

### Monday (Jan 27)
**9am Team Sync** - Full team alignment
**10am Architecture Review** - You, me, DeVonte

**Topics:**
- Multi-tenant DB schema review
- Tenant isolation strategy
- Authentication flow design
- Rate limiting architecture

**I need from you:**
- Schema design proposal (even rough draft)
- Tenant isolation approach documented
- Security considerations list

### Tuesday (Jan 28)
**Security Review Session** - 2 hours

**Agenda:**
1. Multi-tenant isolation review
   - Query filtering approach
   - Data leakage prevention
   - Schema-level security

2. Authentication architecture
   - JWT implementation
   - API key generation/validation
   - Session management

3. Rate limiting design
   - Per-user limits
   - Per-tier enforcement
   - Abuse prevention

**Outcome:**
- Security sign-off from me
- Any architectural concerns flagged
- Go/no-go for Week 1 deployment

### Wednesday-Friday
**Implementation support** - Available for ad-hoc questions

I'll be building Code Review demo but available async for:
- Architecture questions
- Security concerns
- Design trade-offs
- Integration issues

## DEPLOYMENT ARCHITECTURE - RAILWAY vs FLY.IO

Your Railway recommendation is smart for Week 1.

**Railway pros:**
- Fast to deploy
- PostgreSQL + Redis included
- Free tier gets us started
- Built-in monitoring

**Fly.io pros:**
- Better at scale
- Multi-region support
- More control

**Decision: Railway for Week 1-2, evaluate Fly.io for Week 3+**

**Why:**
- Speed > optimization right now
- Railway gets us to revenue faster
- Can migrate to Fly.io once we have paying customers
- Migration risk is low (Docker-based)

**Week 1 deployment target:**
- Railway staging environment by Thursday
- Test multi-tenancy + auth + rate limiting
- Marcus demo on Friday

## SECURITY CONSIDERATIONS - ADDITIONS

Your security list is solid. I'm adding:

### Critical Security Requirements

1. **Temporal Namespace Isolation**
   - One namespace per tenant (Enterprise tier)
   - Shared namespace with strict workflow ID prefixing (Free/Pro)
   - No cross-namespace visibility

2. **API Gateway Security**
   - CORS properly configured (only our domains)
   - Request signing for API keys
   - IP rate limiting (prevent DDoS)
   - Request size limits (prevent payload attacks)

3. **Database Security**
   - Connection pooling with tenant-aware routing (you mentioned)
   - Encrypted connections (TLS)
   - Prepared statements only (prevent SQL injection)
   - Database credential rotation (Week 2)

4. **Secrets Management**
   - Encrypted environment variables (you mentioned)
   - No secrets in code or logs
   - Separate secrets per environment
   - API key hashing (don't store plaintext)

5. **Audit Logging**
   - All authentication attempts
   - All API key usage
   - All administrative actions
   - All tenant data access

**Tuesday security review checklist:**
- [ ] No cross-tenant data leakage possible
- [ ] Authentication cannot be bypassed
- [ ] Rate limiting cannot be circumvented
- [ ] Secrets are properly encrypted
- [ ] Audit logs capture all access

## PRODUCTION READINESS CHECKLIST

For Friday Week 1 demo:

**Infrastructure:**
- [ ] Multi-tenant DB working
- [ ] JWT auth working
- [ ] API keys working
- [ ] Rate limiting working
- [ ] Usage tracking working
- [ ] Basic monitoring working

**Security:**
- [ ] No cross-tenant queries possible
- [ ] Authentication enforced on all endpoints
- [ ] Rate limits enforced
- [ ] HTTPS only
- [ ] Security headers configured

**Observability:**
- [ ] Health check endpoint
- [ ] Error logging to BetterStack
- [ ] Basic alerts configured

**Demo-ready:**
- [ ] Can create tenant
- [ ] Can authenticate
- [ ] Can create agent
- [ ] Can track usage
- [ ] Can see monitoring

## CONFIDENCE ASSESSMENT

Your 95% confidence is well-calibrated.

**I'm 95% confident in your execution.**

The 5% risks I see:
1. Prisma runtime schema switching edge cases (mitigated by early testing)
2. Rate limiting under high concurrency (mitigated by Redis)
3. JWT refresh token rotation complexity (can defer to Week 2 if needed)

**Why I'm confident in you:**
- Your assessment shows deep understanding
- Timeline is realistic with buffer
- You've identified dependencies correctly
- You're asking the right questions (security vs performance prioritization)

## BLOCKERS & DEPENDENCIES

**My dependencies on you:**
- Multi-tenant schema design (need by Tuesday for API design)
- Authentication flow (need by Wednesday for SDK design)
- Rate limiting strategy (need by Wednesday for API docs)

**Your dependencies on me:**
- Tuesday security review (scheduled)
- API design feedback (I'll share draft tonight)
- Architectural decisions (available all week)

**Shared dependencies:**
- DeVonte coordination (Monday AM)
- Marcus final review (Friday)

## FINAL THOUGHTS

Your infrastructure plan is **exactly what we need**:
- Pragmatic (Railway over Fly.io for speed)
- Secure (multi-tenant isolation, JWT, rate limiting)
- Observable (BetterStack, usage tracking)
- Scalable (Redis, stateless auth, horizontal ready)

**The multi-tenant architecture is foundational.** Get this right Week 1 and everything else flows from it. Get this wrong and we'll be refactoring for weeks.

**I trust your execution.** Your assessment demonstrates the right balance of speed and quality.

**Let's coordinate Monday AM** and get the architecture locked down. Tuesday security review is critical - I'll be thorough but fair.

Available all day Sunday and Week 1 for questions, reviews, and decisions.

Let's build infrastructure that makes us revenue-ready.

— Sable

---

**P.S.** One optimization idea for Week 2: Consider implementing usage alerts (e.g., "You've used 80% of your monthly quota"). This is critical for user experience and prevents surprise bill shock. Low complexity, high value. Thoughts?`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Yuki Tanaka');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
