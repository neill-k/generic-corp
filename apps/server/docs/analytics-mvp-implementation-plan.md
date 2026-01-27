# Analytics MVP Implementation Plan
**Date:** January 26, 2026
**Author:** Graham "Gray" Sutton, Data Engineer
**Status:** Ready for Review
**Priority:** P1 - Core MVP Feature

---

## Executive Summary

This document outlines the implementation plan for Generic Corp's analytics infrastructure, which Marcus has elevated to a core MVP feature based on competitive research findings. The analytics system will track cost savings, provider performance, and usage metrics to demonstrate quantifiable ROI to customers.

**Timeline:** 1 week to working demo
**Approach:** Extend existing PostgreSQL database with cost tracking tables
**Deliverable:** Real-time cost savings dashboard showing "You've saved $X this month"

---

## Implementation Options

### Option A: Quick Prototype (3-4 days)
**Pros:**
- Fastest path to demo
- Validates concept quickly
- Low risk

**Cons:**
- Requires refactoring for production
- Less accurate cost tracking
- Limited scalability

**Components:**
- Basic logging to PostgreSQL
- Hard-coded provider pricing
- Simple aggregation queries
- Minimal dashboard

### Option B: Production-Ready MVP (5-7 days) ⭐ RECOMMENDED
**Pros:**
- Production-quality data integrity
- Scalable architecture
- Accurate cost calculations
- Polished customer experience

**Cons:**
- Takes 1-3 extra days vs. Option A

**Components:**
- Comprehensive schema design
- Versioned provider pricing
- Real-time aggregation with materialized views
- REST API for dashboards
- Customer-facing analytics UI

**Recommendation:** Option B - The extra 1-3 days are worth it for production-grade accuracy. Inaccurate cost tracking would undermine our entire value proposition.

---

## Database Schema Design

### Core Tables

#### 1. task_executions
Tracks every task execution with cost and performance metrics.

```sql
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Provider & Task Info
  provider VARCHAR(50) NOT NULL, -- 'github_copilot', 'openai_codex', 'google_code_assist'
  task_type VARCHAR(100) NOT NULL, -- 'code_generation', 'bug_fix', 'refactor', 'test_generation'
  task_description TEXT,

  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_ms INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time)) * 1000) STORED,

  -- Resource Usage
  tokens_used INTEGER NOT NULL,
  compute_units DECIMAL(10,4), -- For non-token-based pricing

  -- Cost Tracking
  actual_cost DECIMAL(10,6) NOT NULL, -- Cost with intelligent routing
  baseline_cost DECIMAL(10,6) NOT NULL, -- Cost if used default provider
  savings DECIMAL(10,6) GENERATED ALWAYS AS (baseline_cost - actual_cost) STORED,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Quality Metrics
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  -- Routing Decision Reference
  routing_decision_id UUID REFERENCES routing_decisions(id),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for fast queries
  INDEX idx_task_exec_org_time (organization_id, start_time DESC),
  INDEX idx_task_exec_user_time (user_id, start_time DESC),
  INDEX idx_task_exec_provider (provider, start_time DESC),
  INDEX idx_task_exec_type (task_type, start_time DESC)
);
```

#### 2. provider_pricing
Maintains historical provider pricing for accurate cost calculations.

```sql
CREATE TABLE provider_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  task_type VARCHAR(100), -- NULL means applies to all task types
  pricing_model VARCHAR(20) NOT NULL, -- 'per_token', 'per_request', 'per_compute_unit'

  -- Pricing Details
  cost_per_unit DECIMAL(10,8) NOT NULL, -- Cost per token/request/compute unit
  currency VARCHAR(3) DEFAULT 'USD',

  -- Versioning
  effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE, -- NULL means currently active

  -- Source
  source VARCHAR(100), -- 'provider_api', 'manual_entry', 'contract'
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CHECK (cost_per_unit >= 0),
  CHECK (effective_date < end_date OR end_date IS NULL),

  -- Indexes
  INDEX idx_provider_pricing_lookup (provider, task_type, effective_date DESC)
);
```

#### 3. routing_decisions
Captures why the routing algorithm chose a specific provider.

