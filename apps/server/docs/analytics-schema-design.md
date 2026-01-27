# Analytics Schema Design
**Date:** January 26, 2026
**Prepared by:** Graham "Gray" Sutton, Data Engineer
**Status:** Technical Design for MVP Analytics

---

## Overview

This document outlines the database schema and data architecture required to support ROI analytics, cost tracking, and customer-facing dashboards for Generic Corp's AI Orchestration Platform.

---

## 1. Core Analytics Tables

### 1.1 task_executions

Primary table for tracking all task executions and associated costs.

```sql
CREATE TABLE task_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id VARCHAR(255) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Task Details
  task_type VARCHAR(100) NOT NULL, -- 'bug_fix', 'feature', 'refactor', 'test', 'documentation'
  task_description TEXT,
  code_language VARCHAR(50), -- 'typescript', 'python', 'javascript', etc.

  -- Provider & Routing
  provider VARCHAR(100) NOT NULL, -- 'github_copilot', 'openai_codex', 'google_code_assist'
  routing_reason TEXT, -- Why this provider was chosen
  alternative_providers JSONB, -- Array of providers considered

  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER, -- Calculated: end_time - start_time

  -- Cost & Usage
  tokens_used INTEGER NOT NULL DEFAULT 0,
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  baseline_cost_usd DECIMAL(10, 6), -- What it would have cost on default provider
  savings_usd DECIMAL(10, 6), -- baseline_cost - actual_cost

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  error_message TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_task_executions_user ON task_executions(user_id);
CREATE INDEX idx_task_executions_org ON task_executions(organization_id);
CREATE INDEX idx_task_executions_provider ON task_executions(provider);
CREATE INDEX idx_task_executions_start_time ON task_executions(start_time DESC);
CREATE INDEX idx_task_executions_status ON task_executions(status);
CREATE INDEX idx_task_executions_task_type ON task_executions(task_type);
```

### 1.2 provider_pricing

Tracks pricing for each provider and task type over time.

```sql
CREATE TABLE provider_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL,
  task_type VARCHAR(100),

  -- Pricing Model
  cost_per_token DECIMAL(10, 8),
  cost_per_request DECIMAL(10, 6),
  cost_per_minute DECIMAL(10, 6),
  pricing_tier VARCHAR(50), -- 'free', 'standard', 'premium', 'enterprise'

  -- Validity Period
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  effective_until TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_provider_pricing_lookup ON provider_pricing(provider, effective_from DESC);
```

### 1.3 routing_decisions

Detailed log of routing algorithm decisions for optimization and debugging.

```sql
CREATE TABLE routing_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_execution_id UUID NOT NULL REFERENCES task_executions(id),

  -- Decision Details
  chosen_provider VARCHAR(100) NOT NULL,
  decision_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Alternatives Considered
  alternative_providers JSONB, -- [{ provider, score, reasoning }]

  -- Decision Factors
  routing_algorithm_version VARCHAR(50),
  decision_factors JSONB, -- { cost_weight, performance_weight, availability_weight }

  -- Performance Predictions
  predicted_cost DECIMAL(10, 6),
  predicted_duration_ms INTEGER,
  predicted_quality_score DECIMAL(5, 2),

  -- Actual Results (updated after execution)
  actual_cost DECIMAL(10, 6),
  actual_duration_ms INTEGER,
  actual_quality_score DECIMAL(5, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_routing_decisions_task ON routing_decisions(task_execution_id);
CREATE INDEX idx_routing_decisions_provider ON routing_decisions(chosen_provider);
```

### 1.4 provider_performance_metrics

Aggregated performance metrics for each provider by task type.

```sql
CREATE TABLE provider_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(100) NOT NULL,
  task_type VARCHAR(100) NOT NULL,

  -- Time Period
  metric_date DATE NOT NULL,
  aggregation_period VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'

  -- Performance Metrics
  total_tasks INTEGER NOT NULL DEFAULT 0,
  successful_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2), -- calculated: successful / total * 100

  -- Timing Statistics
  avg_duration_ms INTEGER,
  median_duration_ms INTEGER,
  p95_duration_ms INTEGER,
  p99_duration_ms INTEGER,

  -- Cost Statistics
  total_cost_usd DECIMAL(10, 2),
  avg_cost_usd DECIMAL(10, 6),
  total_tokens INTEGER,

  -- Quality Metrics
  avg_quality_score DECIMAL(5, 2),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(provider, task_type, metric_date, aggregation_period)
);

CREATE INDEX idx_provider_perf_lookup ON provider_performance_metrics(provider, task_type, metric_date DESC);
```

