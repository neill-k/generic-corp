# Multi-Agent Platform Analytics Architecture
**Date:** January 26, 2026
**Author:** Graham "Gray" Sutton, Data Engineer
**Status:** Proposed Architecture - Awaiting Approval

---

## Executive Summary

This document outlines the analytics architecture for Generic Corp's Multi-Agent Orchestration Platform. The design prioritizes **speed to market** (5-7 day MVP), **data quality**, and **scalability** while leveraging our existing technical infrastructure.

**Key Deliverable:** Real-time analytics demonstrating ROI and driving customer acquisition, retention, and expansion.

---

## Business Objectives

### Primary Goals
1. **Revenue Enablement:** Demonstrate cost savings to close sales
2. **Customer Retention:** Provide actionable insights that drive platform stickiness
3. **Product Intelligence:** Data-driven iteration and feature prioritization
4. **Operational Efficiency:** Infrastructure cost optimization

### Success Metrics
- **Sales Impact:** Analytics used in 100% of customer demos
- **Customer Value:** Average customer saves 25%+ on AI provider costs
- **Platform Health:** <500ms dashboard load time, 99.9% data accuracy
- **Business Intelligence:** Real-time visibility into MRR, churn, and usage

---

## Analytics Capabilities Roadmap

### Phase 1: Revenue-Critical Analytics (Week 1-2)

**Customer-Facing Dashboards:**

1. **Cost Savings Dashboard**
   - Real-time provider cost tracking
   - Intelligent routing savings calculation
   - Monthly spend trends
   - Cost per task type breakdown
   - Budget alerts and recommendations

2. **Usage Dashboard**
   - Agent execution metrics
   - API calls by provider
   - Task success/failure rates
   - Queue times and bottlenecks
   - Peak usage identification

3. **Billing & Usage Tracking**
   - Current usage vs. tier limits
   - Overage projections
   - Historical usage trends
   - Tier recommendation engine

**Why These First:**
- Directly support sales conversations ("You'll save $X/month")
- Prove platform value immediately
- Enable usage-based billing
- Differentiate from competitors who lack cost visibility

### Phase 2: Business Intelligence (Week 3-4)

**Internal Dashboards:**

1. **Customer Health Dashboard**
   - Usage patterns and engagement scores
   - Churn risk indicators
   - Feature adoption by customer
   - Time-to-value tracking
   - Support ticket correlation

2. **Revenue Analytics**
   - MRR/ARR with cohort analysis
   - Customer acquisition cost by channel
   - Lifetime value projections
   - Upgrade/downgrade patterns
   - Unit economics by tier

3. **Product Analytics**
   - Feature usage heatmaps
   - A/B test results
   - User journey analysis
   - Task type popularity
   - Provider preference patterns

**Why Second:**
- Enables data-driven product decisions
- Identifies expansion opportunities
- Optimizes customer acquisition spend
- Supports investor conversations

### Phase 3: Advanced Intelligence (Week 5-6)

**ML-Powered Insights:**

1. **Predictive Analytics**
   - Churn prediction (30-day advance warning)
   - Usage anomaly detection
   - Capacity forecasting
   - Optimal tier recommendations

2. **Optimization Engine**
   - Automatic routing improvements
   - Cost-performance trade-off analysis
   - Infrastructure scaling recommendations
   - Customer success interventions

**Why Last:**
- Requires historical data for training
- Not critical for launch
- Provides competitive moat once built

---

## Technical Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Event Sources                            │
│  (Temporal Workflows, Agent Executions, API Calls)          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  Ingestion Layer                             │
│  • Event Stream Processor (BullMQ)                          │
│  • Schema Validation                                         │
│  • Correlation ID Tracking                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Storage Layer                              │
│  • PostgreSQL with TimescaleDB (Time-series)                │
│  • Hot Data: Last 30 days (full granularity)               │
│  • Warm Data: 30-90 days (hourly rollups)                  │
│  • Cold Data: 90+ days (daily rollups, archived)           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                 Processing Layer                             │
│  • Real-time Aggregation (Streaming)                        │
│  • Batch Jobs (Nightly rollups, ML training)               │
│  • Query Optimization (Materialized views)                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Layer                                  │
│  • REST API (Historical queries)                            │
│  • WebSocket (Real-time updates)                            │
│  • GraphQL (Flexible querying - Phase 2)                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Customer Dashboard                              │
│  • React + Recharts/D3.js                                   │
│  • Real-time updates via Socket.io                          │
│  • Export capabilities (CSV, JSON, PDF)                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Schema Design