```sql
CREATE TABLE routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR(255) NOT NULL,

  -- Decision Details
  chosen_provider VARCHAR(50) NOT NULL,
  alternative_providers JSONB, -- [{provider: 'openai', score: 0.85, estimated_cost: 0.02}]
  routing_strategy VARCHAR(50) NOT NULL, -- 'cost_optimized', 'performance_optimized', 'balanced'

  -- Reasoning
  reasoning TEXT, -- Human-readable explanation
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00

  -- Predictions vs. Actuals
  estimated_cost DECIMAL(10,6),
  estimated_duration_ms INTEGER,
  potential_savings DECIMAL(10,6),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  algorithm_version VARCHAR(20), -- Track algorithm improvements

  -- Indexes
  INDEX idx_routing_task (task_id),
  INDEX idx_routing_provider (chosen_provider, created_at DESC)
);
```

#### 4. analytics_aggregations
Pre-computed aggregations for fast dashboard queries.

```sql
CREATE TABLE analytics_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Time Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Aggregated Metrics
  total_tasks INTEGER NOT NULL DEFAULT 0,
  successful_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  total_tokens_used BIGINT NOT NULL DEFAULT 0,

  -- Cost Metrics
  total_actual_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
  total_baseline_cost DECIMAL(12,6) NOT NULL DEFAULT 0,
  total_savings DECIMAL(12,6) NOT NULL DEFAULT 0,
  savings_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN total_baseline_cost > 0 THEN (total_savings / total_baseline_cost * 100)
      ELSE 0
    END
  ) STORED,

  -- Provider Breakdown (JSONB for flexibility)
  by_provider JSONB, -- {github_copilot: {tasks: 100, cost: 5.50, savings: 1.20}}
  by_task_type JSONB, -- {code_generation: {tasks: 50, cost: 3.00}}

  -- Performance Metrics
  avg_duration_ms INTEGER,
  p50_duration_ms INTEGER,
  p95_duration_ms INTEGER,
  p99_duration_ms INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  UNIQUE(organization_id, period_type, period_start),

  -- Indexes
  INDEX idx_analytics_agg_org_period (organization_id, period_type, period_start DESC)
);
```

### Materialized Views for Real-Time Dashboards

#### Daily Savings Summary
```sql
CREATE MATERIALIZED VIEW mv_daily_savings AS
SELECT
  organization_id,
  DATE(start_time) as date,
  provider,
  task_type,
  COUNT(*) as tasks_completed,
  SUM(tokens_used) as total_tokens,
  SUM(actual_cost) as actual_cost,
  SUM(baseline_cost) as baseline_cost,
  SUM(savings) as total_savings,
  AVG(duration_ms) as avg_duration_ms,
  COUNT(*) FILTER (WHERE success = true) as successful_tasks,
  COUNT(*) FILTER (WHERE success = false) as failed_tasks
FROM task_executions
WHERE success = true -- Only include successful tasks in savings
GROUP BY organization_id, DATE(start_time), provider, task_type;

-- Refresh strategy: Every 5 minutes during business hours, every hour otherwise
CREATE UNIQUE INDEX idx_mv_daily_savings_unique
  ON mv_daily_savings(organization_id, date, provider, task_type);
```

#### Real-Time Organization Summary
```sql
CREATE MATERIALIZED VIEW mv_org_current_month AS
SELECT
  organization_id,
  DATE_TRUNC('month', start_time) as month,
  COUNT(*) as total_tasks,
  SUM(actual_cost) as total_cost,
  SUM(savings) as total_savings,
  ROUND((SUM(savings) / NULLIF(SUM(baseline_cost), 0) * 100)::numeric, 2) as savings_percentage,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT provider) as providers_used
FROM task_executions
WHERE start_time >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
  AND success = true
GROUP BY organization_id, DATE_TRUNC('month', start_time);

CREATE UNIQUE INDEX idx_mv_org_current_month_unique
  ON mv_org_current_month(organization_id, month);
```

---

## Cost Calculation Engine

### Algorithm

