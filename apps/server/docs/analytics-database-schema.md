# Analytics Database Schema Design
**Date:** January 26, 2026
**Prepared by:** Graham "Gray" Sutton, Data Engineer
**Status:** Week 1 Foundation Sprint - Schema Design
**Priority:** CRITICAL - MVP Core Feature

---

## Executive Summary

This document defines the database schema for Generic Corp's analytics infrastructure, which powers our core value proposition: **real-time cost savings visibility and ROI tracking**. This analytics system will be our primary competitive differentiator and the feature that justifies premium pricing.

**Design Principles:**
- Data accuracy above all (conservative calculations)
- Multi-tenant isolation from day one
- Efficient query patterns for customer dashboards
- Scalable from MVP to enterprise
- Privacy-conscious (no sensitive code content)

---

## 1. Core Analytics Tables

### 1.1 Task Executions Table

Primary table for tracking every task execution with full cost and performance metrics.

```prisma
model TaskExecution {
  id                String          @id @default(uuid())

  // Multi-tenant isolation
  tenantId          String          @map("tenant_id")

  // Task identification
  taskId            String          @map("task_id")
  agentId           String          @map("agent_id")
  taskType          TaskType

  // Timing (millisecond precision required)
  timestampStart    DateTime        @map("timestamp_start")
  timestampEnd      DateTime        @map("timestamp_end")
  durationMs        Int             @map("duration_ms")

  // Provider information
  providerUsed      ProviderKind    @map("provider_used")
  providerAccountId String          @map("provider_account_id")

  // Cost tracking
  tokensUsed        Int             @map("tokens_used")
  costActual        Decimal         @map("cost_actual") @db.Decimal(10, 6)  // USD
  costBaseline      Decimal         @map("cost_baseline") @db.Decimal(10, 6) // What user would have paid without optimization
  savings           Decimal         @db.Decimal(10, 6)  // costBaseline - costActual

  // Status
  status            ExecutionStatus
  errorMessage      String?         @map("error_message")

  // Context (for segmentation)
  language          String?         // programming language
  complexity        ComplexityLevel?
  metadata          Json            @default("{}")

  createdAt         DateTime        @default(now()) @map("created_at")

  // Relations
  routingDecision   RoutingDecision?

  // Indexes for common queries
  @@index([tenantId, timestampStart])
  @@index([tenantId, providerUsed])
  @@index([taskType, providerUsed])
  @@index([timestampStart])  // Time-series queries
  @@map("task_executions")
}

enum TaskType {
  code_completion
  code_refactoring
  bug_fix
  test_generation
  documentation
  code_review
  other
}

enum ExecutionStatus {
  completed
  failed
  timeout
  cancelled
}

enum ComplexityLevel {
  simple
  moderate
  complex
}
```

**Query Patterns:**
- Total savings for tenant this month: `SUM(savings) WHERE tenantId = X AND timestampStart >= first_of_month`
- Provider performance comparison: `AVG(durationMs), COUNT(*) WHERE status = 'completed' GROUP BY providerUsed`
- Cost trend over time: `DATE_TRUNC('day', timestampStart), SUM(costActual) GROUP BY date`

---

### 1.2 Routing Decisions Table

Tracks why each task was routed to a specific provider (transparency for customers).

```prisma
model RoutingDecision {
  id                    String              @id @default(uuid())

  taskExecutionId       String              @unique @map("task_execution_id")
  tenantId              String              @map("tenant_id")

  // Decision metadata
  providerSelected      ProviderKind        @map("provider_selected")
  routingReason         RoutingReason       @map("routing_reason")
  decidedAt             DateTime            @default(now()) @map("decided_at")

  // Evaluated options (for analysis)
  providersEvaluated    Json                @map("providers_evaluated")  // Array of provider names
  costEstimates         Json                @map("cost_estimates")       // Map of provider -> estimated cost

  // Routing configuration used
  routingStrategy       String              @map("routing_strategy")  // "lowest_cost", "best_quality", "fastest"
  userPreferences       Json                @default("{}") @map("user_preferences")

  // Relations
  taskExecution         TaskExecution       @relation(fields: [taskExecutionId], references: [id])

  @@index([tenantId])
  @@index([providerSelected])
  @@map("routing_decisions")
}

enum RoutingReason {
  lowest_cost
  best_quality
  fastest_response
  provider_preference
  load_balancing
  fallback
}
```

