# Analytics Infrastructure Design
**Date:** January 26, 2026
**Prepared by:** Graham "Gray" Sutton, Data Engineer
**Status:** Technical Design - Ready for Implementation

---

## Executive Summary

This document outlines the analytics infrastructure to support our Enterprise Developer Productivity Platform revenue strategy. The design leverages our existing PostgreSQL/Prisma foundation and can deliver customer-facing ROI analytics within **3-5 days** for sales demos.

---

## Current Data Assets

### Existing Schema Strengths:
✅ **AgentSession table** - Captures `tokensUsed` and `toolCalls` (perfect for cost tracking)
✅ **Task table** - Has `provider` field and timing data (`startedAt`, `completedAt`)
✅ **ActivityLog table** - Audit trail for all agent actions
✅ **ProviderAccount table** - Tracks provider usage with `lastUsedAt`

### Current Gaps (Need to Build):
❌ No cost metadata per API call
❌ No aggregated metrics tables
❌ No customer-facing analytics endpoints
❌ No ROI calculation logic

---

## Analytics Schema Extensions

### 1. Provider API Call Tracking (New Table)

```prisma
model ProviderApiCall {
  id                String       @id @default(uuid())
  sessionId         String       @map("session_id")
  taskId            String?      @map("task_id")
  provider          ProviderKind
  operation         String       // "code_completion", "code_review", "bug_fix", etc.
  tokensInput       Int          @map("tokens_input")
  tokensOutput      Int          @map("tokens_output")
  costUsd           Decimal      @map("cost_usd") @db.Decimal(10, 6)
  latencyMs         Int          @map("latency_ms")
  success           Boolean      @default(true)
  errorMessage      String?      @map("error_message")
  timestamp         DateTime     @default(now())

  session           AgentSession @relation(fields: [sessionId], references: [id])
  task              Task?        @relation(fields: [taskId], references: [id])

  @@index([provider, timestamp])
  @@index([taskId])
  @@map("provider_api_calls")
}
```

### 2. Daily Metrics Aggregation (New Table)

```prisma
model DailyMetrics {
  id                    String       @id @default(uuid())
  date                  DateTime     @db.Date
  provider              ProviderKind
  agentId               String?      @map("agent_id")
  totalCalls            Int          @default(0) @map("total_calls")
  successfulCalls       Int          @default(0) @map("successful_calls")
  totalCostUsd          Decimal      @map("total_cost_usd") @db.Decimal(10, 2)
  totalTokensInput      BigInt       @map("total_tokens_input")
  totalTokensOutput     BigInt       @map("total_tokens_output")
  avgLatencyMs          Int          @map("avg_latency_ms")
  tasksCompleted        Int          @default(0) @map("tasks_completed")

  agent                 Agent?       @relation(fields: [agentId], references: [id])

  @@unique([date, provider, agentId])
  @@index([date])
  @@map("daily_metrics")
}
```

### 3. ROI Calculations (New Table)

```prisma
model RoiCalculation {
  id                    String   @id @default(uuid())
  periodStart           DateTime @map("period_start")
  periodEnd             DateTime @map("period_end")
  actualCostUsd         Decimal  @map("actual_cost_usd") @db.Decimal(10, 2)
  baselineCostUsd       Decimal  @map("baseline_cost_usd") @db.Decimal(10, 2)
  savingsUsd            Decimal  @map("savings_usd") @db.Decimal(10, 2)
  savingsPercent        Decimal  @map("savings_percent") @db.Decimal(5, 2)
  tasksCompleted        Int      @map("tasks_completed")
  optimalRoutingPercent Decimal  @map("optimal_routing_percent") @db.Decimal(5, 2)
  calculatedAt          DateTime @default(now()) @map("calculated_at")

  @@index([periodStart, periodEnd])
  @@map("roi_calculations")
}
```

---

## Implementation Phases

### Phase 1: Cost Tracking Foundation (Days 1-2)

**Deliverables:**
1. Database migration for new tables
2. API call interceptor/middleware to log all provider calls
3. Cost calculation service (provider-specific pricing models)
4. Real-time cost tracking in AgentSession

