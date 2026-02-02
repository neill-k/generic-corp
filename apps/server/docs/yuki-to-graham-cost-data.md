# Infrastructure Cost & Margin Data for Pricing Strategy

**Date:** January 26, 2026
**From:** Yuki Tanaka (SRE)
**To:** Graham Sutton (Data Engineer)
**Purpose:** Cost attribution data to inform pricing model and ROI calculations

---

## Executive Summary

Per Marcus's directive, sharing infrastructure cost analysis to support your pricing strategy work. The economics are **extremely favorable** for SaaS - 85-95% gross margins at scale.

**Key Insight:** Our multi-tenant architecture gives us incredible unit economics. Infrastructure cost is $0.60-7/customer/month vs. proposed revenue of $49-149/customer/month.

---

## Infrastructure Cost Breakdown

### Per-Customer Costs (Monthly)

**Shared Infrastructure Components:**
- Database allocation (shared PostgreSQL): $0.30-0.40/customer
- Redis cache/queue allocation: $0.10-0.15/customer
- Compute allocation (shared K8s nodes): $0.15-0.20/customer
- Load balancer allocation: $0.02-0.03/customer
- **Subtotal: $0.60-0.80/customer/month**

**Isolated Resources (Usage-Based):**
- Dedicated schema storage: $0.20-0.50/customer (depends on data volume)
- Temporal namespace overhead: $0.10-0.20/customer
- Redis namespace keys: $0.05-0.10/customer
- API request processing: $0.15-0.30/customer (depends on usage)
- **Subtotal: $0.50-1.10/customer/month**

**Monitoring & Operations:**
- Metrics storage (per-tenant labels): $0.05-0.10/customer
- Log storage (7-day retention): $0.03-0.07/customer
- Alerting overhead: $0.02-0.03/customer
- **Subtotal: $0.10-0.20/customer/month**

### Total Per-Customer Cost Range

**By Usage Tier:**
- **Light users (Free tier):** $0.60-1.20/month
- **Moderate users (Starter tier):** $1.50-3.00/month
- **Heavy users (Growth tier):** $3.00-7.00/month
- **Enterprise (custom):** $7.00-15.00/month

**Average across all tiers:** ~$2.50-4.00/customer/month

---

## Baseline Production Infrastructure

**Fixed Monthly Costs (Supports 1-100 customers):**

**Kubernetes Cluster:**
- EKS/GKE control plane: $150/month
- Compute nodes (3x m5.xlarge): $450/month
- **Subtotal: $600/month**

**Data Layer:**
- PostgreSQL RDS (db.r6g.xlarge Multi-AZ): $650/month
- Redis ElastiCache (3x cache.r6g.large): $500/month
- **Subtotal: $1,150/month**

**Networking & CDN:**
- Load balancer: $25/month
- Data transfer (baseline): $100-200/month
- **Subtotal: $125-225/month**

**Storage & Backups:**
- S3 storage (backups, logs): $50-100/month
- Database backups: $50/month
- **Subtotal: $100-150/month**

**Monitoring Stack:**
- Prometheus/Grafana infrastructure: $100-200/month
- Log aggregation (Loki): $50-100/month
- **Subtotal: $150-300/month**

**Total Fixed Costs: $2,025-2,425/month**

---

## Break-Even Analysis

**Scenario 1: Conservative Pricing ($49/customer/month)**
- Break-even customers: 42-50 customers
- At 100 customers: $4,900 revenue - $2,400 fixed - $250 variable = **$2,250 profit (46% margin)**

**Scenario 2: Moderate Pricing ($99/customer/month)**
- Break-even customers: 21-25 customers
- At 100 customers: $9,900 revenue - $2,400 fixed - $250 variable = **$7,250 profit (73% margin)**

**Scenario 3: Premium Pricing ($149/customer/month)**
- Break-even customers: 14-17 customers
- At 100 customers: $14,900 revenue - $2,400 fixed - $250 variable = **$12,250 profit (82% margin)**

---

## Scaling Economics

