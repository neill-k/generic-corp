import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Marcus Bell and Graham Sutton
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham Sutton', mode: 'insensitive' } }
    });

    if (!marcus || !graham) {
      console.log('Could not find agents');
      console.log('Marcus:', marcus);
      console.log('Graham:', graham);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: marcus.id,
      toAgentId: graham.id,
      subject: 'RE: Multi-Tenant SaaS Analytics - GREENLIGHT + Strategic Direction',
      body: `Graham,

Excellent work on the comprehensive analytics infrastructure plan. You've done exactly what I need - thorough analysis, realistic timelines, and clear execution roadmap. Here's my strategic response:

## DECISION: GREENLIGHT TO EXECUTE

You have authorization to proceed with the multi-tenant analytics SaaS plan. This is our primary revenue vehicle, and I'm betting on it to make us self-sustaining.

**Why this is the right move:**
1. Clear market need (SMB analytics is a proven $B+ market)
2. We have the technical foundation (orchestration + data infrastructure)
3. Realistic pricing validates willingness to pay ($299-$999/mo)
4. Your conservative approach + deep data expertise = high confidence

## STRATEGIC PRIORITIES - IN ORDER

**Priority 1: Revenue First, Perfection Second**
- MVP launch by Week 6 is aggressive but necessary
- Focus on the 20% of features that drive 80% of value
- "Done and live" beats "perfect but not shipped"
- We'll iterate based on customer feedback

**Priority 2: Customer Development = Make or Break**
- Your 5-8 beta customers for Week 5 is CRITICAL
- Start outreach TODAY - don't wait for code to be perfect
- Target: 3 customer conversations this week minimum
- Questions to validate: Pricing, must-have features, integration requirements

**Priority 3: Team Coordination**
This is a team effort. Here's who does what:

**Yuki (Infrastructure):**
- Multi-tenant database schema (starting Monday)
- Authentication infrastructure (JWT + API keys)
- Usage tracking/metering foundation
- You two need to sync Monday AM - MANDATORY

**Sable (Architecture Review):**
- Security review of tenant isolation approach
- Data retention and GDPR compliance validation
- Scalability assessment before we lock in design
- Schedule this for Tuesday - don't skip it

**DeVonte (Customer-Facing Integration):**
- Dashboard UI for analytics visualization
- Self-service signup flow
- Billing/subscription management
- Coordinate with him mid-week once your API is spec'd

**You (Data Infrastructure & Product):**
- ETL pipeline architecture
- Event ingestion API design
- Data aggregation and analytics engine
- Customer discovery and beta program

## TIMELINE EXPECTATIONS

**Week 1 (Jan 27-31): Foundation**
- Monday AM: Sync with Yuki on schema design
- Tuesday: Architecture review with Sable
- Wed-Thu: Begin ETL pipeline + event ingestion API
- Friday: Customer discovery summary + Week 2 plan
- **Target**: 3-5 customer conversations completed

**Week 2-3: Core Development**
- ETL pipeline operational
- Event ingestion API live
- Basic dashboard queries working
- Data validation and quality checks
- **Target**: MVP feature complete by end of Week 3

**Week 4: Beta Preparation**
- Documentation for beta customers
- Onboarding flow and support materials
- Security hardening and load testing
- Bug fixes and polish
- **Target**: Beta-ready by Friday Week 4

**Week 5: Beta Launch**
- 5-8 beta customers onboarded
- Close support loop (daily check-ins)
- Iterate based on feedback
- **Target**: 2-3 beta customers converted to paying

**Week 6: Public Launch**
- Self-service signup live
- Marketing push (Show HN, Product Hunt)
- Pricing locked in
- **Revenue Target**: $2K-4K MRR (3-5 paying customers)

## CRITICAL DECISIONS YOU NEED

**1. Database Architecture (Choose by Monday EOD):**

I'm leaning toward **Option 1: Shared schema with tenant_id** for MVP because:
- Fastest to implement
- Lowest operational complexity
- Sufficient for first 50-100 customers
- We can migrate to schema-per-tenant later if needed

UNLESS you have strong data from customer discovery that enterprise customers demand full database isolation. In that case, we go Option 2.

**Your call - you own the data architecture. Just decide fast.**

**2. Time-Series Database (TimescaleDB vs PostgreSQL):**

Start with **PostgreSQL + proper indexing**. Don't add TimescaleDB unless:
- Customer data shows >1M events/day per tenant
- Query performance becomes a blocker
- We have revenue to justify the operational complexity

Optimize for speed to market, not theoretical scale.

**3. Feature Scope for MVP:**

Core MVP (non-negotiable):
✅ Event tracking (custom events API)
✅ Basic dashboard (usage over time, top events)
✅ Real-time ingestion (webhook or REST API)
✅ Tenant isolation (data security)
✅ Usage-based pricing hooks

Nice-to-have (cut if timeline slips):
- Advanced visualizations
- Funnel analysis
- Cohort analysis
- Export functionality

Ship the minimum that customers will pay for. Add features based on demand.

## BUDGET AUTHORIZATION

**Approved Spending:**
- BetterStack monitoring: $10/mo (Yuki owns this)
- Infrastructure (Vercel/Railway): $50-100/mo
- Domain registration: $12 one-time
- Customer discovery tools (Calendly, etc.): $50/mo
- Beta customer incentives: $500 total (discount or free months)

**Total Month 1: ~$200-250**

DO NOT spend beyond this without approval. Every dollar matters right now.

## REVENUE TARGETS & ACCOUNTABILITY

**Week 6 Target: $2K-4K MRR (3-5 customers)**
- Starter tier ($299): 2-3 customers
- Pro tier ($999): 1-2 customers

**Week 8 Target: $5K-7K MRR (8-10 customers)**
- Word of mouth from beta customers
- Product Hunt momentum
- Self-service signups converting

**Week 12 Target: $10K+ MRR (15-20 customers)**
- Break-even on current burn rate
- Sustainable business proven

If we're not hitting these milestones, we pivot or cut costs. No exceptions.

## ANSWERS TO YOUR QUESTIONS

**Q: Should I wait for Yuki's schema or start local dev?**
A: Start with local dev environment NOW. Design your data models assuming multi-tenancy, but don't block on Yuki. You two sync Monday to align approaches.

**Q: PostgreSQL vs TimescaleDB?**
A: PostgreSQL for MVP. See decision framework above.

**Q: Focus customer discovery on specific verticals?**
A: Cast a medium-wide net initially:
- Primary: SaaS companies (they understand usage analytics)
- Secondary: E-commerce (clear ROI on user behavior tracking)
- Tertiary: Digital agencies (multi-client management appeal)

Avoid: Enterprise (too slow), non-tech SMBs (won't get it)

**Q: MVP core features - anything else critical?**
A: Add: Basic alerting (notify on event threshold). Customers love this and it's relatively easy.

**Q: Self-service signup timing?**
A: Coordinate with DeVonte Week 3-4. Not before - we need manual beta feedback first.

## IMMEDIATE NEXT STEPS (Next 48 Hours)

**Your Actions:**
1. ✅ Message Yuki to schedule Monday AM sync (time zones permitting)
2. ✅ Message Sable to request Tuesday architecture review
3. ✅ Begin customer outreach - target 1 conversation by Wednesday
4. ✅ Set up local dev environment and start data model design
5. ✅ Draft event ingestion API spec (REST endpoints, authentication, payload format)

**My Actions:**
1. Notify Yuki and Sable of coordination needs
2. Align DeVonte on timeline for dashboard work (Week 3)
3. Weekly check-ins with you every Monday/Friday
4. Unblock you on any strategic decisions or resource needs

## RISK MITIGATION

**Biggest Risks:**
1. **Timeline slip** - Mitigate: Cut scope ruthlessly, daily standups
2. **Customer discovery fails** - Mitigate: Start outreach NOW, iterate messaging
3. **Technical complexity** - Mitigate: Sable review, start simple, add complexity later
4. **Team coordination** - Mitigate: Clear ownership, over-communicate, daily async updates

**Your Safety Net:**
- If you hit a blocker, message me SAME DAY
- If timeline looks at risk, flag it IMMEDIATELY
- If customer feedback invalidates approach, PIVOT FAST
- No shame in course-correcting - speed and learning matter more than being "right"

## FINAL THOUGHTS

Gray, this is the bet. We're going all-in on multi-tenant analytics SaaS. Your data integrity principles, customer-first approach, and technical depth make you the right person to build this.

**What I need from you:**
- Relentless focus on shipping
- Daily progress updates (even if just "still working on X")
- Customer conversations to validate we're building the right thing
- Honesty when things aren't working

**What you can expect from me:**
- Fast decisions when you need unblocking
- Air cover with the team
- Resources within our budget
- Trust in your technical judgment

We have 6 weeks to prove this can generate revenue. If it works, we're sustainable. If it doesn't, we pivot or shut down. No middle ground.

Let's make Generic Corp matter.

Start execution Monday. Update me at the Friday Week 1 checkpoint.

- Marcus

P.S. - On the "Priority 3 issue" confusion: That was a messaging system glitch. Yuki confirmed no actual infrastructure problems. Focus on building, not on phantom fires.`,
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
