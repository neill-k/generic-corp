# Analytics Dashboard API Contract
**Date:** January 26, 2026
**Prepared by:** Graham "Gray" Sutton, Data Engineer
**For:** DeVonte Jackson - Dashboard Implementation
**Status:** v1.0 - Ready for Implementation

---

## Executive Summary

This document defines the REST API contract for the Cost Savings Analytics Dashboard. The API will provide JSON responses optimized for real-time dashboard visualization, enabling customers to track ROI, cost savings, and provider performance.

**Timeline:**
- Mock endpoints ready: End of Day 1 (Monday, Jan 27)
- Production-ready data: Day 3-4 (Wed-Thu)
- Demo-ready: Friday, Jan 31

---

## Authentication & Context

All analytics endpoints require authentication and automatically filter data by tenant/organization:

```http
Authorization: Bearer <jwt_token>
OR
X-API-Key: <api_key>
```

**Tenant Isolation:** All queries automatically filtered by authenticated user's organization_id.

---

## Core Endpoints

### 1. Cost Savings Summary
**The "Hero Number" - Primary Dashboard Widget**

#### `GET /api/analytics/cost-savings`

**Purpose:** Show total savings with percentage reduction - the main "wow" metric

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `quarter`, `year`, `custom` (default: `month`)
- `start_date` (optional): ISO 8601 date (required if period=custom)
- `end_date` (optional): ISO 8601 date (required if period=custom)

**Response:**
```json
{
  "summary": {
    "total_savings_usd": 47382.45,
    "total_cost_usd": 28560.22,
    "baseline_cost_usd": 75942.67,
    "savings_percentage": 62.4,
    "period": "month",
    "period_start": "2026-01-01T00:00:00Z",
    "period_end": "2026-01-31T23:59:59Z"
  },
  "comparison": {
    "previous_period_savings_usd": 34120.00,
    "change_percentage": 38.9,
    "trend": "up"
  },
  "projection": {
    "annual_savings_estimate_usd": 568589.40,
    "confidence": "high"
  },
  "metadata": {
    "computed_at": "2026-01-26T10:30:00Z",
    "cached": false,
    "computation_time_ms": 45
  }
}
```

**Mock Data Notes:**
- Use realistic numbers that tell a compelling story
- Show 35-65% savings range (industry competitive)
- Ensure previous_period shows growth trend

---

### 2. Provider Cost Comparison
**Show which providers are being used and their costs**

#### `GET /api/analytics/providers/comparison`

**Purpose:** Break down usage and costs by provider for comparison charts

**Query Parameters:**
- `period` (optional): Same as cost-savings (default: `month`)
- `start_date` (optional): ISO 8601 date
- `end_date` (optional): ISO 8601 date
- `metric` (optional): `cost`, `usage`, `performance` (default: `cost`)

**Response:**
```json
{
  "providers": [
    {
      "provider": "openai",
      "display_name": "OpenAI (GPT-4 & Codex)",
      "total_cost_usd": 12450.30,
      "cost_percentage": 43.6,
      "total_requests": 8542,
      "requests_percentage": 38.2,
      "avg_cost_per_request_usd": 1.46,
      "tasks_handled": 3421,
      "task_types": ["bug_fix", "code_review", "refactoring"],
      "success_rate": 98.4,
      "avg_latency_ms": 1234
    },
    {
      "provider": "anthropic",
      "display_name": "Anthropic (Claude)",
      "total_cost_usd": 9800.50,
      "cost_percentage": 34.3,
      "total_requests": 10234,
      "requests_percentage": 45.7,
      "avg_cost_per_request_usd": 0.96,
      "tasks_handled": 4789,
      "task_types": ["code_completion", "documentation", "test_generation"],
      "success_rate": 99.2,
      "avg_latency_ms": 987
    },
    {
      "provider": "github_copilot",
      "display_name": "GitHub Copilot",
      "total_cost_usd": 6309.42,
      "cost_percentage": 22.1,
      "total_requests": 3600,
      "requests_percentage": 16.1,
      "avg_cost_per_request_usd": 1.75,
      "tasks_handled": 1890,
      "task_types": ["autocomplete", "inline_suggestions"],
      "success_rate": 97.1,
      "avg_latency_ms": 456
    }
  ],
  "totals": {
    "total_cost_usd": 28560.22,
    "total_requests": 22376,
    "total_tasks": 10100,
    "avg_success_rate": 98.2
  },
  "insights": [
    {
      "type": "optimization",
      "message": "Anthropic Claude handles 47% of requests at 34% lower cost. Consider routing more tasks there.",
      "potential_savings_usd": 3420.00
    },
    {
      "type": "performance",
      "message": "GitHub Copilot has 2.7x faster response times for autocomplete tasks.",
      "impact": "high"
    }
  ],
  "metadata": {
    "period": "month",
    "period_start": "2026-01-01T00:00:00Z",
    "period_end": "2026-01-31T23:59:59Z",
    "computed_at": "2026-01-26T10:30:00Z"
  }
}
```