```typescript
// Pseudocode for cost calculation
async function calculateTaskCost(taskExecution: TaskExecution): Promise<CostCalculation> {
  // 1. Get current provider pricing
  const providerRate = await getProviderPricing(
    taskExecution.provider,
    taskExecution.taskType,
    taskExecution.startTime
  );

  // 2. Calculate actual cost
  const actualCost = taskExecution.tokensUsed * providerRate.costPerToken;

  // 3. Get baseline provider pricing (default provider)
  const baselineProvider = await getDefaultProvider(taskExecution.organization);
  const baselineRate = await getProviderPricing(
    baselineProvider,
    taskExecution.taskType,
    taskExecution.startTime
  );

  // 4. Calculate baseline cost
  const baselineCost = taskExecution.tokensUsed * baselineRate.costPerToken;

  // 5. Calculate savings
  const savings = baselineCost - actualCost;

  // 6. Validate and return
  return {
    actualCost: round(actualCost, 6), // 6 decimal places for accuracy
    baselineCost: round(baselineCost, 6),
    savings: round(savings, 6),
    savingsPercentage: (savings / baselineCost) * 100,
    currency: 'USD',
    calculatedAt: new Date(),
    providerRate,
    baselineRate
  };
}
```

### Data Validation Rules

1. **Negative Savings Check**
   - If `savings < 0`, flag for review (routing may have chosen wrong provider)
   - Alert if >5% of tasks have negative savings

2. **Cost Reasonability Check**
   - If `actualCost > 10 * baselineCost`, flag as anomaly
   - Manual review for tasks costing >$1.00

3. **Provider Pricing Updates**
   - Alert if provider pricing changes >10% from previous
   - Recalculate historical costs if pricing was retroactively corrected

4. **Failed Task Handling**
   - Exclude failed tasks from savings calculations
   - Track separately to measure routing decision quality

---

## Analytics API Design

### REST Endpoints

#### 1. Savings Summary
```
GET /api/v1/analytics/savings/summary
Query Params:
  - organization_id (required)
  - start_date (optional, default: start of month)
  - end_date (optional, default: now)
  - period (optional: 'day'|'week'|'month', default: 'day')

Response:
{
  "total_savings": 1247.32,
  "total_cost": 5823.45,
  "baseline_cost": 7070.77,
  "savings_percentage": 17.65,
  "currency": "USD",
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-26T23:59:59Z"
  },
  "trend": [
    {"date": "2026-01-20", "savings": 45.20},
    {"date": "2026-01-21", "savings": 52.10},
    ...
  ]
}
```

#### 2. Cost by Provider
```
GET /api/v1/analytics/costs/by-provider
Query Params:
  - organization_id (required)
  - start_date, end_date, period (same as above)

Response:
{
  "providers": [
    {
      "provider": "github_copilot",
      "tasks": 1250,
      "actual_cost": 2345.67,
      "baseline_cost": 3012.45,
      "savings": 666.78,
      "avg_cost_per_task": 1.88
    },
    ...
  ]
}
```

#### 3. Task Performance
```
GET /api/v1/analytics/tasks/performance
Query Params:
  - organization_id (required)
  - task_type (optional filter)
  - provider (optional filter)

Response:
{
  "tasks": [
    {
      "task_type": "code_generation",
      "total_tasks": 500,
      "success_rate": 0.96,
      "avg_duration_ms": 1250,
      "p50_duration_ms": 980,
      "p95_duration_ms": 2100,
      "optimal_provider": "openai_codex"
    },
    ...
  ]
}
```

#### 4. Usage Metrics
```
GET /api/v1/analytics/usage/metrics
Query Params:
  - organization_id (required)
  - period (default: 'day')

Response:
{
  "daily_active_users": 45,
  "tasks_per_day": 423,
  "tasks_per_user": 9.4,
  "top_task_types": [
    {"type": "code_generation", "count": 200},
    {"type": "bug_fix", "count": 150},
    ...
  ],
  "feature_adoption": {
    "intelligent_routing": 0.85,
    "cost_optimization": 0.72
  }
}
```

---

## Dashboard UI Components

### 1. Hero Metric: Savings Counter
**Component:** `<SavingsCounter>`

