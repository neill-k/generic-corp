# Analytics Dashboard API Specification
**Date:** January 26, 2026
**Prepared by:** Graham "Gray" Sutton, Data Engineer
**For:** DeVonte Jackson, Full-Stack Developer
**Purpose:** API contract for multi-provider AI orchestration cost savings dashboard
**Status:** Ready for Implementation

---

## Executive Summary

This document defines the REST API contract for the cost savings dashboard that will be the centerpiece of our Friday (Day 5) demo. The dashboard showcases the **killer value proposition**: intelligent multi-provider routing saves customers real money compared to using a single AI provider.

**Key Principle:** Mock data is perfectly acceptable for the demo. Focus on the data structure and "wow factor" metrics that make executives say "I need this."

---

## Authentication

All endpoints require authentication via JWT bearer token:

```http
Authorization: Bearer <jwt_token>
```

**Multi-tenant Isolation:**
- Customer ID extracted from JWT token automatically
- All queries filtered by customer context
- Zero trust on client-provided tenant identifiers

---

## Core API Endpoints

### 1. Cost Savings Summary (Hero Metric)

**Endpoint:** `GET /api/v1/analytics/cost-savings/summary`

**Purpose:** The big number that grabs attention. "You saved $X this month."

**Query Parameters:**
- `period` (optional): `"today"` | `"week"` | `"month"` | `"quarter"` | `"year"` (default: `"month"`)
- `startDate` (optional): ISO 8601 date (overrides period)
- `endDate` (optional): ISO 8601 date (overrides period)

**Response Schema:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z",
    "label": "January 2026"
  },
  "savings": {
    "totalSaved": 47382.45,
    "percentageSaved": 37.4,
    "actualCost": 79254.30,
    "baselineCost": 126636.75,
    "projectedAnnualSavings": 568589.40
  },
  "metrics": {
    "totalTasks": 12458,
    "totalApiCalls": 89234,
    "avgCostPerTask": 6.36,
    "optimalRoutingRate": 94.2
  },
  "trend": {
    "direction": "improving",
    "changeFromPrevious": 4.8,
    "previousPeriodSavings": 42598.20
  },
  "meta": {
    "currency": "USD",
    "lastUpdated": "2026-01-26T15:30:00Z",
    "dataFreshness": "real-time"
  }
}
```

**Field Definitions:**
- `totalSaved`: The hero number - total cost savings in dollars
- `percentageSaved`: Savings as percentage of baseline cost
- `actualCost`: What customer actually paid with intelligent routing
- `baselineCost`: What they would have paid using only the most expensive provider (OpenAI)
- `projectedAnnualSavings`: Annualized savings projection based on current month
- `optimalRoutingRate`: Percentage of tasks routed to optimal provider (higher = better)
- `trend.direction`: `"improving"` | `"declining"` | `"stable"`
- `trend.changeFromPrevious`: Percentage point change from previous period

**Mock Data Example:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z",
    "label": "January 2026"
  },
  "savings": {
    "totalSaved": 47382.45,
    "percentageSaved": 37.4,
    "actualCost": 79254.30,
    "baselineCost": 126636.75,
    "projectedAnnualSavings": 568589.40
  },
  "metrics": {
    "totalTasks": 12458,
    "totalApiCalls": 89234,
    "avgCostPerTask": 6.36,
    "optimalRoutingRate": 94.2
  },
  "trend": {
    "direction": "improving",
    "changeFromPrevious": 4.8,
    "previousPeriodSavings": 42598.20
  },
  "meta": {
    "currency": "USD",
    "lastUpdated": "2026-01-26T15:30:00Z",
    "dataFreshness": "real-time"
  }
}
```

---

### 2. Provider Comparison

**Endpoint:** `GET /api/v1/analytics/providers/comparison`

**Purpose:** Show how each AI provider performed - cost, speed, usage breakdown.

**Query Parameters:**
- `period` (optional): Same as above (default: `"month"`)
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date
- `groupBy` (optional): `"day"` | `"week"` | `"month"` (for time series)