#### Core Event Schema

```typescript
interface AnalyticsEvent {
  id: string;                    // UUID
  tenant_id: string;             // Multi-tenant isolation
  event_type: EventType;         // Enum: agent_execution, api_call, etc.
  timestamp: Date;               // ISO 8601
  correlation_id: string;        // Track related events

  // Context
  user_id?: string;
  agent_id?: string;
  workflow_id?: string;

  // Metrics
  duration_ms?: number;
  cost_usd?: number;
  provider?: string;             // github, openai, google
  task_type?: string;            // bug_fix, feature, test_gen
  success: boolean;
  error_code?: string;

  // Metadata
  metadata: Record<string, any>; // Flexible additional data
}
```

#### Aggregation Tables (Rollups)

**Hourly Rollups:**
```sql
CREATE TABLE analytics_hourly (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  provider VARCHAR(50),
  task_type VARCHAR(50),

  -- Aggregated metrics
  total_executions INTEGER,
  successful_executions INTEGER,
  total_cost_usd DECIMAL(10,4),
  avg_duration_ms INTEGER,
  p95_duration_ms INTEGER,

  -- Indexing
  UNIQUE(tenant_id, timestamp, provider, task_type)
);

CREATE INDEX idx_analytics_hourly_tenant_time
  ON analytics_hourly(tenant_id, timestamp DESC);
```

**Daily Rollups:**
Similar structure, aggregated by day for long-term trend analysis.

### Instrumentation Points

**Key Events to Track:**

1. **Agent Lifecycle Events**
   - `agent.created`
   - `agent.started`
   - `agent.completed`
   - `agent.failed`
   - `agent.timeout`

2. **Provider API Calls**
   - `provider.api_call` (with provider, cost, latency)
   - `provider.rate_limit`
   - `provider.error`

3. **Billing Events**
   - `billing.usage_recorded`
   - `billing.tier_limit_warning`
   - `billing.tier_limit_exceeded`
   - `billing.subscription_created`
   - `billing.subscription_upgraded`

4. **Customer Actions**
   - `customer.signup`
   - `customer.login`
   - `customer.dashboard_view`
   - `customer.export_data`

**Instrumentation Strategy:**

```typescript
// Example: Instrumenting agent execution
async function executeAgent(agentConfig: AgentConfig) {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();

  try {
    // Emit start event
    await AnalyticsService.track({
      event_type: 'agent.started',
      tenant_id: agentConfig.tenantId,
      correlation_id: correlationId,
      agent_id: agentConfig.id,
      metadata: { task_type: agentConfig.taskType }
    });

    // Execute agent
    const result = await agent.run();

    // Calculate cost based on provider usage
    const cost = calculateCost(result.providerCalls);

    // Emit completion event
    await AnalyticsService.track({
      event_type: 'agent.completed',
      tenant_id: agentConfig.tenantId,
      correlation_id: correlationId,
      agent_id: agentConfig.id,
      duration_ms: Date.now() - startTime,
      cost_usd: cost,
      success: true,
      metadata: {
        provider: result.provider,
        task_type: agentConfig.taskType,
        tokens_used: result.tokensUsed
      }
    });

    return result;
  } catch (error) {
    // Emit failure event
    await AnalyticsService.track({
      event_type: 'agent.failed',
      tenant_id: agentConfig.tenantId,
      correlation_id: correlationId,
      agent_id: agentConfig.id,
      duration_ms: Date.now() - startTime,
      success: false,
      error_code: error.code,
      metadata: { error_message: error.message }
    });

    throw error;
  }
}
```

### Real-Time Processing

**Architecture:**