### At 10 Customers (Beta Phase)
- Revenue (at $99/customer): $990/month
- Fixed infrastructure: $2,025/month
- Variable costs: $25/month
- **Net: -$1,060/month loss** (expected during beta)

### At 50 Customers (Growth Phase)
- Revenue (at $99/customer): $4,950/month
- Fixed infrastructure: $2,025/month
- Variable costs: $125/month
- **Net: $2,800/month profit (56% margin)**

### At 100 Customers (Scale Phase)
- Revenue (at $99/customer): $9,900/month
- Fixed infrastructure: $2,225/month (slight increase)
- Variable costs: $250/month
- **Net: $7,425/month profit (75% margin)**

### At 500 Customers (Enterprise Scale)
- Revenue (at $99/customer): $49,500/month
- Fixed infrastructure: $4,500/month (scaled up, read replicas added)
- Variable costs: $1,500/month
- **Net: $43,500/month profit (88% margin)**

---

## Cost Attribution for ROI Analytics

### Metrics You Should Track Per Customer

**Compute Costs:**
- API request count × average CPU cost per request
- Background job count × worker cost per job
- Estimated: $0.15-0.30/customer/month

**Database Costs:**
- Query count × average query cost
- Schema storage size × storage cost per GB
- Connection time × connection pool cost
- Estimated: $0.30-0.50/customer/month

**Redis Costs:**
- Key operation count × operation cost
- Memory usage × memory cost per MB
- Estimated: $0.10-0.15/customer/month

**Bandwidth Costs:**
- Data transfer volume × egress cost per GB
- Estimated: $0.05-0.20/customer/month (highly variable)

**Total Measurable:** $0.60-1.15/customer/month

**Overhead Allocation (shared services):** $0.40-0.60/customer/month

**Grand Total:** $1.00-1.75/customer/month (conservative)

---

## Pricing Strategy Recommendations

### Tier Structure (Based on Cost Data)

**Free Tier (Community Edition):**
- Self-hosted only (zero infrastructure cost to us)
- Builds brand and community
- Lead generation for paid tiers
- **Cost to us: $0/month**

**Starter Tier ($49-69/customer/month):**
- Light usage limits (10 agents, 50 tasks/day)
- Estimated infrastructure cost: $1.20-2.00/customer
- **Gross margin: 92-97%**

**Growth Tier ($99-129/customer/month):**
- Moderate usage (100 agents, 200 tasks/day)
- Estimated infrastructure cost: $3.00-5.00/customer
- **Gross margin: 91-96%**

**Enterprise Tier ($249+/customer/month):**
- Heavy usage or custom limits
- Dedicated support, SLA guarantees
- Estimated infrastructure cost: $7.00-15.00/customer
- **Gross margin: 88-94%**

### Pricing Psychology

**Anchor on value, not cost:**
- Our infrastructure cost is irrelevant to customer
- Value = Developer productivity × salary cost
- If we save 1 hour/week of a $100K developer, that's $2,500/year value
- Pricing at $1,200/year ($100/month) is still 50% discount vs. value created

**Competitive Positioning:**
- GitHub Copilot: $19-39/month (single provider, no orchestration)
- OpenAI API: Variable, complex billing
- Our platform: $99/month (multi-provider, intelligent routing, cost optimization)
- **We can charge 2-3× single-provider pricing due to orchestration value**

---

## Usage-Based Pricing Considerations

### If You Want to Implement Metering

**Metered Units:**
- API requests: $0.001 per request (plus base plan fee)
- Agent hours: $0.10 per agent-hour
- Task completions: $0.05 per task
- Storage: $0.50 per GB per month

**Hybrid Model Example:**
- Base plan: $49/month (includes 10,000 requests, 50 agent-hours, 10 GB)
- Overage: Metered pricing kicks in above limits
- **This matches typical SaaS patterns (Stripe, Twilio, AWS)**

**Infrastructure Cost Supports This:**
- We know exact cost per API request, task, storage GB
- Can price with healthy margin on metered usage
- Customers pay for what they use (perceived fairness)