**Query Patterns:**
- Routing distribution: `COUNT(*) GROUP BY routingReason`
- Cost optimization impact: Join with TaskExecution to show actual vs. alternatives

---

### 1.3 Provider Pricing Table

Real-time pricing data for each provider (updated via API feeds).

```prisma
model ProviderPricing {
  id                String       @id @default(uuid())

  provider          ProviderKind
  pricingTier       String       @map("pricing_tier")  // "standard", "premium", "enterprise"

  // Pricing structure
  costPerToken      Decimal      @map("cost_per_token") @db.Decimal(10, 8)  // USD per token
  costPerMinute     Decimal?     @map("cost_per_minute") @db.Decimal(10, 6)
  costPerRequest    Decimal?     @map("cost_per_request") @db.Decimal(10, 6)

  // Pricing metadata
  currency          String       @default("USD")
  pricingModel      String       @map("pricing_model")  // "token", "time", "request", "hybrid"

  // Validity period
  effectiveFrom     DateTime     @map("effective_from")
  effectiveUntil    DateTime?    @map("effective_until")

  // Source tracking
  sourceUrl         String?      @map("source_url")
  lastUpdated       DateTime     @default(now()) @map("last_updated")

  @@index([provider, effectiveFrom])
  @@map("provider_pricing")
}
```

**Data Sources:**
- GitHub Copilot API pricing
- OpenAI API pricing endpoint
- Google Cloud pricing API
- Manual updates from provider documentation

---

### 1.4 Provider Performance Metrics Table

Aggregated performance metrics for each provider (updated hourly/daily).

```prisma
model ProviderPerformance {
  id                    String       @id @default(uuid())

  provider              ProviderKind
  tenantId              String?      @map("tenant_id")  // NULL for global metrics

  // Time window
  periodStart           DateTime     @map("period_start")
  periodEnd             DateTime     @map("period_end")
  aggregationLevel      AggregationLevel @map("aggregation_level")

  // Performance metrics
  totalExecutions       Int          @map("total_executions")
  successfulExecutions  Int          @map("successful_executions")
  failedExecutions      Int          @map("failed_executions")

  successRate           Decimal      @map("success_rate") @db.Decimal(5, 2)  // Percentage
  avgDurationMs         Int          @map("avg_duration_ms")
  p50DurationMs         Int          @map("p50_duration_ms")
  p95DurationMs         Int          @map("p95_duration_ms")
  p99DurationMs         Int          @map("p99_duration_ms")

  avgTokensPerTask      Int          @map("avg_tokens_per_task")
  avgCostPerTask        Decimal      @map("avg_cost_per_task") @db.Decimal(10, 6)

  // Quality metrics (if available)
  avgQualityScore       Decimal?     @map("avg_quality_score") @db.Decimal(5, 2)

  createdAt             DateTime     @default(now()) @map("created_at")

  @@index([provider, periodStart])
  @@index([tenantId, periodStart])
  @@map("provider_performance")
}

enum AggregationLevel {
  hourly
  daily
  weekly
  monthly
}
```

**Generation Strategy:**
- Materialized view or scheduled aggregation job
- Reduces load on task_executions table for dashboard queries

---

### 1.5 Usage Analytics Table

Track feature usage and customer behavior (for growth analytics).

```prisma
model UsageAnalytics {
  id                    String       @id @default(uuid())

  tenantId              String       @map("tenant_id")
  date                  DateTime     @db.Date  // Daily aggregation

  // User activity
  activeUsers           Int          @map("active_users")
  newUsers              Int          @map("new_users")

  // Feature adoption
  tasksCreated          Int          @map("tasks_created")
  apiCallsMade          Int          @map("api_calls_made")
  dashboardViews        Int          @map("dashboard_views")

  // Task breakdown by type
  tasksByType           Json         @map("tasks_by_type")  // Map of TaskType -> count

  // Cost and savings
  totalCost             Decimal      @map("total_cost") @db.Decimal(10, 2)
  totalSavings          Decimal      @map("total_savings") @db.Decimal(10, 2)

  createdAt             DateTime     @default(now()) @map("created_at")

  @@unique([tenantId, date])
  @@index([date])
  @@map("usage_analytics")
}
```

---

### 1.6 Customer ROI Snapshots Table