**Response Schema:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z"
  },
  "providers": [
    {
      "provider": "github_copilot",
      "displayName": "GitHub Copilot",
      "usage": {
        "taskCount": 6842,
        "taskPercentage": 54.9,
        "apiCalls": 48234,
        "tokensInput": 12458000,
        "tokensOutput": 8934000
      },
      "cost": {
        "total": 24538.20,
        "costPerTask": 3.59,
        "costPerToken": 0.000001865
      },
      "performance": {
        "avgLatencyMs": 1234,
        "successRate": 98.4,
        "errorRate": 1.6
      },
      "savings": {
        "vsBaseline": 18294.50,
        "percentSaved": 42.7
      },
      "optimalFor": ["autocomplete", "quick_fixes", "simple_refactors"]
    },
    {
      "provider": "openai_codex",
      "displayName": "OpenAI Codex (GPT-4)",
      "usage": {
        "taskCount": 3845,
        "taskPercentage": 30.9,
        "apiCalls": 28745,
        "tokensInput": 9234000,
        "tokensOutput": 7456000
      },
      "cost": {
        "total": 42658.10,
        "costPerTask": 11.09,
        "costPerToken": 0.000002554
      },
      "performance": {
        "avgLatencyMs": 2145,
        "successRate": 96.8,
        "errorRate": 3.2
      },
      "savings": {
        "vsBaseline": 0.00,
        "percentSaved": 0.0
      },
      "optimalFor": ["complex_refactors", "architecture", "test_generation"]
    },
    {
      "provider": "anthropic_claude",
      "displayName": "Anthropic Claude",
      "usage": {
        "taskCount": 1771,
        "taskPercentage": 14.2,
        "apiCalls": 12255,
        "tokensInput": 5623000,
        "tokensOutput": 4189000
      },
      "cost": {
        "total": 12058.00,
        "costPerTask": 6.81,
        "costPerToken": 0.000001225
      },
      "performance": {
        "avgLatencyMs": 1867,
        "successRate": 97.9,
        "errorRate": 2.1
      },
      "savings": {
        "vsBaseline": 7029.95,
        "percentSaved": 36.8
      },
      "optimalFor": ["documentation", "code_review", "explanations"]
    }
  ],
  "summary": {
    "totalProviders": 3,
    "mostUsedProvider": "github_copilot",
    "mostEfficientProvider": "github_copilot",
    "highestQualityProvider": "openai_codex"
  },
  "meta": {
    "lastUpdated": "2026-01-26T15:30:00Z"
  }
}
```

**Field Definitions:**
- `provider`: Internal provider identifier
- `displayName`: User-friendly provider name for UI
- `taskPercentage`: Percentage of total tasks handled by this provider
- `costPerTask`: Average cost per task (useful for comparing efficiency)
- `avgLatencyMs`: Average response time in milliseconds
- `successRate`: Percentage of successful completions
- `vsBaseline`: Savings vs. if all tasks went to OpenAI (the baseline)
- `optimalFor`: Array of task types this provider handles best

---

### 3. Usage Metrics

**Endpoint:** `GET /api/v1/analytics/usage/metrics`

**Purpose:** Detailed usage statistics for understanding consumption patterns.

**Query Parameters:**
- `period` (optional): `"today"` | `"week"` | `"month"` (default: `"month"`)
- `startDate` (optional): ISO 8601 date
- `endDate` (optional): ISO 8601 date

**Response Schema:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z"
  },
  "usage": {
    "totalApiCalls": 89234,
    "totalTasks": 12458,
    "totalTokens": 47960000,
    "totalDevelopers": 87,
    "activeDevelopers": 74
  },
  "averages": {
    "callsPerDay": 2878,
    "tasksPerDay": 402,
    "callsPerTask": 7.16,
    "tasksPerDeveloper": 169.7
  },
  "errors": {
    "totalErrors": 1428,
    "errorRate": 1.6,
    "topErrors": [
      {
        "errorType": "rate_limit_exceeded",
        "count": 542,
        "provider": "openai_codex"
      },
      {
        "errorType": "timeout",
        "count": 389,
        "provider": "anthropic_claude"
      },
      {
        "errorType": "invalid_request",
        "count": 234,
        "provider": "github_copilot"
      }
    ]
  },
  "taskTypes": {
    "distribution": [
      {
        "type": "autocomplete",
        "count": 5842,
        "percentage": 46.9
      },
      {
        "type": "refactor",
        "count": 2934,
        "percentage": 23.6
      },
      {
        "type": "bug_fix",
        "count": 1845,
        "percentage": 14.8
      },
      {
        "type": "test_generation",
        "count": 1234,
        "percentage": 9.9
      },
      {
        "type": "documentation",
        "count": 603,
        "percentage": 4.8
      }
    ]
  },
  "meta": {
    "lastUpdated": "2026-01-26T15:30:00Z"
  }
}
```