### 1.5 organization_analytics

Pre-aggregated analytics for each organization (for fast dashboard queries).

```sql
CREATE TABLE organization_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Time Period
  metric_date DATE NOT NULL,
  aggregation_period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'

  -- Usage Metrics
  total_tasks INTEGER NOT NULL DEFAULT 0,
  total_developers INTEGER NOT NULL DEFAULT 0,
  active_developers INTEGER NOT NULL DEFAULT 0, -- developers who ran at least 1 task

  -- Cost Metrics
  total_cost_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_baseline_cost_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_savings_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
  savings_percentage DECIMAL(5, 2),

  -- Provider Breakdown
  provider_usage JSONB, -- { provider: task_count }
  provider_costs JSONB, -- { provider: cost_usd }

  -- Task Type Breakdown
  task_type_distribution JSONB, -- { task_type: count }

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, metric_date, aggregation_period)
);

CREATE INDEX idx_org_analytics_lookup ON organization_analytics(organization_id, metric_date DESC);
```

### 1.6 user_analytics

Per-user analytics for individual developer dashboards.

```sql
CREATE TABLE user_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Time Period
  metric_date DATE NOT NULL,
  aggregation_period VARCHAR(20) NOT NULL,

  -- Productivity Metrics
  total_tasks INTEGER NOT NULL DEFAULT 0,
  total_duration_ms BIGINT NOT NULL DEFAULT 0,
  avg_task_duration_ms INTEGER,

  -- Cost Metrics
  total_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  total_savings_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

  -- Provider Preferences
  most_used_provider VARCHAR(100),
  provider_usage JSONB,

  -- Task Type Distribution
  task_type_distribution JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, metric_date, aggregation_period)
);

CREATE INDEX idx_user_analytics_lookup ON user_analytics(user_id, metric_date DESC);
```

---

## 2. Aggregation Strategy

### 2.1 Real-Time Metrics (No Pre-Aggregation)

For real-time dashboards showing "live" data (last 5 minutes):
- Query `task_executions` directly
- Use materialized views for complex queries
- Cache results for 30-60 seconds

### 2.2 Daily Aggregation (Background Job)

Run nightly at midnight UTC:
1. Aggregate yesterday's data into `organization_analytics`
2. Aggregate yesterday's data into `user_analytics`
3. Calculate `provider_performance_metrics`
4. Update weekly/monthly rollups if needed

**Implementation:**
```typescript
// Pseudo-code for aggregation job
async function runDailyAggregation(date: Date) {
  const yesterday = subDays(date, 1);

  // Aggregate organization metrics
  await aggregateOrganizationMetrics(yesterday);

  // Aggregate user metrics
  await aggregateUserMetrics(yesterday);

  // Update provider performance
  await aggregateProviderPerformance(yesterday);

  // Update weekly/monthly if needed
  if (isEndOfWeek(yesterday)) {
    await aggregateWeeklyMetrics(yesterday);
  }
  if (isEndOfMonth(yesterday)) {
    await aggregateMonthlyMetrics(yesterday);
  }
}
```

### 2.3 Query Optimization

**Fast Dashboard Queries:**
- Use pre-aggregated tables for time-ranges > 24 hours
- Use direct queries on `task_executions` for real-time data
- Implement query result caching (Redis) for frequently accessed data

---

## 3. Key Analytics Queries

### 3.1 Organization Cost Dashboard

```sql
-- Total savings for organization this month
SELECT
  SUM(total_savings_usd) as total_savings,
  SUM(total_cost_usd) as total_cost,
  SUM(total_baseline_cost_usd) as baseline_cost,
  AVG(savings_percentage) as avg_savings_pct
FROM organization_analytics
WHERE organization_id = $1
  AND metric_date >= date_trunc('month', CURRENT_DATE)
  AND aggregation_period = 'daily';
```