Pre-calculated ROI metrics for quick dashboard loading (updated daily).

```prisma
model CustomerROISnapshot {
  id                        String       @id @default(uuid())

  tenantId                  String       @map("tenant_id")
  snapshotDate              DateTime     @db.Date @map("snapshot_date")

  // Cost metrics (last 30 days)
  totalCost30d              Decimal      @map("total_cost_30d") @db.Decimal(10, 2)
  totalSavings30d           Decimal      @map("total_savings_30d") @db.Decimal(10, 2)
  savingsPercentage30d      Decimal      @map("savings_percentage_30d") @db.Decimal(5, 2)

  // Productivity metrics
  tasksCompleted30d         Int          @map("tasks_completed_30d")
  avgTaskDuration30d        Int          @map("avg_task_duration_30d")  // milliseconds
  productivityGain30d       Decimal      @map("productivity_gain_30d") @db.Decimal(5, 2)  // percentage

  // Provider distribution
  providerUsageDistribution Json         @map("provider_usage_distribution")  // Map of provider -> usage %
  mostEfficientProvider     ProviderKind @map("most_efficient_provider")

  // Trend indicators
  costTrend                 TrendDirection @map("cost_trend")  // increasing, decreasing, stable
  savingsTrend              TrendDirection @map("savings_trend")

  createdAt                 DateTime     @default(now()) @map("created_at")

  @@unique([tenantId, snapshotDate])
  @@index([snapshotDate])
  @@map("customer_roi_snapshots")
}

enum TrendDirection {
  increasing
  decreasing
  stable
}
```

**Purpose:** Customer dashboards load instantly by querying this table instead of aggregating millions of task_executions records.

---

## 2. Multi-Tenant Isolation Strategy

**Approach:** Every analytics table includes `tenantId` column with proper indexing.

**Enforcement Layers:**
1. **Database:** Row-level security policies (PostgreSQL RLS) - Optional for additional safety
2. **Application:** All queries MUST include `WHERE tenantId = :currentTenant` filter
3. **API:** Tenant context extracted from JWT token, automatically injected into queries

**Example Query Pattern:**
```typescript
// GOOD - Always scoped to tenant
const savings = await prisma.taskExecution.aggregate({
  where: {
    tenantId: currentUser.tenantId,
    timestampStart: { gte: startOfMonth }
  },
  _sum: { savings: true }
});

// BAD - Never query without tenant filter
const allSavings = await prisma.taskExecution.aggregate({
  _sum: { savings: true }
}); // ❌ SECURITY VIOLATION
```

---

## 3. Data Privacy Considerations