---

### 4. Monthly Trends (Time Series)

**Endpoint:** `GET /api/v1/analytics/trends/monthly`

**Purpose:** Historical data for charts showing savings and cost over time.

**Query Parameters:**
- `months` (optional): Number of months to include (default: 6, max: 24)
- `startDate` (optional): ISO 8601 date (month boundary)
- `endDate` (optional): ISO 8601 date (month boundary)
- `granularity` (optional): `"day"` | `"week"` | `"month"` (default: `"month"`)

**Response Schema:**
```json
{
  "granularity": "month",
  "dataPoints": [
    {
      "period": {
        "start": "2025-08-01T00:00:00Z",
        "end": "2025-08-31T23:59:59Z",
        "label": "Aug 2025"
      },
      "savings": {
        "totalSaved": 28456.30,
        "percentageSaved": 32.1,
        "actualCost": 60123.50,
        "baselineCost": 88579.80
      },
      "usage": {
        "totalTasks": 8234,
        "totalApiCalls": 58234
      }
    },
    {
      "period": {
        "start": "2025-09-01T00:00:00Z",
        "end": "2025-09-30T23:59:59Z",
        "label": "Sep 2025"
      },
      "savings": {
        "totalSaved": 34782.15,
        "percentageSaved": 34.8,
        "actualCost": 65112.40,
        "baselineCost": 99894.55
      },
      "usage": {
        "totalTasks": 9456,
        "totalApiCalls": 67234
      }
    },
    {
      "period": {
        "start": "2025-10-01T00:00:00Z",
        "end": "2025-10-31T23:59:59Z",
        "label": "Oct 2025"
      },
      "savings": {
        "totalSaved": 38923.45,
        "percentageSaved": 35.6,
        "actualCost": 70512.30,
        "baselineCost": 109435.75
      },
      "usage": {
        "totalTasks": 10234,
        "totalApiCalls": 72456
      }
    },
    {
      "period": {
        "start": "2025-11-01T00:00:00Z",
        "end": "2025-11-30T23:59:59Z",
        "label": "Nov 2025"
      },
      "savings": {
        "totalSaved": 41234.60,
        "percentageSaved": 36.2,
        "actualCost": 72678.90,
        "baselineCost": 113913.50
      },
      "usage": {
        "totalTasks": 11123,
        "totalApiCalls": 78945
      }
    },
    {
      "period": {
        "start": "2025-12-01T00:00:00Z",
        "end": "2025-12-31T23:59:59Z",
        "label": "Dec 2025"
      },
      "savings": {
        "totalSaved": 42598.20,
        "percentageSaved": 36.8,
        "actualCost": 73134.80,
        "baselineCost": 115733.00
      },
      "usage": {
        "totalTasks": 11567,
        "totalApiCalls": 81234
      }
    },
    {
      "period": {
        "start": "2026-01-01T00:00:00Z",
        "end": "2026-01-31T23:59:59Z",
        "label": "Jan 2026"
      },
      "savings": {
        "totalSaved": 47382.45,
        "percentageSaved": 37.4,
        "actualCost": 79254.30,
        "baselineCost": 126636.75
      },
      "usage": {
        "totalTasks": 12458,
        "totalApiCalls": 89234
      }
    }
  ],
  "summary": {
    "totalSavings": 233377.15,
    "averageMonthlySavings": 38896.19,
    "savingsTrend": "increasing",
    "percentageGrowth": 17.4
  },
  "meta": {
    "lastUpdated": "2026-01-26T15:30:00Z"
  }
}
```

**Notes for Charts:**
- Use `dataPoints` array for time series line/area charts
- `period.label` for x-axis labels
- `savings.totalSaved` for primary y-axis
- `savings.percentageSaved` for secondary y-axis or tooltip
- `savingsTrend` for trend indicator (up/down arrow)

---

### 5. Real-Time Dashboard Feed

**Endpoint:** `GET /api/v1/analytics/realtime/summary`

**Purpose:** Current activity snapshot for "live updating" feel in the UI.

**Query Parameters:**
- `interval` (optional): `"5min"` | `"15min"` | `"1hour"` (default: `"15min"`)

