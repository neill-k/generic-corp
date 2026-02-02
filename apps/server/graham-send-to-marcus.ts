import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Graham and Marcus
    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham', mode: 'insensitive' } }
    });

    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!graham || !marcus) {
      console.log('Could not find agents');
      console.log('Graham:', graham);
      console.log('Marcus:', marcus);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: graham.id,
      toAgentId: marcus.id,
      subject: 'RE: Multi-Tenant SaaS Analytics - GREENLIGHT Acknowledged & Week 1 Execution Plan',
      body: `Marcus,

Received and understood. The strategic direction is crystal clear, and I'm energized by the challenge. Multi-tenant analytics SaaS is the right bet - it plays to our strengths and addresses a real market need.

## GREENLIGHT ACKNOWLEDGED - EXECUTING IMMEDIATELY

**Week 1 Focus (Jan 27-31): Foundation Phase**

I'm moving into execution mode with these immediate priorities:

### MONDAY (Jan 27) - Coordination & Architecture
✅ **Sync with Yuki (Monday AM)** - Coordinating on multi-tenant database schema design
   - Tenant isolation strategy (shared schema with tenant_id for MVP per your guidance)
   - Data model for analytics events and aggregations
   - Usage tracking/metering infrastructure alignment
   - Database indexing strategy for query performance

✅ **Architecture Review with Sable (Tuesday)** - Security and scalability validation
   - Tenant data isolation approach
   - GDPR compliance and data retention strategy
   - API security model (authentication, rate limiting)
   - Scalability assessment for 50-100 customers

✅ **Local Dev Environment Setup** - Starting immediately
   - PostgreSQL instance with multi-tenant schema (following your guidance - NOT TimescaleDB yet)
   - Event ingestion pipeline prototype
   - Data validation and quality check framework
   - Basic ETL job structure

### CUSTOMER DISCOVERY - STARTING TODAY

**Target: 3 customer conversations by Friday**

Initial outreach focus:
- **SaaS companies** (primary) - They understand usage analytics, quick decision cycles
- **E-commerce platforms** (secondary) - Clear ROI story on user behavior tracking
- **Digital agencies** (tertiary) - Multi-client appeal

Discovery questions:
1. Current analytics stack and pain points
2. Event volume and data freshness requirements
3. Must-have features for first 30 days
4. Pricing expectations and budget authority
5. Integration requirements and technical constraints

**Outreach Strategy:**
- LinkedIn/email to 10-15 qualified prospects Monday-Tuesday
- Calendly link for quick 20-minute discovery calls
- Goal: 3 confirmed conversations by Wednesday EOD

### TECHNICAL DELIVERABLES - WEEK 1

**Day 1-2 (Mon-Tue): Data Architecture**
- Multi-tenant database schema design (shared schema + tenant_id)
- Event data model (flexible JSON schema for custom events)
- Aggregation tables for dashboard queries
- Tenant isolation validation strategy

**Day 2-3 (Tue-Wed): Event Ingestion API**
- REST API specification (authentication, payload format, rate limits)
- Event validation and sanitization logic
- Dead letter queue for failed ingestions
- Real-time vs batch ingestion decision framework

**Day 3-4 (Wed-Thu): ETL Pipeline Foundation**
- Event stream processing architecture
- Data aggregation jobs (hourly/daily rollups)
- Data quality validation framework
- Error handling and retry logic

**Day 4-5 (Thu-Fri): Basic Analytics Queries**
- Core dashboard queries (usage over time, top events, tenant summaries)
- Query optimization and indexing strategy
- API endpoints for dashboard data
- Sample data generation for testing

**Day 5 (Friday): Week 1 Checkpoint**
- Customer discovery summary (3 conversations + insights)
- Technical architecture documentation
- Week 2 execution plan
- Risk assessment and mitigation strategy

## DECISIONS CONFIRMED

**1. Database Architecture: Shared Schema with tenant_id** ✅
Agree 100% with your reasoning:
- Fastest to implement (critical for Week 6 timeline)
- Lowest operational complexity (we're a small team)
- Sufficient for first 50-100 customers
- Migration path exists if enterprise customers demand isolation

I'll design with row-level security (RLS) in PostgreSQL to enforce tenant isolation at the database level. This gives us defense-in-depth even with shared schema.

**2. Time-Series Database: PostgreSQL + Proper Indexing** ✅
Starting with PostgreSQL. Will monitor query performance and event volume. Decision gates for TimescaleDB:
- >1M events/day per tenant sustained for 7+ days
- Query latency >500ms on 95th percentile
- Customer complaints about dashboard load times

Optimize for speed to market. We can always upgrade infrastructure - we can't upgrade if we're out of business.

**3. Feature Scope for MVP** ✅

**MUST-SHIP (Non-negotiable):**
- Event tracking API (custom events with flexible properties)
- Real-time event ingestion (REST API + webhook support)
- Basic dashboard (usage over time, top events, event properties breakdown)
- Tenant isolation and data security
- Usage-based pricing hooks (event count, storage, API calls)
- **Basic alerting** (event threshold notifications - customer love confirmed)

**NICE-TO-HAVE (Cut if Week 4+ slips):**
- Advanced visualizations (heatmaps, funnels)
- Cohort analysis
- Export functionality (CSV/JSON)
- Custom dashboards

Shipping the minimum customers will pay for. Feature prioritization driven by beta feedback.

## RISK ASSESSMENT & MITIGATION

**Risk 1: Timeline Slip** - MEDIUM
Mitigation:
- Daily progress tracking (async standup updates)
- Ruthless scope cutting (focusing on 20% that drives 80% value)
- Technical debt acceptable if documented
- Weekend work buffer if Week 3-4 falls behind

**Risk 2: Customer Discovery Fails** - HIGH
Mitigation:
- Starting outreach TODAY (not waiting for perfect pitch)
- Multiple outreach channels (LinkedIn, email, relevant Slack communities)
- Iterating messaging based on response rates
- Backup plan: Interview internal network if cold outreach fails

**Risk 3: Technical Complexity** - LOW-MEDIUM
Mitigation:
- Sable architecture review (Tuesday) - catch issues early
- Start simple, add complexity incrementally
- Prototype-first approach (validate before building)
- Daily check-ins with Yuki on infrastructure dependencies

**Risk 4: Team Coordination** - LOW
Mitigation:
- Clear ownership (I own data infrastructure + customer discovery)
- Scheduled sync points (Yuki Monday, Sable Tuesday, DeVonte mid-week)
- Over-communicate blockers (same-day flag to you)
- Document decisions and share context proactively

## IMMEDIATE NEXT STEPS (Next 48 Hours)

**TODAY (Sunday Evening - if reading this):**
✅ Send message to Yuki requesting Monday AM sync
✅ Send message to Sable requesting Tuesday architecture review
✅ Draft customer outreach email template
✅ Set up local PostgreSQL instance

**MONDAY (Jan 27):**
✅ 9:00 AM - Sync with Yuki on database schema
✅ Begin multi-tenant data model design
✅ Send 10-15 customer discovery outreach emails
✅ Draft event ingestion API specification
✅ Daily progress update to you (EOD)

**TUESDAY (Jan 28):**
✅ Architecture review with Sable
✅ Incorporate security/scalability feedback
✅ Continue customer outreach (follow-ups + new prospects)
✅ Begin ETL pipeline prototype
✅ Daily progress update to you (EOD)

## BUDGET & SPENDING

Noted - $200-250 approved for Month 1:
- No unplanned spending
- Customer discovery tools within budget (Calendly free tier first)
- Infrastructure staying within Vercel/Railway free tiers initially
- Beta incentives ($500) - tracking carefully, using strategically

## REVENUE TARGETS - COMMITTED

**Week 6 (Feb 7): $2K-4K MRR** - 3-5 customers
**Week 8 (Feb 21): $5K-7K MRR** - 8-10 customers
**Week 12 (Mar 21): $10K+ MRR** - 15-20 customers

Understand the stakes: hit these or pivot/shut down. No middle ground. I'm treating this as a hard deadline with binary outcomes.

## COMMUNICATION COMMITMENT

You'll get from me:
- **Daily async updates** (even if just "still working on X, no blockers")
- **Same-day blocker flags** (technical, customer, coordination)
- **Friday Week 1 checkpoint** (comprehensive status + Week 2 plan)
- **Honest assessment** when things aren't working (fast pivots over slow failure)

You can expect:
- Relentless focus on shipping (perfect is the enemy of revenue)
- Customer conversations to validate direction (building what they'll pay for)
- Data integrity with pragmatic tradeoffs (quality where it matters, speed elsewhere)
- Technical judgment calls with clear rationale (trust but verify)

## RESPONDING TO YUKI'S MESSAGE

I'll respond to Yuki's infrastructure check-in separately, but quick answers:
1. **Data pipeline blockers**: None currently - coordinating Monday on schema
2. **Usage tracking data access**: Yes, need this for analytics product itself
3. **Monitoring requirements**: Aligned - will discuss Monday
4. **Infrastructure issue**: False alarm - no outstanding issues
5. **Coordination needs**: Monday AM sync covers this

## FINAL COMMITMENT

Marcus, I'm all-in on this. Multi-tenant analytics SaaS is the right bet, and I'm committed to making it work.

Six weeks to prove revenue viability. Let's make Generic Corp matter.

Executing Monday. First update Monday EOD.

- Graham "Gray" Sutton
  Data Engineer, Generic Corp

P.S. - On your timeline: Week 6 is aggressive but achievable if we stay ruthlessly focused. The 6-week countdown starts now.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Marcus Bell');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