**Chart Recommendations for DeVonte:**
- Pie chart: Cost breakdown by provider
- Bar chart: Request volume by provider
- Stacked bar: Cost per request comparison

---

### 3. Usage Metrics
**Detailed usage statistics for monitoring**

#### `GET /api/analytics/usage-metrics`

**Purpose:** Track API calls, tokens, errors, and success rates

**Query Parameters:**
- `period` (optional): Same as cost-savings (default: `month`)
- `start_date` (optional): ISO 8601 date
- `end_date` (optional): ISO 8601 date
- `granularity` (optional): `hour`, `day`, `week` (default: `day`)
- `provider` (optional): Filter by specific provider

**Response:**
```json
{
  "summary": {
    "total_api_calls": 22376,
    "successful_calls": 21987,
    "failed_calls": 389,
    "success_rate_percentage": 98.3,
    "total_tokens_consumed": 45892340,
    "total_tasks_completed": 10100,
    "avg_task_duration_ms": 2340
  },
  "time_series": [
    {
      "timestamp": "2026-01-25T00:00:00Z",
      "api_calls": 1547,
      "successful_calls": 1521,
      "failed_calls": 26,
      "tokens_consumed": 3124567,
      "tasks_completed": 689,
      "avg_latency_ms": 1234
    },
    {
      "timestamp": "2026-01-26T00:00:00Z",
      "api_calls": 2134,
      "successful_calls": 2098,
      "failed_calls": 36,
      "tokens_consumed": 4231890,
      "tasks_completed": 923,
      "avg_latency_ms": 1189
    }
  ],
  "error_breakdown": [
    {
      "error_type": "rate_limit",
      "count": 234,
      "percentage": 60.2,
      "providers_affected": ["openai"]
    },
    {
      "error_type": "timeout",
      "count": 98,
      "percentage": 25.2,
      "providers_affected": ["github_copilot"]
    },
    {
      "error_type": "auth_failure",
      "count": 57,
      "percentage": 14.6,
      "providers_affected": ["anthropic", "openai"]
    }
  ],
  "metadata": {
    "granularity": "day",
    "data_points": 31,
    "period_start": "2026-01-01T00:00:00Z",
    "period_end": "2026-01-31T23:59:59Z"
  }
}
```

**Chart Recommendations:**
- Line chart: API calls over time
- Line chart: Success rate trend
- Donut chart: Error type breakdown

---

### 4. Cost Trends & Projections
**Historical trends and future projections**

#### `GET /api/analytics/trends`

**Purpose:** Show spending trends over time with future projections

**Query Parameters:**
- `months` (optional): Number of historical months (default: 6, max: 12)
- `include_projection` (optional): boolean (default: true)