**Technical Approach:**
```typescript
// services/analytics/cost-tracker.ts
class CostTracker {
  async logProviderCall(params: {
    sessionId: string;
    taskId?: string;
    provider: ProviderKind;
    operation: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
  }): Promise<void> {
    const cost = this.calculateCost(
      params.provider,
      params.tokensInput,
      params.tokensOutput
    );

    await prisma.providerApiCall.create({
      data: { ...params, costUsd: cost }
    });
  }

  private calculateCost(
    provider: ProviderKind,
    tokensIn: number,
    tokensOut: number
  ): number {
    const pricing = {
      openai_codex: { input: 0.002, output: 0.004 }, // per 1K tokens
      github_copilot: { input: 0.001, output: 0.003 },
      google_code_assist: { input: 0.0015, output: 0.0035 }
    };

    const rates = pricing[provider];
    return (tokensIn / 1000 * rates.input) + (tokensOut / 1000 * rates.output);
  }
}
```

### Phase 2: Customer Analytics API (Days 3-4)

**Deliverables:**
1. REST API endpoints for analytics queries
2. Real-time cost dashboard data
3. Historical trends and comparisons
4. Export functionality (CSV, JSON)

**API Endpoints:**
```typescript
GET /api/analytics/cost-summary
  ?startDate=2026-01-01&endDate=2026-01-31

Response: {
  actualCost: 1234.56,
  baselineCost: 2000.00,
  savings: 765.44,
  savingsPercent: 38.27,
  breakdown: [
    { provider: "openai_codex", cost: 500.00, calls: 1500 },
    { provider: "github_copilot", cost: 734.56, calls: 2200 }
  ]
}

GET /api/analytics/usage-metrics
  ?period=30d&groupBy=day

Response: {
  metrics: [
    {
      date: "2026-01-26",
      tasksCompleted: 45,
      apiCalls: 320,
      cost: 78.90,
      avgLatency: 1234
    }
  ]
}

GET /api/analytics/provider-performance

Response: {
  providers: [
    {
      provider: "openai_codex",
      avgLatency: 987,
      successRate: 0.98,
      costPerTask: 0.75,
      optimalForTasks: ["bug_fix", "refactor"]
    }
  ]
}

GET /api/analytics/export
  ?format=csv&startDate=2026-01-01&endDate=2026-01-31

Response: CSV file download
```

### Phase 3: ROI Dashboard Backend (Day 5)

**Deliverables:**
1. Real-time ROI calculation engine
2. "What-if" analysis (simulate single-provider costs)
3. Optimal routing recommendations
4. WebSocket updates for live metrics

**Technical Approach:**
```typescript
// services/analytics/roi-calculator.ts
class RoiCalculator {
  async calculateRoi(
    startDate: Date,
    endDate: Date
  ): Promise<RoiCalculation> {
    // Get actual costs from our intelligent routing
    const actualCost = await this.getActualCost(startDate, endDate);

    // Calculate baseline: what if we only used most expensive provider?
    const baselineCost = await this.calculateBaselineCost(startDate, endDate);

    // Calculate savings
    const savings = baselineCost - actualCost;
    const savingsPercent = (savings / baselineCost) * 100;

    return {
      actualCostUsd: actualCost,
      baselineCostUsd: baselineCost,
      savingsUsd: savings,
      savingsPercent,
      tasksCompleted: await this.countTasks(startDate, endDate),
      optimalRoutingPercent: await this.getRoutingEfficiency(startDate, endDate)
    };
  }

  private async calculateBaselineCost(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // Simulate: what if ALL tasks went to OpenAI (most expensive)?
    const tasks = await prisma.task.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: "completed"
      },
      include: {
        activityLogs: true
      }
    });

    // Re-calculate costs assuming worst-case provider
    let baselineCost = 0;
    for (const task of tasks) {
      const estimatedTokens = this.estimateTokensFromTask(task);
      baselineCost += this.calculateCost(
        "openai_codex", // Most expensive
        estimatedTokens.input,
        estimatedTokens.output
      );
    }

    return baselineCost;
  }
}
```

---

## Data Pipeline Architecture

### Real-Time Event Stream
```
Provider API Call
    ↓
[Cost Tracker Middleware]
    ↓
Write to provider_api_calls table
    ↓
[Redis Pub/Sub] → WebSocket → Customer Dashboard
    ↓
[BullMQ Job] → Daily Aggregation
```

### Aggregation Jobs (BullMQ)
- **Hourly:** Rolling metrics for real-time dashboard
- **Daily:** Aggregate to daily_metrics table
- **Weekly:** ROI calculations and reports
- **Monthly:** Historical analysis and trends

### Query Optimization
- Materialized views for common aggregations
- Read replica for analytics queries
- Redis caching for dashboard APIs (5-minute TTL)
- Pre-calculated ROI for common date ranges

---

## Privacy & Security

### Data Retention Policies
- **Raw API calls:** 90 days (configurable)
- **Daily metrics:** 2 years
- **ROI calculations:** Indefinite (minimal PII)