**Design:**
```
┌─────────────────────────────────────┐
│  You've saved this month            │
│                                     │
│         $1,247                      │
│         ↑ 18% vs baseline           │
│                                     │
│  Projected annual: $14,964          │
└─────────────────────────────────────┘
```

**Update Frequency:** Real-time (WebSocket) or 30-second polling
**Data Source:** `GET /api/v1/analytics/savings/summary`

### 2. Cost by Provider Chart
**Component:** `<CostByProviderChart>`

**Design:** Horizontal bar chart
```
GitHub Copilot   ████████████ $2,345 (Saved: $667)
OpenAI Codex     ██████ $1,823 (Saved: $412)
Google Code      ████ $1,655 (Saved: $168)
```

**Interactivity:**
- Hover shows detailed breakdown
- Click to filter dashboard by provider

**Data Source:** `GET /api/v1/analytics/costs/by-provider`

### 3. Savings Trend Chart
**Component:** `<SavingsTrendChart>`

**Design:** Line chart with dual axis
- Primary axis: Daily savings ($)
- Secondary axis: Cumulative savings ($)

**Time Periods:** 7 days, 30 days, 90 days, All time

**Data Source:** `GET /api/v1/analytics/savings/summary?period=day`

### 4. Executive Summary View
**Component:** `<ExecutiveSummary>`

**Design:** One-page PDF export for leadership
```
┌────────────────────────────────────────────┐
│ AI Orchestration ROI Summary               │
│ Organization: Acme Corp                    │
│ Period: January 2026                       │
├────────────────────────────────────────────┤
│ Cost Savings                               │
│ • Total saved: $1,247.32 (18% reduction)   │
│ • Projected annual: $14,964                │
│                                            │
│ Productivity Gains                         │
│ • Tasks completed: 1,250                   │
│ • Avg time per task: 23% faster            │
│ • Developer hours saved: 42 hours          │
│                                            │
│ Provider Performance                       │
│ • Optimal routing: 85% of tasks            │
│ • Best performer: OpenAI Codex (bug fixes) │
│ • Cost efficiency: GitHub Copilot          │
└────────────────────────────────────────────┘
```

**Export Format:** PDF, CSV, JSON
**Audience:** Engineering leaders, finance teams, executives

---

## Implementation Timeline

### Week 1: Analytics Foundation

#### Day 1-2: Schema Design & Implementation
**Owner:** Gray
**Deliverables:**
- [ ] Database schema created and migrated
- [ ] Prisma models updated
- [ ] Seed data for testing
- [ ] Schema review with Sable

**Tasks:**
1. Create migration files for new tables
2. Update Prisma schema
3. Generate test data (100+ sample tasks)
4. Validate schema with sample queries

#### Day 3-4: Cost Calculation Engine & API
**Owner:** Gray
**Deliverables:**
- [ ] Cost calculation service implemented
- [ ] Provider pricing lookup functional
- [ ] Analytics API endpoints live
- [ ] Unit tests for cost calculations

**Tasks:**
1. Implement `CostCalculationService`
2. Build provider pricing management
3. Create analytics API routes
4. Write comprehensive tests
5. Validate accuracy with manual calculations

#### Day 5-7: Dashboard UI
**Owner:** DeVonte (lead) + Gray (support)
**Deliverables:**
- [ ] Savings counter component
- [ ] Cost by provider chart
- [ ] Savings trend chart
- [ ] Basic executive summary view

**Tasks:**
1. Build React components
2. Integrate with analytics API
3. Add real-time updates (WebSocket or polling)
4. Responsive design (mobile + desktop)
5. User testing and refinement

### Week 2: Polish & Production Readiness

#### Day 8-9: Real-Time Updates & Performance
**Owner:** Gray + DeVonte
**Deliverables:**
- [ ] WebSocket implementation for live updates
- [ ] Materialized view refresh automation
- [ ] Dashboard load time <1s
- [ ] API response time <200ms

#### Day 10-11: Testing & Validation
**Owner:** Gray
**Deliverables:**
- [ ] Data accuracy validation
- [ ] Load testing (1000+ concurrent users)
- [ ] Cost calculation spot-checks
- [ ] Edge case handling