**Response Schema:**
```json
{
  "interval": {
    "duration": "15min",
    "start": "2026-01-26T15:15:00Z",
    "end": "2026-01-26T15:30:00Z"
  },
  "current": {
    "activeTasks": 47,
    "recentCompletions": 12,
    "currentCost": 145.30,
    "currentSavings": 67.20
  },
  "recentActivity": [
    {
      "timestamp": "2026-01-26T15:29:45Z",
      "taskType": "autocomplete",
      "provider": "github_copilot",
      "cost": 0.34,
      "savingsVsBaseline": 0.58,
      "latencyMs": 987,
      "status": "completed"
    },
    {
      "timestamp": "2026-01-26T15:29:32Z",
      "taskType": "refactor",
      "provider": "openai_codex",
      "cost": 12.45,
      "savingsVsBaseline": 0.00,
      "latencyMs": 2134,
      "status": "completed"
    },
    {
      "timestamp": "2026-01-26T15:29:18Z",
      "taskType": "bug_fix",
      "provider": "anthropic_claude",
      "cost": 5.67,
      "savingsVsBaseline": 2.34,
      "latencyMs": 1456,
      "status": "completed"
    }
  ],
  "meta": {
    "refreshInterval": 5,
    "lastUpdated": "2026-01-26T15:30:00Z"
  }
}
```

**Notes:**
- Poll this endpoint every 5-10 seconds for "live" dashboard feel
- `recentActivity` limited to last 20 items
- Use WebSocket upgrade (future enhancement) for true real-time push

---

### 6. Provider Performance Over Time

**Endpoint:** `GET /api/v1/analytics/providers/performance`

**Purpose:** Track provider reliability and performance trends.

**Query Parameters:**
- `period` (optional): `"week"` | `"month"` | `"quarter"` (default: `"month"`)
- `provider` (optional): Filter to specific provider (default: all)
- `granularity` (optional): `"day"` | `"week"` (default: `"day"`)

**Response Schema:**
```json
{
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z"
  },
  "providers": [
    {
      "provider": "github_copilot",
      "displayName": "GitHub Copilot",
      "performanceMetrics": {
        "avgLatencyMs": 1234,
        "p95LatencyMs": 2145,
        "p99LatencyMs": 3456,
        "successRate": 98.4,
        "uptimePercentage": 99.87
      },
      "trend": {
        "latencyTrend": "improving",
        "reliabilityTrend": "stable"
      }
    },
    {
      "provider": "openai_codex",
      "displayName": "OpenAI Codex (GPT-4)",
      "performanceMetrics": {
        "avgLatencyMs": 2145,
        "p95LatencyMs": 3567,
        "p99LatencyMs": 5234,
        "successRate": 96.8,
        "uptimePercentage": 99.12
      },
      "trend": {
        "latencyTrend": "stable",
        "reliabilityTrend": "improving"
      }
    },
    {
      "provider": "anthropic_claude",
      "displayName": "Anthropic Claude",
      "performanceMetrics": {
        "avgLatencyMs": 1867,
        "p95LatencyMs": 2987,
        "p99LatencyMs": 4123,
        "successRate": 97.9,
        "uptimePercentage": 99.54
      },
      "trend": {
        "latencyTrend": "improving",
        "reliabilityTrend": "stable"
      }
    }
  ],
  "meta": {
    "lastUpdated": "2026-01-26T15:30:00Z"
  }
}
```

---

### 7. Export Data (CSV/JSON)

**Endpoint:** `POST /api/v1/analytics/export`

**Purpose:** Allow customers to export their analytics data.

**Request Body:**
```json
{
  "format": "csv",
  "dataType": "cost_savings",
  "period": {
    "start": "2026-01-01T00:00:00Z",
    "end": "2026-01-31T23:59:59Z"
  },
  "includeFields": [
    "timestamp",
    "provider",
    "taskType",
    "cost",
    "savings",
    "latency"
  ]
}
```

**Response (Async Job):**
```json
{
  "exportId": "exp_abc123def456",
  "status": "processing",
  "estimatedCompletionSeconds": 45,
  "statusUrl": "/api/v1/analytics/export/exp_abc123def456/status",
  "createdAt": "2026-01-26T15:30:00Z"
}
```

**Status Check:**
```http
GET /api/v1/analytics/export/exp_abc123def456/status
```

**Status Response:**
```json
{
  "exportId": "exp_abc123def456",
  "status": "completed",
  "downloadUrl": "/api/v1/analytics/export/exp_abc123def456/download",
  "expiresAt": "2026-01-27T15:30:00Z",
  "fileSizeBytes": 2458000,
  "recordCount": 12458,
  "format": "csv"
}
```

---

## Error Handling