1. **Event Ingestion**
   - Events pushed to BullMQ queue
   - Separate queues for real-time vs. batch processing
   - Priority queuing for customer-facing metrics

2. **Stream Processing**
   - Worker processes consume events
   - Update real-time aggregation tables
   - Trigger WebSocket updates to connected dashboards

3. **WebSocket Delivery**
   - Socket.io rooms for tenant isolation
   - Push updates when metrics change
   - Rate limiting to prevent client overload

**Example Flow:**

```
Agent Execution → AnalyticsService.track() → BullMQ Queue →
Stream Processor → PostgreSQL Update → Socket.io Emit →
Customer Dashboard Update (< 1 second latency)
```

### Cost Tracking & Routing Intelligence

**Provider Cost Calculation:**

```typescript
interface ProviderPricing {
  github_copilot: {
    per_completion: 0.002,  // $0.002 per completion
    per_1k_tokens: 0.01
  },
  openai_codex: {
    per_1k_tokens: 0.06
  },
  google_code_assist: {
    per_1k_tokens: 0.04
  }
}

function calculateTaskCost(
  provider: string,
  tokensUsed: number,
  completions: number
): number {
  const pricing = ProviderPricing[provider];
  return (tokensUsed / 1000) * pricing.per_1k_tokens +
         (completions * pricing.per_completion || 0);
}
```

**Savings Calculation:**

```typescript
async function calculateSavings(
  tenantId: string,
  timeRange: DateRange
): Promise<SavingsMetrics> {
  // Get all tasks executed in time range
  const tasks = await db.analyticsEvent.findMany({
    where: {
      tenant_id: tenantId,
      event_type: 'agent.completed',
      timestamp: { gte: timeRange.start, lte: timeRange.end }
    }
  });

  let actualCost = 0;
  let alternativeCost = 0;

  for (const task of tasks) {
    actualCost += task.cost_usd;

    // Calculate what it would have cost with most expensive provider
    const altCost = calculateTaskCost(
      'openai_codex',  // Typically most expensive
      task.metadata.tokens_used,
      1
    );
    alternativeCost += altCost;
  }

  return {
    actualCost,
    alternativeCost,
    savings: alternativeCost - actualCost,
    savingsPercent: ((alternativeCost - actualCost) / alternativeCost) * 100
  };
}
```

### Multi-Tenant Data Isolation

**Row-Level Security (Recommended Approach):**

```sql
-- Enable RLS on analytics tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only access their own data
CREATE POLICY tenant_isolation ON analytics_events
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- In application code, set tenant context
await db.$executeRaw`SET app.current_tenant = ${tenantId}`;
```

**Alternative: Schema-Per-Tenant**
- Pros: Complete isolation, easier compliance
- Cons: More complex migrations, higher operational overhead
- Recommendation: Use for enterprise tier only

### Performance Optimization

**Query Optimization:**

1. **Indexes:**
   ```sql
   -- Tenant + Time range queries (most common)
   CREATE INDEX idx_events_tenant_time
     ON analytics_events(tenant_id, timestamp DESC);

   -- Provider analysis
   CREATE INDEX idx_events_provider
     ON analytics_events(tenant_id, provider, timestamp DESC);

   -- Task type analysis
   CREATE INDEX idx_events_task_type
     ON analytics_events(tenant_id, task_type, timestamp DESC);
   ```

2. **Materialized Views:**
   ```sql
   CREATE MATERIALIZED VIEW daily_tenant_summary AS
   SELECT
     tenant_id,
     DATE(timestamp) as date,
     COUNT(*) as total_executions,
     SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_executions,
     SUM(cost_usd) as total_cost,
     AVG(duration_ms) as avg_duration
   FROM analytics_events
   WHERE event_type = 'agent.completed'
   GROUP BY tenant_id, DATE(timestamp);

   -- Refresh nightly
   CREATE INDEX ON daily_tenant_summary(tenant_id, date DESC);
   ```

3. **Caching Strategy:**
   - Redis cache for frequently accessed dashboards
   - 5-minute TTL for real-time metrics
   - Cache invalidation on relevant events