#### Day 12-14: Launch Prep
**Owner:** All
**Deliverables:**
- [ ] Documentation complete
- [ ] Customer-facing help guides
- [ ] Demo script prepared
- [ ] Production deployment

---

## Scaling Considerations

### When PostgreSQL is Sufficient
- **User count:** <1,000 organizations
- **Task volume:** <1M tasks/day
- **Query complexity:** Standard aggregations
- **Dashboard users:** <100 concurrent users

**Performance Optimizations:**
- Materialized views refreshed every 5 minutes
- Indexed queries on organization_id + timestamp
- Connection pooling (PgBouncer)
- Read replicas for analytics queries

### When to Upgrade to Time-Series DB
- **User count:** >1,000 organizations
- **Task volume:** >1M tasks/day
- **Query complexity:** Complex time-series analysis, ML predictions
- **Dashboard users:** >100 concurrent users

**Recommended Options:**
1. **TimescaleDB** (PostgreSQL extension)
   - Easiest migration path
   - Hypertables for automatic partitioning
   - Continuous aggregations
   - Retains PostgreSQL compatibility

2. **InfluxDB** (Purpose-built time-series)
   - Highest performance for metrics
   - Downsampling and retention policies
   - Advanced query language (Flux)
   - Requires separate infrastructure

**Migration Strategy:**
1. Add TimescaleDB extension to existing PostgreSQL
2. Convert `task_executions` to hypertable
3. Create continuous aggregations
4. Test performance improvements
5. Gradually migrate all time-series queries

---

## Data Privacy & Compliance

### PII Protection
1. **Code Anonymization**
   - Strip variable names, function names from logs
   - Hash user identifiers
   - Redact secrets, API keys, credentials

2. **Data Minimization**
   - Only log essential task metadata
   - Avoid storing full task descriptions
   - Aggregate metrics whenever possible

### GDPR Compliance
1. **Right to Access**
   - API endpoint: `GET /api/v1/user/data/export`
   - Returns all user's task data in JSON format

2. **Right to Erasure**
   - API endpoint: `DELETE /api/v1/user/data`
   - Anonymizes task data (keeps metrics, removes identifiers)

3. **Data Retention**
   - Default: 90 days for task_executions
   - Aggregated metrics: Retained indefinitely
   - Configurable per organization

### Audit Trail
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(50) NOT NULL, -- 'view_analytics', 'export_data', 'delete_data'
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Monitoring & Alerting

### Application Metrics
1. **Cost Calculation Accuracy**
   - Alert if >5% of tasks have negative savings
   - Daily audit of cost calculations
   - Spot-check 10 random tasks manually

2. **API Performance**
   - Response time p95 <500ms (target: <200ms)
   - Error rate <0.1%
   - Throughput >1000 req/min

3. **Database Performance**
   - Materialized view refresh time <30s
   - Query execution time p95 <100ms
   - Connection pool saturation <80%

### Business Metrics
1. **Analytics Adoption**
   - % of customers using dashboard
   - Daily active dashboard users
   - Dashboard load frequency

2. **Cost Tracking Health**
   - % of tasks with cost data
   - Provider pricing update lag
   - Savings calculation coverage

### Alerting Rules
```yaml
# Example Prometheus alerts
- alert: HighNegativeSavingsRate
  expr: rate(tasks_with_negative_savings[5m]) > 0.05
  severity: warning
  annotations:
    summary: "More than 5% of tasks have negative savings"

- alert: AnalyticsAPISlowResponse
  expr: histogram_quantile(0.95, rate(api_response_time_bucket[5m])) > 0.5
  severity: warning
  annotations:
    summary: "Analytics API p95 response time >500ms"

- alert: ProviderPricingStale
  expr: time() - provider_pricing_last_update > 86400
  severity: critical
  annotations:
    summary: "Provider pricing hasn't been updated in 24 hours"
```

---

## Success Metrics

### Technical Metrics (Week 1)
- [ ] Schema deployed to production
- [ ] Cost tracking captures >95% of tasks
- [ ] API response time p95 <200ms
- [ ] Dashboard load time <1s
- [ ] Zero data integrity violations
- [ ] Unit test coverage >80%