---

## Data for Your Analytics Platform

### Cost Tracking Requirements

For your ROI calculation engine, I can provide:

**Real-Time Metrics:**
- Per-customer resource usage (CPU, memory, database queries)
- Per-customer API request counts
- Per-customer storage consumption
- Per-customer bandwidth usage

**Daily Aggregations:**
- Daily cost attribution per customer
- Weekly/monthly billing data
- Usage trends over time

**Cost Allocation Accuracy:**
- Direct costs (measured): 60-70% accuracy
- Allocated costs (estimated): 30-40% accuracy
- **Combined: Directionally accurate for billing**

### Integration Points

**Prometheus Metrics:**
```yaml
# I'll expose these metrics for your analytics pipeline
- customer_cpu_usage_seconds{customer_id}
- customer_memory_usage_bytes{customer_id}
- customer_api_requests_total{customer_id}
- customer_db_queries_total{customer_id}
- customer_redis_operations_total{customer_id}
- customer_storage_bytes{customer_id}
```

**Cost Calculation Service:**
```typescript
// Endpoint you can query for cost data
GET /api/internal/cost-attribution?customerId=xxx&period=monthly

Response: {
  customerId: "customer-123",
  period: "2026-01",
  costs: {
    compute: 0.45,
    database: 0.62,
    redis: 0.18,
    storage: 0.35,
    bandwidth: 0.12,
    overhead: 0.50,
    total: 2.22
  },
  usage: {
    apiRequests: 15420,
    dbQueries: 42350,
    storageGB: 2.4,
    bandwidthGB: 5.7
  }
}
```

---

## ROI Demonstration for Sales

### Customer ROI Calculation

**Scenario: 50-developer team using our platform**

**Without our platform:**
- Each developer uses GitHub Copilot: $39/month × 50 = $1,950/month
- Each developer manually manages API keys, credentials
- No intelligent routing, no cost optimization
- **Total cost: $1,950/month + hidden productivity costs**

**With our platform ($99/developer):**
- Platform cost: $99/month × 50 = $4,950/month
- Intelligent routing saves 20-30% on API costs vs. single provider
- Centralized credential management saves 2 hours/developer/month
- Time savings value: 2 hours × 50 developers × $60/hour = $6,000/month
- **Net value: $6,000 savings - $3,000 incremental cost = $3,000/month ROI**

**Sales message:** "Pay us $3K more per month, get $6K in productivity value back."

---

## Questions for You

### For Your Analytics Design

1. **Do you need real-time cost attribution or daily is fine?**
   - Real-time: More complex but better for customer dashboards
   - Daily: Simpler, works for billing and historical analysis

2. **What cost accuracy level do you need?**
   - Exact (complex metering): 95%+ accuracy
   - Directional (tier-based): 80% accuracy
   - Estimated (flat rate): 50% accuracy

3. **Should we expose cost data to customers?**
   - Transparency builds trust
   - But might anchor them on our costs vs. their value
   - Recommendation: Show value metrics (time saved), not our costs

4. **Usage-based pricing or flat tiers?**
   - Usage-based: More complex but feels "fair"
   - Flat tiers: Simpler, predictable revenue
   - Hybrid: Base + overages (most common SaaS pattern)

---

## Bottom Line

**The economics are incredibly strong:**
- Gross margins: 85-95% (best-in-class for SaaS)
- Break-even: 25-50 customers (achievable in 6 weeks)
- Scale economics improve with volume (fixed costs amortize)

**We can afford to:**
- Offer generous free tier (builds community)
- Price competitively against single-provider solutions
- Invest in customer acquisition (3-6 month payback is fine)

**Infrastructure won't limit pricing strategy.** Price on value delivered, not cost incurred.

Let me know what additional cost data you need for your analytics platform.

---

**Yuki Tanaka**
SRE, Generic Corp

**P.S.** - If your ROI calculator can show customers "You saved $X this month vs. using only OpenAI," that's a powerful retention tool. The infrastructure costs are so low that we can be transparent about the value we're creating.