### 3.2 Real-Time Savings Counter

```sql
-- Today's savings so far
SELECT
  COALESCE(SUM(savings_usd), 0) as todays_savings
FROM task_executions
WHERE organization_id = $1
  AND start_time >= date_trunc('day', CURRENT_TIMESTAMP)
  AND status = 'completed';
```

### 3.3 Provider Performance Comparison

```sql
-- Compare providers for a specific task type this month
SELECT
  provider,
  AVG(success_rate) as avg_success_rate,
  AVG(avg_duration_ms) as avg_duration,
  SUM(total_tasks) as total_tasks,
  AVG(avg_cost_usd) as avg_cost
FROM provider_performance_metrics
WHERE task_type = $1
  AND metric_date >= date_trunc('month', CURRENT_DATE)
GROUP BY provider
ORDER BY avg_success_rate DESC, avg_cost ASC;
```

### 3.4 Team Productivity Report

```sql
-- Top performing developers this week
SELECT
  u.name,
  ua.total_tasks,
  ua.total_savings_usd,
  ua.most_used_provider
FROM user_analytics ua
JOIN users u ON ua.user_id = u.id
WHERE ua.organization_id = $1
  AND ua.metric_date >= date_trunc('week', CURRENT_DATE)
  AND ua.aggregation_period = 'daily'
GROUP BY u.name, ua.total_tasks, ua.total_savings_usd, ua.most_used_provider
ORDER BY ua.total_tasks DESC
LIMIT 10;
```

---

## 4. Data Quality & Integrity

### 4.1 Data Validation Rules

**Cost Calculations:**
- `cost_usd` must be >= 0
- `savings_usd` = `baseline_cost_usd` - `cost_usd`
- If `savings_usd` < 0, log warning (routing was suboptimal)

**Timing:**
- `duration_ms` must be > 0 for completed tasks
- `end_time` must be >= `start_time`

**Status Transitions:**
- Valid flow: pending → running → completed/failed
- Log warning for invalid transitions

### 4.2 Data Consistency Checks

**Daily Reconciliation:**
```sql
-- Verify aggregated totals match raw data
SELECT
  DATE(start_time) as date,
  COUNT(*) as raw_count,
  SUM(cost_usd) as raw_cost
FROM task_executions
WHERE organization_id = $1
  AND start_time >= $2 AND start_time < $3
GROUP BY DATE(start_time);

-- Compare with aggregated data
SELECT
  metric_date,
  SUM(total_tasks) as agg_count,
  SUM(total_cost_usd) as agg_cost
FROM organization_analytics
WHERE organization_id = $1
  AND metric_date = $2
  AND aggregation_period = 'daily'
GROUP BY metric_date;
```

### 4.3 Missing Data Handling

**Failed Tasks:**
- Still count in total_tasks
- Exclude from cost calculations
- Track failure rate separately

**Incomplete Executions:**
- Tasks with no end_time after 1 hour → mark as 'timed_out'
- Alert monitoring system
- Exclude from performance metrics

---

## 5. Privacy & Compliance

### 5.1 Data Retention

**Raw Task Executions:**
- Keep for 90 days (configurable per customer)
- Archive to cold storage after 90 days
- Delete after 1 year (unless customer requires longer)

**Aggregated Analytics:**
- Keep indefinitely (no PII)
- Essential for trend analysis

### 5.2 PII Handling

**Sensitive Fields:**
- `task_description` - May contain code snippets with PII
- `error_message` - May contain file paths, variable names

**Mitigation:**
- Sanitize before storing (remove potential PII)
- Encrypt at rest
- Provide customer data export/deletion API

### 5.3 Access Control

**Analytics Access:**
- Org admins: Full access to all org analytics
- Team leads: Team-level analytics only
- Individual developers: Personal analytics only
- Generic Corp support: Anonymized, aggregated data only

---

## 6. Implementation Roadmap

### Phase 1: MVP (Week 1-2)