### Business Metrics (Week 2)
- [ ] Demo-able to first pilot customer
- [ ] Savings calculation methodology documented
- [ ] Dashboard shows compelling ROI story
- [ ] Positive feedback from team review
- [ ] Customer-ready documentation complete

### Validation Metrics
- [ ] Manual spot-checks confirm cost accuracy
- [ ] Edge cases handled correctly (failed tasks, pricing changes)
- [ ] Load testing passes (100 concurrent users)
- [ ] Security review passed (no PII leaks)

---

## Risks & Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Schema changes break existing functionality | Medium | High | Additive changes only, comprehensive testing, feature flags |
| Cost calculations are inaccurate | Medium | Critical | Conservative estimates, manual validation, transparent methodology |
| Dashboard performance degrades with data | Medium | Medium | Materialized views, pagination, caching, load testing |
| Provider pricing changes invalidate calculations | High | Medium | Versioned pricing table, alerts on >10% changes, recalculation jobs |
| Real-time updates cause performance issues | Low | Medium | WebSocket connection limits, fallback to polling, rate limiting |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Customers don't trust savings numbers | Medium | High | Transparent methodology, conservative estimates, export raw data |
| Dashboard too complex for non-technical users | Low | Medium | Progressive disclosure, executive summary view, help tooltips |
| Privacy concerns with task logging | Low | High | Anonymization, clear privacy policy, data export/deletion APIs |

---

## Next Steps

### Immediate Actions (Today)
1. [ ] Share this document with team for review
2. [ ] Schedule 30-min architecture review with Sable
3. [ ] Coordinate with DeVonte on dashboard collaboration
4. [ ] Begin schema design refinement

### Day 1 Tasks
1. [ ] Create database migration files
2. [ ] Update Prisma schema
3. [ ] Set up development environment
4. [ ] Write initial unit tests

### Open Questions for Team
1. **For Marcus:** Speed (Option A, 3-4 days) vs. quality (Option B, 5-7 days)?
2. **For Sable:** Separate analytics service or monolith integration?
3. **For Yuki:** PostgreSQL tuning recommendations for time-series data?
4. **For DeVonte:** Dashboard framework preference (React + Chart.js vs. D3.js)?

---

## Appendix: Sample Queries

### Get Organization's Monthly Savings
```sql
SELECT
  SUM(savings) as total_savings,
  SUM(actual_cost) as total_cost,
  SUM(baseline_cost) as baseline_cost,
  ROUND((SUM(savings) / NULLIF(SUM(baseline_cost), 0) * 100)::numeric, 2) as savings_percentage,
  COUNT(*) as total_tasks
FROM task_executions
WHERE organization_id = $1
  AND start_time >= DATE_TRUNC('month', CURRENT_TIMESTAMP)
  AND success = true;
```

### Get Provider Performance Comparison
```sql
SELECT
  provider,
  task_type,
  COUNT(*) as tasks,
  AVG(duration_ms) as avg_duration,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
  SUM(actual_cost) as total_cost,
  AVG(actual_cost) as avg_cost,
  COUNT(*) FILTER (WHERE success = true) as successful_tasks,
  ROUND((COUNT(*) FILTER (WHERE success = true)::numeric / COUNT(*)::numeric * 100), 2) as success_rate
FROM task_executions
WHERE organization_id = $1
  AND start_time >= $2
  AND start_time < $3
GROUP BY provider, task_type
ORDER BY tasks DESC;
```

### Get Daily Savings Trend
```sql
SELECT
  DATE(start_time) as date,
  SUM(savings) as daily_savings,
  SUM(SUM(savings)) OVER (ORDER BY DATE(start_time)) as cumulative_savings,
  COUNT(*) as tasks
FROM task_executions
WHERE organization_id = $1
  AND start_time >= $2
  AND success = true
GROUP BY DATE(start_time)
ORDER BY date;
```

---

**Document Status:** Ready for Team Review
**Next Review Date:** After Week 1 implementation
**Owner:** Graham "Gray" Sutton, Data Engineer

---

*Built with data integrity in mind. Let's ship something customers will pay for.*