**Standard Error Response Format:**
```json
{
  "error": {
    "code": "invalid_date_range",
    "message": "End date must be after start date",
    "field": "endDate",
    "statusCode": 400
  },
  "requestId": "req_1a2b3c4d5e6f",
  "timestamp": "2026-01-26T15:30:00Z"
}
```

**Common Error Codes:**
- `400` - Invalid request parameters
- `401` - Unauthorized (missing/invalid auth token)
- `403` - Forbidden (valid auth but insufficient permissions)
- `404` - Resource not found
- `429` - Rate limit exceeded
- `500` - Internal server error

---

## Response Times & Caching

**Performance Targets:**
- Summary endpoints: < 200ms (p95)
- Trends endpoints: < 500ms (p95)
- Export initiation: < 100ms
- Real-time feed: < 100ms

**Caching Strategy:**
- Summary data: 5-minute cache
- Historical trends: 1-hour cache
- Real-time feed: No caching
- Provider comparison: 15-minute cache

**Cache Headers:**
```http
Cache-Control: max-age=300, private
ETag: "abc123def456"
Last-Modified: Mon, 26 Jan 2026 15:30:00 GMT
```

---

## Mock Data Generation

**For Demo Purposes:**

All endpoints can return mock data with realistic patterns:

1. **Savings increase over time** (shows platform learning and optimization)
2. **GitHub Copilot handles bulk of simple tasks** (autocomplete, quick fixes)
3. **OpenAI Codex for complex tasks** (refactors, architecture)
4. **Anthropic Claude for documentation** (explanations, reviews)
5. **~35-40% average savings** (compelling but believable)
6. **94-96% optimal routing rate** (shows intelligent system)

**Mock Data Seed:**
```typescript
// Use consistent seed for reproducible demo data
const DEMO_SEED = {
  customerId: "demo-customer-001",
  startDate: "2025-08-01",
  monthlySavings: [28456, 34782, 38923, 41234, 42598, 47382],
  providers: ["github_copilot", "openai_codex", "anthropic_claude"],
  taskTypes: ["autocomplete", "refactor", "bug_fix", "test_generation", "documentation"]
}
```

---

## Integration Notes for DeVonte

### Frontend Data Fetching

**React Query Pattern:**
```typescript
import { useQuery } from '@tanstack/react-query'

function useCostSavingsSummary(period = 'month') {
  return useQuery({
    queryKey: ['cost-savings', period],
    queryFn: () =>
      fetch(`/api/v1/analytics/cost-savings/summary?period=${period}`)
        .then(res => res.json()),
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000 // Consider fresh for 30 seconds
  })
}
```

### Metric Card Component

**Suggested Props:**
```typescript
interface MetricCardProps {
  title: string
  value: number | string
  format: 'currency' | 'percentage' | 'number'
  trend?: {
    direction: 'up' | 'down' | 'neutral'
    value: number
    label: string
  }
  subtitle?: string
  icon?: ReactNode
  loading?: boolean
}
```

### Chart Data Transformation

**For Recharts:**
```typescript
// Transform API response to Recharts format
const chartData = trendsResponse.dataPoints.map(point => ({
  name: point.period.label,
  savings: point.savings.totalSaved,
  cost: point.savings.actualCost,
  baseline: point.savings.baselineCost
}))
```

---

## Demo Script (Friday, Day 5)

**Marcus's Sales Demo Flow:**

1. **Open dashboard → Hero metric appears**
   - "You've saved $47,382 this month - that's 37.4% cost reduction"
   - *Wow factor achieved*

2. **Scroll to provider comparison chart**
   - "GitHub Copilot handles 55% of tasks at $3.59 per task"
   - "OpenAI Codex handles complex work at $11.09 per task"
   - "Our platform automatically routes to the optimal provider"

3. **Show monthly trends chart**
   - "Savings increasing over time as the platform learns"
   - "Started at $28K/month savings, now at $47K"
   - "That's $568K annualized savings"

4. **Real-time activity feed**
   - "Watch tasks completing in real-time"
   - "Each one showing instant cost savings vs. baseline"

5. **Export data button**
   - "Download full reports for your finance team"

**Key Message:** "Stop overpaying for AI. Let our platform optimize your costs automatically."

---

## Next Steps

### Immediate (Day 1 - Today)
- ✅ API spec complete
- ⏳ DeVonte reviews and confirms structure
- ⏳ Gray creates mock data service
- ⏳ Gray implements endpoint stubs

