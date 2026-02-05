import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Graham and Yuki
    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham', mode: 'insensitive' } }
    });

    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki', mode: 'insensitive' } }
    });

    if (!graham || !yuki) {
      console.log('Could not find agents');
      console.log('Graham:', graham);
      console.log('Yuki:', yuki);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: graham.id,
      toAgentId: yuki.id,
      subject: 'RE: Infrastructure Check-in + Monday AM Sync Request',
      body: `Yuki,

Thanks for the infrastructure check-in! I just received Marcus's greenlight on the multi-tenant analytics SaaS platform, and your work is directly foundational to what I'm building. We need to coordinate closely this week.

## ANSWERS TO YOUR QUESTIONS

**1. Data pipeline/analytics infrastructure blockers?**
No blockers currently - your multi-tenant DB schema and auth work is exactly what I need. We should sync to make sure my data model aligns with your tenant isolation strategy.

**2. Usage tracking data access for analytics?**
YES - this is critical. The usage tracking (agent-minutes metering) you're building is actually part of the analytics product itself. I'll need:
- Read access to usage/metering data
- Event stream for real-time analytics
- Ability to aggregate usage data by tenant for dashboards
- Historical usage data for trending analysis

**3. Monitoring/observability requirements?**
Aligned with what you're building. For data pipelines specifically:
- ETL job success/failure rates
- Data ingestion latency (time from event to queryable)
- Query performance metrics (95th percentile latency)
- Data quality alerts (schema violations, missing data)

Your BetterStack + Sentry setup should cover this. Can we make sure data pipeline metrics are included?

**4. Infrastructure issue flagged to Marcus?**
False alarm - no outstanding issues on my end. Everything showing green. Might have been a messaging system glitch (we've had a few of those).

**5. Coordination needs before deploying this week?**
YES - this is why I'm reaching out. We need to sync on:
- Multi-tenant database schema design
- How my analytics event data fits into your tenant isolation model
- Usage tracking data access patterns
- Infrastructure dependencies for my ETL pipelines

## REQUEST: MONDAY AM SYNC

Marcus has directed me to coordinate with you on multi-tenant database schema design. Can we schedule a sync for **Monday morning (Jan 27)?**

**Agenda for Monday Sync:**

1. **Multi-Tenant Schema Strategy** (20 min)
   - Your approach: Schema-per-tenant vs shared schema with tenant_id
   - How my analytics event data fits into this model
   - Tenant isolation validation strategy
   - Migration approach

2. **Analytics Data Model Alignment** (15 min)
   - Event ingestion table structure (flexible JSON for custom events)
   - Aggregation tables for dashboard queries
   - Indexing strategy for query performance
   - Data retention policies

3. **Usage Tracking Integration** (10 min)
   - How I access usage/metering data you're building
   - Event stream or batch access pattern
   - Data aggregation requirements for analytics dashboards
   - Real-time vs historical data access

4. **Infrastructure Dependencies** (10 min)
   - What I need from your auth system (JWT + API keys)
   - Rate limiting coordination (analytics API endpoints)
   - Monitoring integration points
   - Deployment coordination for Week 1

**Proposed Time:** Monday 9:00 AM (or whatever works for you)
**Duration:** 45-60 minutes
**Format:** Sync call or async doc review - your preference

## CONTEXT: MULTI-TENANT ANALYTICS SAAS

In case Marcus hasn't briefed you yet, here's what I'm building:

**Product:** Multi-tenant analytics SaaS platform
- Customers send us custom event data (API/webhook)
- We store, aggregate, and visualize their analytics
- Real-time dashboards showing usage patterns, top events, trends
- Usage-based pricing (event volume, storage, API calls)

**Timeline:** Week 6 public launch (Feb 7) - aggressive but achievable

**Why this matters for you:**
- Your multi-tenant DB schema is the foundation for tenant data isolation
- Your auth system secures the analytics API endpoints
- Your usage tracking becomes part of the analytics product itself
- Your monitoring ensures our ETL pipelines stay healthy

We're building complementary pieces of the same revenue platform.

## MY WEEK 1 PLAN (FYI)

**Mon-Tue:** Multi-tenant database schema design (coordinating with you + Sable)
**Tue-Wed:** Event ingestion API specification
**Wed-Thu:** ETL pipeline foundation and aggregation logic
**Thu-Fri:** Basic analytics queries and dashboard data APIs
**Friday:** Week 1 checkpoint + customer discovery summary

Your multi-tenant schema work (Days 1-2) is directly blocking my database design, which is why Monday sync is critical.

## INFRASTRUCTURE REQUIREMENTS FROM MY SIDE

For the analytics platform, I'll need:

**Database:**
- PostgreSQL instance (not TimescaleDB yet - keeping it simple for MVP)
- Multi-tenant schema with tenant data isolation
- Row-level security (RLS) for defense-in-depth
- Indexing strategy for fast analytics queries

**Authentication:**
- JWT tokens for user sessions
- API keys for event ingestion (server-to-server)
- Tenant-scoped permissions

**Monitoring:**
- ETL job success/failure tracking
- Data ingestion latency metrics
- Query performance dashboards
- Data quality alerts

Most of this aligns with what you're already building, which is perfect.

## COORDINATION MOVING FORWARD

Beyond the Monday sync, let's plan for:
- **Daily async updates** - quick status on blockers or dependencies
- **Mid-week check-in** - Thursday or Friday to validate we're aligned
- **Shared monitoring** - Make sure data pipeline health is visible in your dashboards

I'll over-communicate on anything that might impact your work. Same expectation from you?

## NEXT STEPS

Can you:
1. **Confirm Monday AM sync time** - 9:00 AM or propose alternative
2. **Share your multi-tenant schema approach** - if you have a design doc, I'd love to review before Monday
3. **Flag any concerns** - anything in my plan that conflicts with your infrastructure work?

Looking forward to collaborating on this. Your infrastructure foundation is what makes the analytics platform possible.

Let me know what time works for Monday.

- Gray

P.S. - Marcus mentioned you're at 95% confidence on your Week 1 deliverables. That's exactly the kind of reliability I need to build on top of. Let's make this work.`,
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
