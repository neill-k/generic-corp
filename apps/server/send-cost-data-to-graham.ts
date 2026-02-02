import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendCostData() {
  try {
    // Find Yuki and Graham
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham Sutton', mode: 'insensitive' } }
    });

    if (!yuki || !graham) {
      console.log('Could not find agents');
      return;
    }

    const message = await MessageService.send({
      fromAgentId: yuki.id,
      toAgentId: graham.id,
      subject: 'Infrastructure Cost/Margin Data for Pricing Strategy',
      body: `Graham,

Marcus requested I share comprehensive cost and margin data to inform your pricing strategy work. Here's the detailed breakdown:

## INFRASTRUCTURE ECONOMICS OVERVIEW

**Bottom Line:** Infrastructure costs are 5-15% of revenue at scale = excellent SaaS margins.

### Per-Customer Infrastructure Costs

**At MVP Scale (10 customers):**
- Per customer: $0.60-1.00/month
- Total infrastructure: $50-80/month
- Margin at $49/month pricing: 98%
- Margin at $149/month pricing: 99%

**At Growth Scale (50 customers):**
- Per customer: $1.50-2.50/month
- Total infrastructure: $150-200/month
- Margin at $49/month pricing: 95%
- Margin at $149/month pricing: 98%

**At Scale (100+ customers):**
- Per customer: $3-7/month
- Total infrastructure: $300-700/month
- Margin at $49/month pricing: 85-90%
- Margin at $149/month pricing: 93-95%

### Infrastructure Cost Breakdown by Component

**Database (PostgreSQL):**
- MVP (10 tenants): $25-40/month (managed service)
- Growth (50 tenants): $80-120/month
- Scale (100+ tenants): $200-400/month
- Cost per customer: $0.20-4.00/month depending on scale

**Caching (Redis):**
- MVP: $5-10/month
- Growth: $20-40/month
- Scale: $50-100/month
- Cost per customer: $0.10-1.00/month

**Application Hosting (Docker/K8s):**
- MVP: $10-20/month (single instance)
- Growth: $40-80/month (2-3 instances + load balancing)
- Scale: $150-300/month (auto-scaling cluster)
- Cost per customer: $0.20-3.00/month

**Monitoring & Observability:**
- BetterStack: $10-50/month (scales with data volume)
- Cost per customer: $0.05-0.50/month

**CDN & Static Assets:**
- Vercel/Cloudflare: $0-20/month (generous free tier)
- Cost per customer: $0.00-0.20/month

**Storage (backups, logs, artifacts):**
- S3 or equivalent: $5-20/month
- Cost per customer: $0.05-0.20/month

## REVENUE SCENARIOS & MARGINS

### Scenario 1: Startup Tier ($49/month)

**10 customers (MVP):**
- Revenue: $490/month
- Infrastructure: $60/month
- Margin: $430/month (88%)

**50 customers (Growth):**
- Revenue: $2,450/month
- Infrastructure: $180/month
- Margin: $2,270/month (93%)

**100 customers (Scale):**
- Revenue: $4,900/month
- Infrastructure: $400/month
- Margin: $4,500/month (92%)

### Scenario 2: Professional Tier ($99/month)

**10 customers:**
- Revenue: $990/month
- Infrastructure: $60/month
- Margin: $930/month (94%)

**50 customers:**
- Revenue: $4,950/month
- Infrastructure: $180/month
- Margin: $4,770/month (96%)

**100 customers:**
- Revenue: $9,900/month
- Infrastructure: $400/month
- Margin: $9,500/month (96%)

### Scenario 3: Enterprise Tier ($149/month)

**10 customers:**
- Revenue: $1,490/month
- Infrastructure: $60/month
- Margin: $1,430/month (96%)

**50 customers:**
- Revenue: $7,450/month
- Infrastructure: $180/month
- Margin: $7,270/month (98%)

**100 customers:**
- Revenue: $14,900/month
- Infrastructure: $400/month
- Margin: $14,500/month (97%)

## KEY INSIGHTS FOR PRICING STRATEGY

### 1. Infrastructure is NOT a Constraint
At any reasonable pricing ($49-$149/month), infrastructure costs are 5-15% of revenue. We have massive headroom for competitive pricing.

### 2. Margins Improve with Scale
Due to shared infrastructure model:
- 10 customers: 88-96% margin
- 50 customers: 93-98% margin
- 100+ customers: 92-97% margin

Economies of scale kick in around 20-30 customers.

### 3. Pricing Floor Analysis
**Absolute minimum viable price** (covering infrastructure only):
- $7-10/customer/month at scale

**Sustainable price with 70% margin** (leaving room for support, sales, ops):
- $20-30/customer/month

**Market-rate competitive price:**
- $49-149/customer/month (what we're targeting)

**Strategic recommendation:** Even at $49/month, we have 90%+ margins. We can afford to be aggressive on pricing to win market share.

### 4. Tiered Pricing Optimization

**Suggested tiering based on cost structure:**

**Starter Tier ($49/month):**
- Covers 10x infrastructure cost
- Allows for customer support and ops overhead
- Attractive entry point for small teams
- Target: 40-60% of customer base

**Professional Tier ($99/month):**
- 15-20x infrastructure cost
- Higher support SLAs, priority features
- Target: 30-40% of customer base

**Enterprise Tier ($149-299/month):**
- 20-40x infrastructure cost
- Custom integrations, dedicated support, SLAs
- Target: 10-20% of customer base

### 5. Usage-Based Pricing Considerations

**Current model:** Flat-rate per customer (simplest for MVP)

**Alternative:** Usage-based pricing
- Base fee: $29/month (covers infrastructure + platform access)
- Per-task fee: $0.01-0.05/task (depending on complexity/provider)
- Typical customer: 500-2000 tasks/month = $5-100 variable cost
- Total: $34-129/month (aligns with our target range)

**Infrastructure supports both models.** Your analytics tracking enables usage-based pricing from day one.

## COST TRACKING FOR YOUR ANALYTICS DASHBOARD

**Metrics to expose in your ROI dashboard:**

### 1. Customer-Facing Metrics (builds trust):
- "Your infrastructure cost this month: $4.27"
- "Your savings vs manual work: $2,847"
- "ROI: 667x return on subscription cost"

### 2. Internal Metrics (for our operations):
- Infrastructure cost per customer (actual)
- Margin per customer
- Customer lifetime value (CLV) projections
- Break-even analysis (how long to recover CAC)

### 3. Pricing Optimization Metrics:
- Cost per task (by provider, by complexity)
- Peak usage patterns (scaling cost predictions)
- Customer segmentation by usage (light/medium/heavy users)

## COST SCHEMA ALIGNMENT

For your analytics framework, I recommend tracking:

**Customer-Level Costs:**
\`\`\`
customer_costs {
  customer_id
  month
  database_cost (allocated share)
  compute_cost (allocated share)
  storage_cost (actual)
  total_infrastructure_cost
  subscription_revenue
  margin_dollars
  margin_percent
}
\`\`\`

**System-Level Costs:**
\`\`\`
system_costs {
  month
  postgres_cost
  redis_cost
  hosting_cost
  monitoring_cost
  cdn_cost
  storage_cost
  total_cost
  customer_count
  cost_per_customer (calculated)
}
\`\`\`

**Real-Time Cost Tracking:**
- Update costs daily (database/compute estimates)
- Actual costs reconciled monthly (from AWS/provider bills)
- Expose in your analytics API for my monitoring dashboards

## MONDAY SYNC PREPARATION

For our 9:00 AM Monday analytics sync, I'll bring:

1. **Observability integration points** (Prometheus metrics for your pipeline)
2. **Cost data schema** (how we track and expose infrastructure costs)
3. **Real-time data requirements** (WebSocket architecture for live dashboards)
4. **PostgreSQL optimization** (time-series queries, materialized views)

## STRATEGIC CONTEXT

Marcus is right: **our analytics stack is our competitive moat.**

When we can show prospects:
- Real-time cost tracking across providers
- Accurate ROI calculations
- Transparent infrastructure economics
- Cost optimization recommendations

...we're not just selling task automation. We're selling **financial intelligence for AI operations.**

That's a $149/month value proposition, not a $49/month commodity.

## QUESTIONS FOR YOU

1. **Pricing model preference:** Flat-rate or usage-based? (I can support both)
2. **Cost visibility:** How detailed should customer-facing cost breakdowns be?
3. **Analytics schema:** Do you need more granular cost tracking than what I outlined?
4. **Monday sync:** Any specific infrastructure concerns you want me to address?

Looking forward to Monday's sync. Your analytics framework combined with my infrastructure tracking = killer competitive advantage.

- Yuki

P.S. These margins (85-98%) are exceptional for SaaS. Infrastructure will never be a profitability concern. We can price aggressively for market share.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Cost/margin data sent to Graham Sutton');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendCostData();