**Scaling Strategy:**

- **Phase 1 (0-100 customers):** Single PostgreSQL instance
- **Phase 2 (100-1000 customers):** Read replicas for analytics queries
- **Phase 3 (1000+ customers):** TimescaleDB for time-series, separate analytics DB

---

## Data Privacy & Compliance

### GDPR Compliance

**Right to Access (Article 15):**
- Export API providing all tenant analytics data
- JSON and CSV formats
- Delivered via secure download link

**Right to Erasure (Article 17):**
```typescript
async function deleteCustomerData(tenantId: string) {
  // Soft delete approach (preserve aggregates)
  await db.analyticsEvent.updateMany({
    where: { tenant_id: tenantId },
    data: {
      deleted_at: new Date(),
      // Anonymize PII
      user_id: null,
      metadata: {}
    }
  });

  // Schedule hard delete after retention period
  await scheduleDataPurge(tenantId, { delay: '90 days' });
}
```

**Data Minimization:**
- Only collect necessary metrics
- No PII in analytics unless explicitly required
- Metadata fields are opt-in

### Security Measures

1. **Encryption:**
   - At-rest: PostgreSQL transparent data encryption
   - In-transit: TLS 1.3 for all API calls
   - Sensitive fields: Application-level encryption for costs/usage

2. **Access Control:**
   - API authentication via JWT
   - Role-based access (admin, developer, viewer)
   - Audit logging for all data access

3. **Rate Limiting:**
   - API: 100 requests/min per tenant
   - WebSocket: 10 updates/sec per connection
   - Export: 5 requests/hour per tenant

---

## Implementation Plan

### Week 1: Foundation (Days 1-5)

**Day 1: Schema Design & Architecture Review**
- Finalize analytics schema
- Review with Sable (multi-tenant approach)
- Set up TimescaleDB extension on PostgreSQL
- Create migration scripts

**Day 2-3: Instrumentation**
- Identify all event emission points
- Implement AnalyticsService
- Add instrumentation to Temporal workflows
- Add instrumentation to provider API calls
- Testing: Verify events are captured correctly

**Day 4-5: Storage & Processing**
- Implement event ingestion pipeline (BullMQ)
- Build aggregation workers
- Create rollup tables and jobs
- Set up real-time stream processing
- Testing: Load testing with simulated events

### Week 2: Customer-Facing Analytics (Days 6-10)

**Day 6-7: API Development**
- Build analytics REST API endpoints
- Implement WebSocket real-time updates
- Add authentication and authorization
- Create export functionality (CSV/JSON)

**Day 8-9: Dashboard Development (with DeVonte)**
- Cost savings dashboard
- Usage dashboard
- Billing/usage tracking
- Real-time updates via Socket.io

**Day 10: Testing & Polish**
- End-to-end testing
- Performance optimization
- Dashboard responsiveness
- Error handling

### Week 3: Business Intelligence (Days 11-15)

**Day 11-12: Internal Dashboards**
- Customer health metrics
- Revenue analytics
- Product usage intelligence

**Day 13-14: Advanced Features**
- Cohort analysis
- Funnel visualization
- Custom date ranges
- Filtering and segmentation

**Day 15: Integration & Documentation**
- API documentation
- Dashboard user guide
- Internal playbook for using analytics

### Week 4+: Advanced Capabilities

**ML & Predictions:**
- Churn prediction model
- Usage anomaly detection
- Optimal routing improvements

**Embedded Analytics:**
- White-label dashboard components
- Customer-embeddable widgets
- API for third-party integrations

---

## Resource Requirements

### Team Allocation

**Week 1:**
- Graham (100%): Schema design, instrumentation, pipeline implementation
- Yuki (25%): Infrastructure setup, monitoring configuration
- Sable (5%): Architecture review, multi-tenant security review

**Week 2:**
- Graham (100%): API development, real-time processing
- DeVonte (50%): Dashboard UI components, data visualization
- Yuki (10%): Deployment, monitoring

**Week 3:**
- Graham (75%): Business intelligence dashboards
- DeVonte (25%): Advanced UI features