### Day 2 (Tomorrow)
- Implement all GET endpoints with mock data
- Unit tests for response format
- API documentation in Swagger/OpenAPI
- Postman collection for testing

### Day 3-4 (Wed-Thu)
- DeVonte builds dashboard UI
- Integration testing
- Polish UI with real API responses
- Performance optimization

### Day 5 (Friday)
- Demo ready!
- Marcus presents to potential customers
- Gather feedback for next iteration

---

## Open Questions

1. **Should we show real provider names in the demo or anonymize?**
   - Recommendation: Use real names (GitHub Copilot, OpenAI, etc.) - builds credibility

2. **Date range picker - relative ("last 30 days") or absolute dates?**
   - Recommendation: Support both, default to relative

3. **Currency formatting - always USD or support multiple currencies?**
   - Recommendation: USD only for MVP, add i18n later

4. **Export format - CSV only or JSON too?**
   - Recommendation: CSV for finance teams, JSON for developers

5. **Real-time updates - WebSocket or polling?**
   - Recommendation: Polling for MVP (simpler), WebSocket post-launch

---

## Data Quality Principles

As the data engineer, I commit to:

1. **Accuracy First:** Mock data must be realistic and internally consistent
2. **Data Integrity:** All aggregations must sum correctly
3. **Privacy:** No customer PII in analytics responses
4. **Performance:** All queries optimized, cached appropriately
5. **Documentation:** Every field clearly defined

**"Perfect demos are built on imperfect data, but the structure must be production-ready."** - Gray Sutton

---

## Appendix: TypeScript Types

```typescript
// Complete TypeScript interfaces for type safety

export interface CostSavingsSummary {
  period: {
    start: string // ISO 8601
    end: string // ISO 8601
    label: string
  }
  savings: {
    totalSaved: number
    percentageSaved: number
    actualCost: number
    baselineCost: number
    projectedAnnualSavings: number
  }
  metrics: {
    totalTasks: number
    totalApiCalls: number
    avgCostPerTask: number
    optimalRoutingRate: number
  }
  trend: {
    direction: 'improving' | 'declining' | 'stable'
    changeFromPrevious: number
    previousPeriodSavings: number
  }
  meta: {
    currency: string
    lastUpdated: string // ISO 8601
    dataFreshness: 'real-time' | 'cached'
  }
}

export interface ProviderComparison {
  period: {
    start: string
    end: string
  }
  providers: Provider[]
  summary: {
    totalProviders: number
    mostUsedProvider: string
    mostEfficientProvider: string
    highestQualityProvider: string
  }
  meta: {
    lastUpdated: string
  }
}

export interface Provider {
  provider: string
  displayName: string
  usage: {
    taskCount: number
    taskPercentage: number
    apiCalls: number
    tokensInput: number
    tokensOutput: number
  }
  cost: {
    total: number
    costPerTask: number
    costPerToken: number
  }
  performance: {
    avgLatencyMs: number
    successRate: number
    errorRate: number
  }
  savings: {
    vsBaseline: number
    percentSaved: number
  }
  optimalFor: string[]
}

export interface UsageMetrics {
  period: {
    start: string
    end: string
  }
  usage: {
    totalApiCalls: number
    totalTasks: number
    totalTokens: number
    totalDevelopers: number
    activeDevelopers: number
  }
  averages: {
    callsPerDay: number
    tasksPerDay: number
    callsPerTask: number
    tasksPerDeveloper: number
  }
  errors: {
    totalErrors: number
    errorRate: number
    topErrors: ErrorSummary[]
  }
  taskTypes: {
    distribution: TaskTypeDistribution[]
  }
  meta: {
    lastUpdated: string
  }
}

export interface MonthlyTrends {
  granularity: 'day' | 'week' | 'month'
  dataPoints: TrendDataPoint[]
  summary: {
    totalSavings: number
    averageMonthlySavings: number
    savingsTrend: 'increasing' | 'decreasing' | 'stable'
    percentageGrowth: number
  }
  meta: {
    lastUpdated: string
  }
}

export interface TrendDataPoint {
  period: {
    start: string
    end: string
    label: string
  }
  savings: {
    totalSaved: number
    percentageSaved: number
    actualCost: number
    baselineCost: number
  }
  usage: {
    totalTasks: number
    totalApiCalls: number
  }
}
```

---

**Ready to build. Let's crush this demo! 🚀**

**Contact:**
Graham "Gray" Sutton
Data Engineer, Generic Corp
"Data quality over speed. Always."