**What We DON'T Store:**
- ❌ Actual code content (user's intellectual property)
- ❌ File paths that might contain sensitive info
- ❌ Environment variables or credentials
- ❌ Customer names or PII in analytics tables

**What We DO Store:**
- ✅ Task metadata (type, language, complexity)
- ✅ Performance metrics (duration, tokens, cost)
- ✅ Provider decisions (which provider, why)
- ✅ Aggregate statistics

**Compliance:**
- GDPR: Customer can request deletion of all tenantId records
- SOC2: Audit log all analytics data access (future)
- Data retention: 90 days for detailed metrics, 2 years for aggregates

---

## 4. Query Performance Optimization

### 4.1 Critical Indexes

```sql
-- Time-series queries (most common)
CREATE INDEX idx_task_exec_tenant_time ON task_executions(tenant_id, timestamp_start DESC);

-- Provider analysis
CREATE INDEX idx_task_exec_provider ON task_executions(tenant_id, provider_used);

-- Cost aggregations
CREATE INDEX idx_task_exec_cost ON task_executions(tenant_id, timestamp_start, cost_actual, savings);

-- Status filtering
CREATE INDEX idx_task_exec_status ON task_executions(status, timestamp_start);
```

### 4.2 Partitioning Strategy (Future)

When table grows beyond 10M rows, partition by month:

```sql
CREATE TABLE task_executions_2026_01 PARTITION OF task_executions
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### 4.3 Materialized Views

For expensive dashboard queries, create materialized views refreshed hourly:

```sql
CREATE MATERIALIZED VIEW daily_tenant_metrics AS
SELECT
  tenant_id,
  DATE(timestamp_start) as date,
  COUNT(*) as tasks_count,
  SUM(cost_actual) as total_cost,
  SUM(savings) as total_savings,
  AVG(duration_ms) as avg_duration
FROM task_executions
WHERE status = 'completed'
GROUP BY tenant_id, DATE(timestamp_start);

-- Refresh hourly via cron job
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_tenant_metrics;
```

---

## 5. Data Accuracy & Validation

### 5.1 Conservative Calculations

**Savings Calculation:**
```typescript
// ALWAYS round savings DOWN to under-promise
const savings = Math.floor((costBaseline - costActual) * 100) / 100;

// Never show savings if difference is < 1%
if (savings / costBaseline < 0.01) {
  savings = 0;
}
```

### 5.2 Data Quality Checks

Run nightly validation queries:
```sql
-- Check for impossible values
SELECT COUNT(*) FROM task_executions
WHERE cost_actual > cost_baseline;  -- Should be 0

-- Check for missing data
SELECT COUNT(*) FROM task_executions
WHERE duration_ms IS NULL OR tokens_used IS NULL;

-- Check for outliers
SELECT * FROM task_executions
WHERE cost_actual > 10.00;  -- Flag high-cost tasks for review
```

---

## 6. ROI Calculator Algorithm

### 6.1 Cost Savings Calculation

```typescript
interface ROIMetrics {
  totalCost: number;           // Actual cost paid
  baselineCost: number;        // Cost without optimization
  totalSavings: number;        // baselineCost - totalCost
  savingsPercentage: number;   // (totalSavings / baselineCost) * 100
  tasksOptimized: number;      // Tasks where we saved money
  avgSavingsPerTask: number;   // totalSavings / tasksOptimized
}

function calculateROI(tenantId: string, periodDays: number): ROIMetrics {
  const startDate = subDays(new Date(), periodDays);

  const result = await prisma.taskExecution.aggregate({
    where: {
      tenantId,
      timestampStart: { gte: startDate },
      status: 'completed'
    },
    _sum: {
      costActual: true,
      costBaseline: true,
      savings: true
    },
    _count: {
      id: true
    }
  });

  const totalCost = result._sum.costActual || 0;
  const baselineCost = result._sum.costBaseline || 0;
  const totalSavings = result._sum.savings || 0;

  // Conservative calculation
  const savingsPercentage = baselineCost > 0
    ? Math.floor((totalSavings / baselineCost) * 100)
    : 0;

  const tasksOptimized = result._count.id;
  const avgSavingsPerTask = tasksOptimized > 0
    ? totalSavings / tasksOptimized
    : 0;

  return {
    totalCost: roundToTwoDecimals(totalCost),
    baselineCost: roundToTwoDecimals(baselineCost),
    totalSavings: roundToTwoDecimals(totalSavings),
    savingsPercentage,
    tasksOptimized,
    avgSavingsPerTask: roundToTwoDecimals(avgSavingsPerTask)
  };
}
```

### 6.2 Baseline Cost Calculation

How do we determine what the customer "would have paid"?

**Strategy:**
1. **Default Provider Pricing:** Use the most expensive provider as baseline (conservative)
2. **Customer's Historical Pattern:** If they used only GitHub Copilot before, use that as baseline
3. **Transparent Methodology:** Show customers exactly how we calculated it

```typescript
function calculateBaselineCost(task: Task): number {
  // Option 1: Use most expensive evaluated provider
  const maxCost = Math.max(...task.evaluatedProviders.map(p => p.estimatedCost));

  // Option 2: Use customer's default provider
  const defaultProviderCost = getProviderCost(customer.defaultProvider, task);

  // Use the more conservative (higher) value
  return Math.max(maxCost, defaultProviderCost);
}
```

---

## 7. Dashboard Query Examples

### 7.1 Real-Time Savings Counter

```typescript
// "You saved $X this month"
const monthlySavings = await prisma.taskExecution.aggregate({
  where: {
    tenantId: currentTenant,
    timestampStart: { gte: startOfMonth(new Date()) },
    status: 'completed'
  },
  _sum: { savings: true }
});

return {
  savings: monthlySavings._sum.savings || 0,
  message: `You saved $${monthlySavings._sum.savings.toFixed(2)} this month`
};
```

### 7.2 Provider Performance Comparison

```typescript
// Show which provider is fastest/cheapest/most reliable
const providerStats = await prisma.taskExecution.groupBy({
  by: ['providerUsed'],
  where: {
    tenantId: currentTenant,
    timestampStart: { gte: subDays(new Date(), 7) },
    status: 'completed'
  },
  _count: { id: true },
  _avg: {
    durationMs: true,
    costActual: true
  }
});

return providerStats.map(stat => ({
  provider: stat.providerUsed,
  tasksCompleted: stat._count.id,
  avgDuration: Math.round(stat._avg.durationMs),
  avgCost: stat._avg.costActual.toFixed(4)
}));
```

### 7.3 Cost Trend Chart

```typescript
// Daily cost trend for last 30 days
const costTrend = await prisma.$queryRaw`
  SELECT
    DATE(timestamp_start) as date,
    SUM(cost_actual) as total_cost,
    SUM(savings) as total_savings
  FROM task_executions
  WHERE tenant_id = ${tenantId}
    AND timestamp_start >= ${subDays(new Date(), 30)}
    AND status = 'completed'
  GROUP BY DATE(timestamp_start)
  ORDER BY date ASC
`;

return costTrend;
```

---

## 8. Implementation Timeline

### Phase 1: Week 1 (Jan 26 - Feb 1) - Foundation
- ✅ Schema design (this document)
- [ ] Add models to Prisma schema
- [ ] Generate migration
- [ ] Run migration in dev environment
- [ ] Write seed data for testing

### Phase 2: Week 1-2 - Basic Analytics Pipeline
- [ ] Event listener for task executions
- [ ] Cost calculation engine
- [ ] Basic ROI calculator functions
- [ ] Unit tests for calculations

### Phase 3: Week 2 (Feb 2-8) - Dashboard Integration
- [ ] REST API endpoints for analytics
- [ ] Real-time metrics queries
- [ ] Provider comparison queries
- [ ] Integration with DeVonte's dashboard UI

### Phase 4: Week 3 (Feb 9-15) - Optimization & Polish
- [ ] Query performance tuning
- [ ] Add materialized views
- [ ] Data validation checks
- [ ] Documentation for API consumers

---

## 9. Monitoring & Alerts

**Metrics to Track:**
- Query latency for dashboard endpoints (target: <500ms)
- Data freshness: time lag between task execution and analytics availability
- Data quality: percentage of tasks with complete cost data
- Storage growth rate: GB per week

**Alerts:**
- ⚠️ Analytics query latency > 2 seconds
- ⚠️ Data lag > 5 minutes
- ⚠️ Missing cost data > 5% of tasks
- 🚨 Multi-tenant isolation violation detected

---

## 10. Open Questions for Team

1. **For Yuki:** PostgreSQL sufficient for MVP, or implement TimescaleDB now?
2. **For Sable:** Event-driven instrumentation or direct API calls for metrics collection?
3. **For DeVonte:** What specific dashboard views do you need? Real-time or 5-minute cache OK?
4. **For Marcus:** How should we handle free tier users - full analytics or limited?

---

## 11. Success Metrics

**Week 1 Validation:**
- [ ] Schema deployed to dev environment
- [ ] Can track 1,000 task executions
- [ ] ROI calculator returns accurate results
- [ ] Dashboard queries run in <500ms

**Week 2 Validation:**
- [ ] Real customer data flowing through pipeline
- [ ] First customer sees their savings dashboard
- [ ] Savings calculations validated against actual provider costs
- [ ] Zero multi-tenant data leaks in testing

**Week 3 (Launch):**
- [ ] 50+ customers using analytics dashboard
- [ ] Query performance maintains <500ms at scale
- [ ] First customer testimonial mentioning ROI visibility

---

## Conclusion

This analytics schema is designed for:
- ✅ **Speed:** Can implement in Week 1, iterate in production
- ✅ **Accuracy:** Conservative calculations build customer trust
- ✅ **Scale:** Indexes and aggregation strategy handle growth
- ✅ **Privacy:** No sensitive data stored, multi-tenant isolation enforced
- ✅ **Value:** Powers our #1 sales feature - the ROI dashboard

**Next Steps:**
1. Team review of this schema (tomorrow)
2. Add to Prisma schema file
3. Generate and run migration
4. Start building the analytics pipeline

The foundation is solid. Let's build the analytics system that will sell our platform.

---

**Document Status:** Draft for Team Review
**Last Updated:** January 26, 2026
**Next Review:** January 27, 2026 (Team Meeting)