### PII Protection
- **Never store:** Actual code content, file names, variable names
- **Store only:** Metadata (tokens, cost, latency, task type)
- **Anonymization:** Customer data isolated per tenant

### Compliance
- GDPR Article 25: Data minimization by design
- SOC 2 Type II: Audit logging for all analytics access
- CCPA: Export and deletion endpoints ready

---

## Competitive Differentiation

### Analytics as a Sales Tool

**Customer Dashboard Features:**
1. **Cost Savings Hero Metric** - Big number showing monthly savings
2. **Provider Performance Comparison** - Visual charts comparing speed/cost/quality
3. **ROI Timeline** - Show cumulative savings over time
4. **Optimization Recommendations** - AI-driven suggestions for better routing

**Sales Demo Script:**
> "See this dashboard? This customer saved $5,432 last month by letting our platform intelligently route tasks. GitHub Copilot handled their quick autocompletes, while OpenAI Codex tackled complex refactoring. They paid less than using any single provider."

### Enterprise Features
- **Team Analytics:** Compare developer productivity across teams
- **Cost Allocation:** Chargeback reports for finance teams
- **Budget Alerts:** Notify before hitting spending limits
- **Custom Reports:** Scheduled PDF/CSV reports via email

---

## Infrastructure Costs

### At 100 Customers Scale:

**Database:**
- PostgreSQL storage: ~50 GB ($10/month on AWS RDS)
- Read replica: $25/month
- Backups: $5/month

**Redis:**
- Cache layer: $15/month (ElastiCache)

**Compute:**
- Aggregation jobs: Minimal (use existing workers)

**Total:** ~$60-80/month

**Cost per customer:** $0.60-0.80/month (excellent margin)

---

## Success Metrics

### Technical KPIs:
- Query response time: <200ms for dashboard APIs
- Data freshness: <5 minute lag for real-time metrics
- Aggregation job success rate: >99.5%
- Storage growth: <1 GB per 1000 API calls

### Business KPIs:
- Customer engagement: >70% view analytics weekly
- Upsell trigger: Alert when customer hits free tier limits
- Retention: Customers viewing ROI dashboard churn <5% annually
- Sales cycle: Reduce by 30% with ROI demos

---

## Implementation Timeline

| Day | Focus | Deliverables |
|-----|-------|-------------|
| 1 | Schema & Migration | New tables, migration scripts |
| 2 | Cost Tracking | Middleware, cost calculator |
| 3 | Analytics API | REST endpoints, queries |
| 4 | Dashboard Backend | Aggregations, caching |
| 5 | ROI Engine | What-if analysis, recommendations |

**Demo-Ready:** End of Day 3 (basic cost tracking + API)
**Production-Ready:** End of Day 5 (full featured)

---

## Next Steps

### Immediate Actions:
1. ✅ Design complete - awaiting approval
2. ⏳ Create Prisma migration for new tables
3. ⏳ Implement cost tracking middleware
4. ⏳ Build analytics API endpoints
5. ⏳ Coordinate with DeVonte on dashboard UI requirements

### Dependencies:
- **Sable:** Review schema design for scalability
- **DeVonte:** Dashboard wireframes/mockups for API contract
- **Yuki:** Confirm Redis setup for caching layer
- **Marcus:** Approve analytics-as-differentiator strategy

---

## Risk Mitigation

### Technical Risks:
- ⚠️ **Provider pricing changes** → Mitigation: Pricing config in database, easy updates
- ⚠️ **Token estimation accuracy** → Mitigation: Calibrate with real data, 10% buffer
- ⚠️ **Query performance at scale** → Mitigation: Indexed, materialized views, caching

### Business Risks:
- ⚠️ **Customers question ROI accuracy** → Mitigation: Show detailed breakdown, methodology doc
- ⚠️ **Analytics complexity confuses users** → Mitigation: Progressive disclosure, simple defaults

---

## Conclusion

Our analytics infrastructure can be a **major competitive advantage** and **revenue accelerator**:

1. **Sales Enablement:** ROI demos close deals faster
2. **Customer Retention:** Visible value keeps customers engaged
3. **Upsell Engine:** Usage analytics drive plan upgrades
4. **Product Intelligence:** Data informs routing optimization

I can have a working prototype in **3 days** - perfect timing for Marcus's sales push.

**Ready to build. Awaiting go-ahead.**

---

*"Perfect data pipelines are useless without data. Perfect analytics are powerful when they drive revenue."* - Gray Sutton
