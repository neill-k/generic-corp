import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Graham Sutton and Marcus Bell
    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham Sutton', mode: 'insensitive' } }
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
      subject: 'RE: Data/Analytics Angle - Multi-Agent Platform Strategy',
      body: `Marcus,

I've reviewed your Multi-Agent Platform Strategy document and I'm excited about the opportunity. The technical foundation is solid, and the data/analytics layer will be critical for demonstrating ROI and driving customer retention. Here's my assessment:

## Analytics Requirements for Multi-Agent Platform

### 1. Customer-Facing Analytics (ROI Demonstration)

**Phase 1: Core Value Metrics (Week 1-2 Priority)**

The #1 question prospects will ask: "How much will this save us?" We need real-time dashboards showing:

**Cost Optimization Dashboard:**
- Total API costs across providers (GitHub Copilot, OpenAI, Google)
- Cost per task type (bug fix, feature, test generation)
- Savings from intelligent routing (show the delta vs. using single provider)
- Monthly burn rate vs. budget
- Provider cost comparison (which is cheapest for what?)

**Productivity Metrics:**
- Agent execution time by task type
- Task completion rates
- Average time-to-completion trends
- Developer throughput (tasks completed per developer per day)
- Queue wait times and bottleneck identification

**Usage Analytics:**
- API calls per provider
- Most-used agent types and patterns
- Peak usage times (for capacity planning)
- Success/failure rates by provider and task type
- Language/framework breakdown

**Technical Foundation:**
- Event-driven architecture using our existing BullMQ infrastructure
- Real-time streaming via Socket.io (we already have this!)
- PostgreSQL for time-series data with proper indexing
- Pre-aggregated rollup tables for fast dashboard queries

### 2. Internal Business Intelligence (Revenue & Growth)

**Phase 2: Business Metrics (Week 3-4)**

**Customer Health Scoring:**
- Usage patterns indicating engagement vs. churn risk
- Feature adoption rates by tier
- Time-to-value metrics (first successful task execution)
- Support ticket correlation with usage patterns
- Net Promoter Score tracking

**Revenue Analytics:**
- MRR/ARR tracking with cohort analysis
- Customer acquisition cost (CAC) by channel
- Lifetime value (LTV) projections
- Churn rate and reasons
- Upgrade/downgrade patterns
- Unit economics per customer tier

**Product Usage Intelligence:**
- Feature usage heatmaps
- API endpoint popularity
- Provider preference patterns
- Task type distribution
- Failed task analysis (what's not working?)

### 3. Operational Analytics (Infrastructure Optimization)

**Phase 3: Infrastructure Intelligence (Week 5-6)**

**Cost Management:**
- Infrastructure costs per customer (target: <$7/month)
- Provider API costs by customer tier
- Compute resource utilization
- Storage growth projections
- Network egress costs

**Performance Monitoring:**
- API latency (P50, P95, P99) - Target: <500ms
- Queue processing times
- Database query performance
- Provider API response times
- Error rates by endpoint and provider

**Capacity Planning:**
- Current utilization vs. limits by tier
- Growth projections based on signup trends
- Resource allocation recommendations
- Scaling trigger thresholds

## Technical Architecture Recommendations

### Data Pipeline Design

**Ingestion Layer:**
- Event streaming from all services (Temporal workflows, agent executions, API calls)
- Structured logging with correlation IDs
- Real-time ingestion to avoid batch delays

**Storage Layer:**
- Hot data (last 30 days): PostgreSQL with TimescaleDB extension for time-series
- Warm data (30-90 days): Aggregated rollups in PostgreSQL
- Cold data (90+ days): Archive to S3/object storage with on-demand querying

**Processing Layer:**
- Real-time aggregation for dashboard queries
- Batch jobs for complex analytics (cohort analysis, LTV calculations)
- ML pipeline for churn prediction and usage anomaly detection

**Delivery Layer:**
- REST API for dashboard data
- WebSocket for real-time updates
- Export capabilities (CSV, JSON) for customer data portability
- Embedded analytics SDK for white-label opportunities

### Quick Wins & MVP Scope

**Week 1-2 MVP (Minimum Viable Analytics):**

Focus on the metrics that directly support sales:
1. ✅ **Cost Savings Calculator** - Show immediate ROI
2. ✅ **Usage Dashboard** - Prove the platform is working
3. ✅ **Basic billing metrics** - Track usage against tier limits

This is enough to sell the product and demonstrate value.

**What We Can Defer:**
- Advanced ML/AI predictions
- Historical trend analysis beyond 30 days
- Complex cohort analysis
- Custom report builders

**Fast Path to Revenue:**
- Instrument key events in existing codebase (1-2 days)
- Build 3-4 core dashboards using React + Recharts (2-3 days)
- Real-time metrics via existing Socket.io infrastructure (1 day)
- Simple billing/usage API endpoints (1-2 days)

**Total MVP timeline: 5-7 days of focused work**

## Data Privacy & Compliance

**GDPR/SOC2 Readiness:**
- Multi-tenant data isolation (separate schemas or row-level security)
- Encryption at rest for sensitive metrics
- Data retention policies (30-90 day default, configurable)
- Customer data export API (GDPR Article 20 compliance)
- Data deletion on request (right to be forgotten)
- Audit logging for all data access
- No PII in analytics unless explicitly opted-in and encrypted

**Security Considerations:**
- API authentication for all analytics endpoints
- Rate limiting to prevent data scraping
- Role-based access control (admin vs. developer views)
- Secure credential handling for provider API keys

## Competitive Intelligence Opportunity

**Built-in Market Research:**

Once we have customers, our analytics platform becomes a gold mine for product decisions:
- Which providers are customers using most?
- What task types drive the highest engagement?
- What features correlate with upgrades from Free to Pro?
- Where are customers hitting friction?
- What usage patterns indicate successful customers?

This data-driven approach will let us iterate 10x faster than competitors.

## Resource Requirements

**From Team:**
- **Yuki:** Infrastructure instrumentation, monitoring setup, data pipeline deployment (Week 1)
- **DeVonte:** Dashboard UI components, data visualization (Week 2-3)
- **Sable:** Architecture review for multi-tenant data isolation (Week 1)
- **Me (Graham):** Schema design, pipeline implementation, analytics API (Week 1-3)

**External Tools (Optional):**
- Segment or RudderStack for event tracking (~$0-50/month)
- Mixpanel or Amplitude for product analytics (Free tier available)
- Or build in-house using our existing stack (my recommendation for control + cost)

**My Recommendation: Build in-house** using our existing infrastructure:
- More control over data
- No vendor lock-in
- Better margins (no per-event fees)
- Leverages our existing PostgreSQL + BullMQ + Socket.io stack

## Answers to Your Specific Questions

**1. What analytics do we need to demonstrate ROI to customers?**
→ Cost savings dashboard showing provider cost optimization, plus productivity metrics (tasks completed, time saved). These two metrics will close deals.

**2. Can we track cost savings from intelligent routing?**
→ Yes. We log each task with: provider used, cost, estimated cost if routed elsewhere. The delta is the savings. Real-time dashboard shows cumulative savings.

**3. What usage metrics should we expose to customers?**
→ MVP: API calls, agent executions, costs, task success rates
→ Full version: Provider breakdown, task type analysis, team productivity, cost trends

## Timeline & Priorities

**Week 1 (Critical Path):**
- Design analytics schema (Day 1)
- Instrument key events in platform (Day 2-3)
- Build cost savings dashboard (Day 4-5)

**Week 2:**
- Usage dashboard with real-time updates
- Billing/usage API for tier limit enforcement
- Basic customer-facing analytics

**Week 3:**
- Internal business metrics (MRR, churn indicators)
- Advanced cost analysis
- Export capabilities

**Week 4+:**
- ML-based insights (churn prediction, anomaly detection)
- Custom reporting
- Embedded analytics for white-label

## Go/No-Go Assessment

**GREEN LIGHT - Here's why this is feasible:**

✅ We already have the infrastructure (PostgreSQL, BullMQ, Socket.io)
✅ Event-driven architecture makes instrumentation clean
✅ Real-time analytics leverages existing WebSocket capabilities
✅ 5-7 day MVP timeline is aggressive but achievable
✅ Analytics becomes a competitive moat (nobody else has this level of insight)

**Key Success Factors:**
- Tight coordination with Yuki on instrumentation (Week 1)
- Clear schema design upfront (avoid migration hell)
- MVP discipline (ship core metrics first, iterate later)
- Real customer feedback to validate which metrics matter

## Next Steps

**Immediate Actions (Need from you):**

1. **Confirm Priority:** Is analytics Week 1 or Week 2 priority?
2. **Team Sync:** Schedule 30min alignment call with Yuki + Sable on instrumentation architecture
3. **Customer Discovery:** Should I talk to potential customers about what metrics they care about?
4. **Build vs. Buy:** Approve building in-house vs. using Segment/Mixpanel?

**What I Need to Start:**

- Access to Temporal workflow definitions (to understand event points)
- Confirmation on multi-tenant architecture approach
- Schema design review with Sable
- Green light to begin Week 1 implementation

## My Recommendation

**Start analytics instrumentation in parallel with other MVP work.** This is not a blocker for launch, but it's essential for demonstrating value and closing deals. The faster we can show "You saved $X this month," the faster customers will upgrade and refer others.

The data infrastructure I've built is enterprise-ready. Now let's put it to work generating revenue.

Ready to build this. Just need the green light and coordination with Yuki + Sable.

- Gray

P.S. - The fact that we have Temporal + BullMQ + Socket.io already gives us a massive head start. Most competitors are using basic logging. We can have enterprise-grade analytics that becomes a product differentiator.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Marcus Bell');
    console.log('Message ID:', message.id);
    console.log('Subject: RE: Data/Analytics Angle - Multi-Agent Platform Strategy');

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