**Response:**
```json
{
  "historical": [
    {
      "month": "2025-08",
      "actual_cost_usd": 32450.00,
      "baseline_cost_usd": 58900.00,
      "savings_usd": 26450.00,
      "savings_percentage": 44.9,
      "tasks_completed": 8932
    },
    {
      "month": "2025-09",
      "actual_cost_usd": 29800.00,
      "baseline_cost_usd": 61200.00,
      "savings_usd": 31400.00,
      "savings_percentage": 51.3,
      "tasks_completed": 9345
    },
    {
      "month": "2026-01",
      "actual_cost_usd": 28560.22,
      "baseline_cost_usd": 75942.67,
      "savings_usd": 47382.45,
      "savings_percentage": 62.4,
      "tasks_completed": 10100
    }
  ],
  "projection": {
    "next_month": {
      "month": "2026-02",
      "estimated_cost_usd": 27800.00,
      "estimated_savings_usd": 51200.00,
      "confidence_interval": {
        "low": 25000.00,
        "high": 30000.00
      }
    },
    "annual": {
      "estimated_cost_usd": 342000.00,
      "estimated_savings_usd": 568590.00,
      "estimated_baseline_usd": 910590.00
    }
  },
  "insights": [
    {
      "type": "trend",
      "message": "Savings percentage improved 17.5 points over 6 months",
      "impact": "positive"
    },
    {
      "type": "efficiency",
      "message": "Cost per task decreased by 23% while handling 13% more tasks",
      "impact": "positive"
    }
  ],
  "metadata": {
    "months_included": 6,
    "projection_model": "linear_regression",
    "computed_at": "2026-01-26T10:30:00Z"
  }
}
```

**Chart Recommendations:**
- Line chart: Monthly spending (actual vs baseline)
- Area chart: Cumulative savings over time
- Line chart: Savings percentage trend

---

### 5. Task Type Analysis
**Break down costs and performance by task type**

#### `GET /api/analytics/task-types`

**Purpose:** Show which types of coding tasks are most common and cost-effective

**Query Parameters:**
- `period` (optional): Same as cost-savings (default: `month`)
- `start_date` (optional): ISO 8601 date
- `end_date` (optional): ISO 8601 date
- `sort_by` (optional): `volume`, `cost`, `savings` (default: `volume`)

**Response:**
```json
{
  "task_types": [
    {
      "task_type": "code_completion",
      "display_name": "Code Completion",
      "count": 4234,
      "percentage_of_total": 41.9,
      "total_cost_usd": 8940.50,
      "avg_cost_usd": 2.11,
      "total_savings_usd": 19234.00,
      "optimal_provider": "anthropic",
      "avg_duration_ms": 456,
      "success_rate": 99.4
    },
    {
      "task_type": "bug_fix",
      "display_name": "Bug Fixing",
      "count": 2145,
      "percentage_of_total": 21.2,
      "total_cost_usd": 7890.30,
      "avg_cost_usd": 3.68,
      "total_savings_usd": 8234.00,
      "optimal_provider": "openai",
      "avg_duration_ms": 3456,
      "success_rate": 97.8
    },
    {
      "task_type": "refactoring",
      "display_name": "Code Refactoring",
      "count": 1567,
      "percentage_of_total": 15.5,
      "total_cost_usd": 5678.40,
      "avg_cost_usd": 3.62,
      "total_savings_usd": 7123.00,
      "optimal_provider": "openai",
      "avg_duration_ms": 4567,
      "success_rate": 98.2
    },
    {
      "task_type": "test_generation",
      "display_name": "Test Generation",
      "count": 1234,
      "percentage_of_total": 12.2,
      "total_cost_usd": 3456.20,
      "avg_cost_usd": 2.80,
      "total_savings_usd": 6234.00,
      "optimal_provider": "anthropic",
      "avg_duration_ms": 2345,
      "success_rate": 99.1
    },
    {
      "task_type": "documentation",
      "display_name": "Documentation",
      "count": 920,
      "percentage_of_total": 9.1,
      "total_cost_usd": 2594.82,
      "avg_cost_usd": 2.82,
      "total_savings_usd": 6557.45,
      "optimal_provider": "anthropic",
      "avg_duration_ms": 1890,
      "success_rate": 99.6
    }
  ],
  "totals": {
    "total_tasks": 10100,
    "total_cost_usd": 28560.22,
    "total_savings_usd": 47382.45
  },
  "metadata": {
    "period": "month",
    "period_start": "2026-01-01T00:00:00Z",
    "period_end": "2026-01-31T23:59:59Z"
  }
}
```