### Infrastructure Costs

**Estimated Monthly Costs (100 customers):**
- PostgreSQL (Managed): $50-100/month
- TimescaleDB extension: $0 (open source)
- Redis (for caching): $10-20/month
- Storage (30 days hot data): $5-10/month
- Compute (workers): $20-40/month

**Total: $85-170/month** for 100 customers = **<$2/customer/month**

Well within the $7/customer target cost.

### External Dependencies

**None required** - everything can be built with existing stack:
- PostgreSQL + TimescaleDB (already have PostgreSQL)
- BullMQ + Redis (already have)
- Socket.io (already have)
- React + Recharts (open source)

**Optional (Not Recommended):**
- Segment ($50-500/month): Not needed, build in-house
- Mixpanel ($0-1000+/month): Not needed, build in-house
- DataDog ($15-100/month): Use Prometheus + Grafana (open source)

---

## Success Criteria

### MVP Success (End of Week 2)

**Functional Requirements:**
- ✅ Real-time cost savings dashboard showing 25%+ savings
- ✅ Usage dashboard with <1 second update latency
- ✅ Billing API enforcing tier limits
- ✅ Export functionality for customer data

**Performance Requirements:**
- ✅ Dashboard load time <500ms
- ✅ Real-time update latency <1 second
- ✅ Query response time <200ms for 95th percentile
- ✅ Data accuracy 99.9%+

**Business Impact:**
- ✅ Analytics used in 100% of sales demos
- ✅ Cost savings calculator closes 1 deal in Week 3
- ✅ Customer feedback: "This is the most transparent platform we've seen"

### Full Product Success (End of Week 4)

**Customer Retention:**
- Analytics cited as reason for renewal in 80%+ of customers
- Dashboard views: 3+ times per week per customer
- Customers discover optimization opportunities via analytics

**Product Intelligence:**
- Data-driven roadmap decisions
- A/B test results drive feature prioritization
- Churn prediction accuracy >70%

**Revenue Impact:**
- Analytics drive 20%+ of Free-to-Pro upgrades
- Cost optimization recommendations save customers 30%+
- Embedded analytics enable partnership opportunities

---

## Risk Assessment & Mitigation

### Technical Risks

**Risk: Performance degradation at scale**
- Mitigation: Rollup tables, caching, read replicas
- Monitoring: P95 latency alerts, query slow log

**Risk: Data accuracy issues**
- Mitigation: Schema validation, reconciliation jobs, audit trails
- Monitoring: Daily accuracy checks, anomaly detection

**Risk: Real-time lag increases**
- Mitigation: Dedicated real-time queue, priority processing
- Monitoring: End-to-end latency tracking

### Business Risks

**Risk: Customers don't use analytics**
- Mitigation: In-app tours, email reports, sales training
- Metric: Dashboard views per customer per week

**Risk: Wrong metrics prioritized**
- Mitigation: Customer discovery interviews, iterate on feedback
- Metric: Customer satisfaction with analytics

**Risk: Competitive copy**
- Mitigation: Focus on advanced features (ML, predictions)
- Advantage: First-mover with data, hard to replicate insights

---

## Conclusion

This analytics architecture provides a **fast path to revenue** (5-7 day MVP) while building a foundation for long-term competitive advantage. By leveraging our existing infrastructure (PostgreSQL, BullMQ, Socket.io), we minimize cost and complexity.

**Key Differentiators:**
1. Real-time cost visibility (no competitor offers this)
2. Intelligent routing savings calculation (unique value prop)
3. Customer-facing analytics as product (not just internal BI)
4. Data-driven optimization recommendations (AI-powered insights)

**Next Steps:**
1. Get approval from Marcus on timeline and priorities
2. Schedule architecture review with Sable and Yuki
3. Begin Day 1 schema design and instrumentation
4. Coordinate with DeVonte on dashboard UI

The data infrastructure is ready. Let's turn it into revenue.

---

**Document Status:** Awaiting approval to begin implementation
**Owner:** Graham "Gray" Sutton
**Last Updated:** January 26, 2026
