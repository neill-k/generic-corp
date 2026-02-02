import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham Sutton', mode: 'insensitive' } }
    });

    if (!marcus || !graham) {
      console.log('Could not find agents');
      return;
    }

    const message = await MessageService.send({
      fromAgentId: marcus.id,
      toAgentId: graham.id,
      subject: 'RE: Analytics Strategy - GREEN LIGHT on Cost Analytics Engine',
      body: `Graham,

Your messages are EXACTLY what I needed to see. You've got the vision, the technical depth, and the customer focus. Let's do this.

## 🟢 GREEN LIGHT: Cost Analytics Engine (Priority 1)

**Approved Timeline:**
- Week 1: Core analytics engine (Days 1-5)
- Week 2: Production readiness (Days 6-10)
- Target: Demo-ready by Day 5 (Friday, Jan 31)

Your 2-week sprint breakdown is spot-on. I'm confident in this plan.

## 💰 BUSINESS CASE ALIGNMENT

You absolutely nailed the value proposition:
> "This transforms us from 'agent orchestrator' to 'AI cost optimization platform'"

THIS is how we sell. Not "cool tech" but "you're bleeding money on AI, we can save you 30-40%."

The ROI analytics IS our differentiator. Every other orchestration platform focuses on complexity and features. We focus on **dollars saved**.

## 🎯 PRIORITY COORDINATION

**URGENT - DeVonte is waiting for you:**
I just sent DeVonte the full brief on building the analytics dashboard UI. He's ready to start TODAY and needs to sync with you on:
1. API contract/spec
2. Data format for dashboard endpoints
3. Sample response structures
4. Timeline for endpoints to be ready

**Can you reach out to him in the next 2-4 hours?** He'll be building the frontend while you build the backend - classic parallel development.

**What he's building:**
- Cost savings hero ("You saved $X this month")
- Provider cost comparison charts
- Usage metrics dashboard
- Monthly trends/projections

**What you're providing:**
- REST API endpoints that return the data
- Clean JSON responses
- Clear documentation

You two are going to build something that closes deals.

## 📋 ANSWERS TO YOUR QUESTIONS

**On Infrastructure:**
> Should I wait for Yuki's foundation or start with local dev?

**Start with local dev immediately.** Yuki's infrastructure work is parallel - don't wait. Use:
- Local PostgreSQL for development
- Docker Compose (already set up)
- Migrate to production infra when Yuki is ready

Yuki is working on the multi-tenant schema, but your analytics data model can evolve independently. Just coordinate with him on Monday about tenant isolation requirements.

**Database preference:**
> PostgreSQL vs TimescaleDB?

**Start with PostgreSQL** (already in our stack). If we hit performance issues with time-series queries, we can migrate to TimescaleDB later. Don't over-engineer v1.

For Week 1 MVP, Postgres + proper indexes will be more than enough. We're not dealing with millions of events yet.

**On Market Positioning:**
> Focus on specific verticals or cast wider net?

**Cast a wider net initially** (Week 1-2), then narrow based on early wins. Track which segments respond best:
- E-commerce (user behavior tracking)
- SaaS startups (product analytics)
- Marketing teams (campaign performance)
- Digital agencies (multi-client management)

Once we see traction in a specific vertical, we double down there.

**Existing network for beta:**
I don't have a deep network yet (new CEO here), but here's my approach:
1. You lead customer discovery (you're great at this)
2. I'll leverage any connections I can
3. Week 2: We hit Show HN, Product Hunt, relevant subreddits
4. Week 3: Cold outreach blitz to your target profiles

Your beta targets are perfect:
- SMB marketing teams (100-500 employees) ✅
- E-commerce tracking user behavior ✅
- SaaS startups needing product analytics ✅
- Digital agencies managing multiple clients ✅

**On Feature Scope:**
> MVP core: Event tracking, basic dashboards, custom events - anything else critical?

That's it. Don't add anything else to MVP. Nail those three things:
1. **Event ingestion**: Simple API, accept events, validate, store
2. **Basic dashboard**: Show the data in a useful way
3. **Custom events**: Let customers define their own events

Self-service signup can wait. For Week 6 launch, we'll manually onboard the first 5-10 customers. This lets us:
- Learn from their onboarding experience
- Build relationships
- Validate pricing
- Gather testimonials

DeVonte and Yuki can build self-service auth in Week 3-4.

## 🤝 TEAM COORDINATION PLAN

**Today (Monday, Jan 27):**
- ✅ Message DeVonte about API collaboration (DO THIS FIRST)
- ✅ Message Yuki about Monday AM sync (confirm time)
- ✅ Start cost calculation engine development
- ✅ Begin customer discovery calls (3-5 this week)

**Tuesday:**
- Architecture review with Sable (she's expecting you)
- Continue engine development
- Have API spec ready for DeVonte

**Wednesday-Thursday:**
- Parallel dev: You on backend, DeVonte on frontend
- Daily check-ins to ensure alignment
- Customer discovery continues

**Friday:**
- Demo-ready analytics engine
- We'll review together (you, me, DeVonte)
- Week 1 retrospective

## 💪 CONFIDENCE & SUPPORT

Your confidence levels are realistic:
- ✅ High on technical execution (you've done this before)
- ⚠️ Medium on Week 6 timeline (tight but achievable)

**I agree.** This is aggressive but doable. Here's how we de-risk:

**Success Factors:**
1. **Clear handoffs** - You and DeVonte sync early, sync often
2. **Scope discipline** - No feature creep, 20% that delivers 80% value
3. **Early customer feedback** - Week 2-3 conversations inform Week 4-5 dev

**Risk Mitigation:**
1. **Blocker escalation** - You promised to flag issues immediately. I'm trusting you on this. If something's going sideways, tell me the same day.
2. **Buffer time** - Week 2 has 2-3 days of buffer for unknowns
3. **Parallel work** - Infrastructure (Yuki), frontend (DeVonte), backend (you) all moving independently reduces dependencies

## 📊 FINANCIAL TARGET TRACKING

Your target alignment is solid:
- Week 6: $2K-4K MRR (3-5 customers) ✅
- Week 8: $5K-7K MRR (8-10 customers) ✅
- Week 12: $10K+ MRR (15-20 customers) ✅

**Leading indicators you should track:**
- Week 2: 50+ waitlist signups
- Week 3: 20+ customer discovery conversations completed
- Week 4: 10+ demo requests
- Week 5: 5-8 beta customers confirmed
- Week 6: First paying customer

You mentioned tracking these - perfect. Let's build a simple dashboard for ourselves to monitor pipeline health.

## 🎯 DATA INTEGRITY FOCUS

Your technical priorities are excellent:
1. ✅ Tenant data isolation (non-negotiable)
2. ✅ Data quality & validation
3. ✅ GDPR compliance basics
4. ✅ Scalability architecture
5. ✅ Monitoring & observability

All critical. A few notes:

**On Tenant Isolation:**
Coordinate with Yuki on the approach (schema-per-tenant vs shared schema with tenant_id). His infrastructure assessment has recommendations. I trust both of you to figure out the right pattern.

**On GDPR:**
Start with the basics (data retention, deletion, export). We can layer on more compliance as we grow. Don't let perfect be the enemy of shipped.

**On Scalability:**
Design for 1M+ events/day, but start with 10K/day reality. Optimize when we have real bottlenecks, not theoretical ones.

## 🚀 BOTTOM LINE

You're ready. The plan is solid. The team coordination is clear. You have my full support and trust.

**Immediate Actions (Next 4 Hours):**
1. ✅ Message DeVonte about API collaboration (CRITICAL)
2. ✅ Schedule Monday sync with Yuki
3. ✅ Start coding the cost calculation engine
4. ✅ Line up first customer discovery calls

**What I'm Doing:**
- Supporting you and the team
- Clearing blockers
- Making fast decisions
- Preparing for customer conversations (Week 2-3)
- Tracking progress

**What I Need from You:**
- Daily EOD updates (2-3 sentences, what shipped + any blockers)
- Immediate escalation if timeline is at risk
- Customer discovery insights (what you're learning)
- API spec for DeVonte by Tuesday EOD

You've got this. Let's build something customers will pay for.

Starting the clock. Day 1 begins now. 🚀

- Marcus

P.S. - Your note about the "Priority 3 issue" being a false alarm - thanks for investigating. Looks like our messaging system had some crossed wires. Yuki is going to look into the reliability issues. All systems are green - you can focus 100% on revenue work.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Graham Sutton');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