**Tables:**
- ✅ `task_executions` (core table)
- ✅ `provider_pricing` (for cost calculations)
- ⚠️ `routing_decisions` (basic version)

**Queries:**
- Real-time savings counter
- Daily cost summary
- Provider comparison (basic)

**Dashboard:**
- Simple cost savings widget
- Task execution log
- Provider usage chart

### Phase 2: Launch (Week 3-4)

**Tables:**
- ✅ `organization_analytics` (pre-aggregated)
- ✅ `user_analytics` (pre-aggregated)
- ✅ `provider_performance_metrics`

**Features:**
- Daily aggregation job (BullMQ queue)
- Team productivity dashboard
- Executive summary reports
- ROI calculator

### Phase 3: Post-Launch (Week 5-6)

**Advanced Features:**
- Predictive analytics (forecast savings)
- Custom reporting API
- Automated insights and recommendations
- Anomaly detection (unusual cost spikes)

---

## 7. Technical Considerations

### 7.1 Database Performance

**Expected Volume:**
- 10 tasks/developer/day = 100 tasks/day for 10-dev team
- 1000 tasks/day for 100-dev enterprise
- 30K tasks/month per enterprise customer

**Storage Estimates:**
- ~1 KB per task execution row
- 30K tasks/month = ~30 MB/month/customer
- 100 customers = ~3 GB/month
- **PostgreSQL can easily handle this volume**

**Scaling Strategy:**
- Partition `task_executions` by month if volume grows
- Add TimescaleDB extension for time-series optimization
- Use materialized views for complex aggregations

### 7.2 Query Performance

**Optimization Techniques:**
- Proper indexing (already included in schema)
- Query result caching (Redis)
- Pre-aggregated tables for historical data
- Materialized views for complex reports

**Monitoring:**
- Track slow queries (> 100ms)
- Monitor index usage
- Alert on table size growth

### 7.3 Real-Time Dashboard Architecture

```
User Dashboard Request
  ↓
API Server (Node.js/Express)
  ↓
Cache Layer (Redis) - 30s TTL
  ↓ (cache miss)
Query Database (PostgreSQL)
  ↓
Aggregate Results
  ↓
Cache Results
  ↓
Return to User (< 200ms)
```

---

## 8. Testing Strategy

### 8.1 Data Accuracy Tests

**Unit Tests:**
- Cost calculation accuracy
- Savings calculation accuracy
- Duration calculation
- Aggregation logic

**Integration Tests:**
- End-to-end task execution with cost tracking
- Aggregation job correctness
- Data consistency checks

### 8.2 Performance Tests

**Load Testing:**
- 1000 tasks/hour sustained load
- 10,000 tasks/hour burst load
- Dashboard query performance under load

**Benchmark Targets:**
- Task insertion: < 10ms
- Dashboard queries: < 200ms
- Aggregation job: < 5 minutes for 100K tasks

---

## 9. Monitoring & Alerting

### 9.1 Key Metrics to Monitor

**Data Pipeline Health:**
- Task executions per minute
- Failed task rate (alert if > 5%)
- Aggregation job completion time
- Database connection pool utilization

**Data Quality:**
- Null/invalid cost values (alert if > 0.1%)
- Negative savings (log and investigate)
- Missing provider pricing data

**Performance:**
- Query latency (P95, P99)
- Database CPU/memory usage
- Cache hit rate (target > 80%)

### 9.2 Alerting Rules

**Critical Alerts:**
- Aggregation job failed
- Database connection pool exhausted
- > 10% of tasks failing

**Warning Alerts:**
- Query latency > 500ms
- Provider pricing data stale (> 24 hours)
- Disk usage > 80%

---

## Conclusion

This analytics schema design provides:
- ✅ **Accurate cost tracking** for ROI calculations
- ✅ **Real-time metrics** for live dashboards
- ✅ **Pre-aggregated data** for fast historical queries
- ✅ **Scalable architecture** that grows with the business
- ✅ **Data quality controls** to ensure accuracy
- ✅ **Privacy compliance** built-in

**Ready for implementation starting Week 1.**

---

**Prepared by:** Graham "Gray" Sutton, Data Engineer
**Date:** January 26, 2026