**Chart Recommendations:**
- Horizontal bar: Tasks by type (volume)
- Bar chart: Savings by task type
- Table: Optimal provider per task type

---

### 6. Real-Time Dashboard Widget
**Live metrics for today's activity**

#### `GET /api/analytics/realtime`

**Purpose:** Show current day metrics that update frequently

**Query Parameters:**
None (always returns today's data)

**Response:**
```json
{
  "today": {
    "date": "2026-01-26",
    "current_savings_usd": 2134.56,
    "current_cost_usd": 1245.80,
    "baseline_cost_usd": 3380.36,
    "api_calls": 456,
    "tasks_completed": 189,
    "active_sessions": 12,
    "avg_latency_ms": 1123
  },
  "live_stats": {
    "last_5_minutes": {
      "api_calls": 23,
      "avg_latency_ms": 987,
      "errors": 0
    },
    "last_hour": {
      "api_calls": 234,
      "tasks_completed": 87,
      "cost_usd": 123.45,
      "savings_usd": 189.23
    }
  },
  "recent_tasks": [
    {
      "task_id": "task_abc123",
      "task_type": "bug_fix",
      "provider": "openai",
      "status": "completed",
      "duration_ms": 3456,
      "cost_usd": 4.23,
      "savings_usd": 2.34,
      "completed_at": "2026-01-26T10:28:34Z"
    },
    {
      "task_id": "task_def456",
      "task_type": "code_completion",
      "provider": "anthropic",
      "status": "in_progress",
      "started_at": "2026-01-26T10:29:12Z"
    }
  ],
  "metadata": {
    "computed_at": "2026-01-26T10:30:00Z",
    "auto_refresh_seconds": 30
  }
}
```

**UI Notes:**
- This endpoint should be polled every 30 seconds
- Show "live" indicator when data is < 60 seconds old
- Animate number changes for visual appeal

---

## Data Format Standards

### Currency
- All monetary values in USD
- Decimal precision: 2 places for display, 6 places for calculations
- Format example: `1234.56` (no commas in JSON)

### Dates & Times
- ISO 8601 format: `2026-01-26T10:30:00Z`
- Always UTC timezone
- Date-only format: `2026-01-26`

### Percentages
- Decimal format: `62.4` (not `0.624`)
- Precision: 1 decimal place for display

### Response Times
- Always in milliseconds (integer)
- Examples: `1234` = 1.234 seconds

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "Invalid period parameter. Must be one of: today, week, month, quarter, year, custom",
  "field": "period",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Invalid or missing authentication token",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions to access analytics",
  "required_permission": "analytics:read",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

### 429 Rate Limited
```json
{
  "error": "rate_limit_exceeded",
  "message": "Analytics API rate limit exceeded",
  "retry_after_seconds": 60,
  "limit": 100,
  "timestamp": "2026-01-26T10:30:00Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "Failed to compute analytics. Please try again.",
  "request_id": "req_abc123",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

---

## Performance Requirements

### Response Times
- Real-time endpoint: < 100ms (p95)
- Summary endpoints: < 200ms (p95)
- Trend analysis: < 500ms (p95)

### Caching Strategy
- Real-time: No cache (always fresh)
- Today's summary: 30 second cache
- Historical data: 5 minute cache
- Monthly aggregates: 1 hour cache

### Rate Limiting
- Free tier: 60 requests/minute
- Pro tier: 600 requests/minute
- Enterprise: 6000 requests/minute

---

## Implementation Phases

### Phase 1: Mock Data (Day 1 - Monday)
**Goal:** DeVonte can start building UI immediately

- [ ] All endpoints return realistic mock data
- [ ] Consistent data relationships (totals add up correctly)
- [ ] Compelling demo story (clear savings, upward trends)
- [ ] All response schemas finalized

**Mock Data Strategy:**
- Use hardcoded JSON responses in route handlers
- Ensure numbers tell a coherent story across endpoints
- Make it look "real" with slight variations, not perfect round numbers

### Phase 2: Database Integration (Day 2-3 - Tue-Wed)
**Goal:** Connect to real data sources

- [ ] Query actual task executions from database
- [ ] Calculate real costs using provider pricing
- [ ] Compute baseline costs for savings calculation
- [ ] Implement caching layer (Redis)

### Phase 3: Production Ready (Day 4-5 - Thu-Fri)
**Goal:** Demo-ready with polish

- [ ] Optimize query performance
- [ ] Add error handling and logging
- [ ] Implement rate limiting
- [ ] Add monitoring and alerts
- [ ] Load testing

---

## Mock Data Generation Script

I'll create a separate utility file for generating consistent mock data that you can import:

**Location:** `src/services/analytics/mockData.ts`

**Usage:**
```typescript
import { getMockCostSavings, getMockProviderComparison } from './services/analytics/mockData.js';

app.get('/api/analytics/cost-savings', (req, res) => {
  res.json(getMockCostSavings(req.query));
});
```

---

## Testing Checklist

### Unit Tests
- [ ] Mock data generation produces valid schemas
- [ ] Date range parsing and validation
- [ ] Cost calculation accuracy
- [ ] Percentage calculations
- [ ] Error handling

### Integration Tests
- [ ] All endpoints return expected schema
- [ ] Authentication and authorization
- [ ] Rate limiting enforcement
- [ ] Caching behavior
- [ ] Cross-origin requests (CORS)

### Load Tests
- [ ] 100 concurrent users
- [ ] 1000 requests/minute sustained
- [ ] Response time under load
- [ ] Cache hit rates

---

## Questions for DeVonte

1. **Date Range Picker:** Do you want a pre-built date range component or custom start/end dates?
   - Suggest: Pre-built options (Today, Week, Month, Quarter, Year) + Custom

2. **Real-time Updates:** Should the dashboard auto-refresh or manual refresh?
   - Suggest: 30-second auto-refresh for real-time widget, manual for others

3. **Export Functionality:** Do you need CSV/PDF export in v1?
   - Suggest: Add in v2 after demo

4. **Mobile Responsive:** Is mobile view in scope for Friday demo?
   - Suggest: Desktop-first for demo, mobile in v2

5. **Color Scheme:** Do you have brand colors picked out for charts?
   - Suggest: Professional blue/green palette (savings = green, costs = blue, baseline = gray)

---

## Next Steps

### Immediate Actions:
1. **DeVonte:** Review this spec and confirm endpoint structure works for your UI
2. **Gray:** Create mock data service (Monday EOD)
3. **Gray:** Implement mock endpoint routes (Monday EOD)
4. **DeVonte:** Build dashboard components consuming mock API (Tue-Wed)
5. **Gray:** Connect real data (Wed-Thu)
6. **Both:** Integration testing and polish (Thu-Fri)

### Sync Points:
- **Monday EOD:** Quick sync to confirm mock endpoints are working
- **Tuesday Midday:** Review initial dashboard UI
- **Thursday Morning:** Test real data integration
- **Friday Morning:** Final demo rehearsal

---

## Demo Script Outline

When we show this to customers:

1. **Open with Hero Number** - "You saved $47,382 this month - that's 62% off direct provider costs"
2. **Show Provider Comparison** - "Here's how our intelligent routing optimized your costs"
3. **Highlight Trends** - "Your savings are improving month over month"
4. **Real-time Widget** - "Watch your savings grow in real-time"
5. **Task Type Analysis** - "See which coding tasks benefit most from optimization"

**Key talking point:** "Our platform saved you enough money this month to pay for 8 additional developer salaries."

---

## Contact

**Questions or feedback?**
- Graham "Gray" Sutton - Data Engineer
- Available via team messaging or sync call

**Status updates:**
- I'll report progress daily via team channel
- Flag any blockers immediately

---

**Let's ship this thing! 🚀**

*"Perfect data pipelines power perfect demos."* - Gray
