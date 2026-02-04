# Analytics Data Model - Cost Savings Dashboard

**Author:** Graham "Gray" Sutton
**Date:** 2026-01-26
**Purpose:** Multi-Provider AI Orchestration Platform Analytics Infrastructure

## Overview

This document defines the database schema for tracking provider usage, costs, and performance metrics to power the cost savings dashboard and ROI calculator.

## Core Principles

1. **Multi-Tenancy First**: Every table includes `tenant_id` for complete data isolation
2. **Privacy by Design**: No code content stored, only metadata and metrics
3. **Performance Optimized**: Time-series partitioning and pre-aggregated views
4. **Data Quality**: Strict validation and integrity constraints

## Schema Design

### 1. Provider Cost Configurations

Stores per-tenant pricing rules for each AI provider.

```sql
CREATE TABLE provider_cost_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL,  -- 'openai', 'anthropic', 'github_copilot', etc.
  model_name VARCHAR(100) NOT NULL,  -- 'gpt-4', 'claude-3-opus', etc.

  -- Pricing (per 1M tokens)
  input_token_cost_usd DECIMAL(10, 6) NOT NULL,
  output_token_cost_usd DECIMAL(10, 6) NOT NULL,

  -- Rate limits
  requests_per_minute INT,
  tokens_per_minute INT,

  -- Metadata
  effective_from TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_provider_model_per_tenant
    UNIQUE (tenant_id, provider, model_name, effective_from)
);

CREATE INDEX idx_cost_configs_tenant ON provider_cost_configs(tenant_id);
CREATE INDEX idx_cost_configs_active ON provider_cost_configs(tenant_id, is_active);
```

### 2. Usage Metrics (Raw Events)

Captures every AI provider request for detailed analytics.

```sql
CREATE TABLE usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,  -- Individual user within tenant
  session_id UUID,  -- Groups related requests

  -- Request details
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  request_type VARCHAR(50) NOT NULL,  -- 'completion', 'embedding', 'edit', etc.

  -- Token usage
  input_tokens INT NOT NULL,
  output_tokens INT NOT NULL,
  total_tokens INT NOT NULL,

  -- Performance metrics
  latency_ms INT NOT NULL,
  succeeded BOOLEAN NOT NULL,
  error_code VARCHAR(50),
  error_message TEXT,

  -- Cost calculation
  estimated_cost_usd DECIMAL(10, 6) NOT NULL,

  -- Routing & optimization
  routing_strategy VARCHAR(50),  -- 'cost_optimized', 'quality_optimized', 'balanced'
  alternative_provider VARCHAR(50),  -- What provider COULD have been used
  cost_savings_usd DECIMAL(10, 6),  -- Savings vs alternative

  -- Timestamps
  request_timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Privacy: NO code content stored
  -- Metadata only for analytics

  CONSTRAINT check_tokens_positive CHECK (
    input_tokens >= 0 AND output_tokens >= 0 AND total_tokens >= 0
  )
) PARTITION BY RANGE (request_timestamp);

-- Partition by month for performance
CREATE TABLE usage_metrics_2026_01 PARTITION OF usage_metrics
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE usage_metrics_2026_02 PARTITION OF usage_metrics
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes for query performance
CREATE INDEX idx_usage_tenant_time ON usage_metrics(tenant_id, request_timestamp DESC);
CREATE INDEX idx_usage_user_time ON usage_metrics(tenant_id, user_id, request_timestamp DESC);
CREATE INDEX idx_usage_provider ON usage_metrics(tenant_id, provider, request_timestamp DESC);
```

### 3. Analytics Aggregations (Daily)

Pre-computed daily rollups for fast dashboard queries.

```sql
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  date DATE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,

  -- Volume metrics
  total_requests INT NOT NULL DEFAULT 0,
  successful_requests INT NOT NULL DEFAULT 0,
  failed_requests INT NOT NULL DEFAULT 0,

  -- Token metrics
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,

  -- Cost metrics
  total_cost_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_savings_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Performance metrics
  avg_latency_ms INT NOT NULL DEFAULT 0,
  p95_latency_ms INT NOT NULL DEFAULT 0,
  p99_latency_ms INT NOT NULL DEFAULT 0,

  -- Success rate
  success_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,  -- Percentage

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_daily_aggregation
    UNIQUE (tenant_id, date, provider, model_name)
);

CREATE INDEX idx_analytics_daily_tenant ON analytics_daily(tenant_id, date DESC);
CREATE INDEX idx_analytics_daily_provider ON analytics_daily(tenant_id, provider, date DESC);
```

### 4. Analytics Aggregations (Weekly)

```sql
CREATE TABLE analytics_weekly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,

  -- Same metrics as daily
  total_requests INT NOT NULL DEFAULT 0,
  successful_requests INT NOT NULL DEFAULT 0,
  failed_requests INT NOT NULL DEFAULT 0,
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_savings_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  avg_latency_ms INT NOT NULL DEFAULT 0,
  p95_latency_ms INT NOT NULL DEFAULT 0,
  p99_latency_ms INT NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_weekly_aggregation
    UNIQUE (tenant_id, week_start_date, provider, model_name)
);

CREATE INDEX idx_analytics_weekly_tenant ON analytics_weekly(tenant_id, week_start_date DESC);
```

### 5. Analytics Aggregations (Monthly)

```sql
CREATE TABLE analytics_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  month_start_date DATE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,

  -- Same metrics as daily/weekly
  total_requests INT NOT NULL DEFAULT 0,
  successful_requests INT NOT NULL DEFAULT 0,
  failed_requests INT NOT NULL DEFAULT 0,
  total_input_tokens BIGINT NOT NULL DEFAULT 0,
  total_output_tokens BIGINT NOT NULL DEFAULT 0,
  total_tokens BIGINT NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_savings_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
  avg_latency_ms INT NOT NULL DEFAULT 0,
  p95_latency_ms INT NOT NULL DEFAULT 0,
  p99_latency_ms INT NOT NULL DEFAULT 0,
  success_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_monthly_aggregation
    UNIQUE (tenant_id, month_start_date, provider, model_name)
);

CREATE INDEX idx_analytics_monthly_tenant ON analytics_monthly(tenant_id, month_start_date DESC);
```

### 6. Usage Alerts

Threshold-based monitoring and notifications.

```sql
CREATE TABLE usage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  alert_name VARCHAR(100) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,  -- 'cost_threshold', 'error_rate', 'latency'

  -- Thresholds
  threshold_value DECIMAL(12, 2) NOT NULL,
  threshold_period VARCHAR(20) NOT NULL,  -- 'hourly', 'daily', 'weekly', 'monthly'

  -- Alert configuration
  is_active BOOLEAN DEFAULT true,
  notification_channels JSON NOT NULL DEFAULT '[]',  -- ['email', 'slack', 'webhook']

  -- Last trigger
  last_triggered_at TIMESTAMP,
  last_triggered_value DECIMAL(12, 2),
  trigger_count INT DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_alert_per_tenant
    UNIQUE (tenant_id, alert_name)
);

CREATE INDEX idx_alerts_tenant ON usage_alerts(tenant_id, is_active);
```

### 7. Provider Performance Tracking

```sql
CREATE TABLE provider_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  hour INT NOT NULL CHECK (hour >= 0 AND hour < 24),

  -- Reliability metrics
  uptime_percentage DECIMAL(5, 2) NOT NULL DEFAULT 100,
  total_requests INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  timeout_count INT NOT NULL DEFAULT 0,

  -- Performance
  avg_latency_ms INT NOT NULL DEFAULT 0,
  p50_latency_ms INT NOT NULL DEFAULT 0,
  p95_latency_ms INT NOT NULL DEFAULT 0,
  p99_latency_ms INT NOT NULL DEFAULT 0,

  -- Quality (optional - could be subjective scores)
  avg_quality_score DECIMAL(3, 2),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_provider_performance
    UNIQUE (tenant_id, provider, model_name, date, hour)
);

CREATE INDEX idx_performance_tenant ON provider_performance(tenant_id, date DESC, hour DESC);
CREATE INDEX idx_performance_provider ON provider_performance(tenant_id, provider, date DESC);
```

## Multi-Tenancy Strategy

### Row-Level Security (RLS)

```sql
-- Enable RLS on all analytics tables
ALTER TABLE provider_cost_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_performance ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
-- (Assumes application sets current_setting('app.current_tenant_id'))

CREATE POLICY tenant_isolation_policy ON provider_cost_configs
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tenant_isolation_policy ON usage_metrics
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Repeat for all tables...
```

## Data Retention Policy

- **Raw usage metrics**: 90 days (then archive to cold storage)
- **Daily aggregations**: 2 years
- **Weekly aggregations**: 3 years
- **Monthly aggregations**: 5 years

## Performance Optimization

### Caching Strategy (Redis)

- **Dashboard queries**: 5-minute TTL
- **Cost calculations**: 15-minute TTL
- **Provider performance**: 1-hour TTL
- **Cache keys**: `analytics:{tenant_id}:{metric_type}:{period}:{params_hash}`

### Query Optimization

1. Always include `tenant_id` in WHERE clauses
2. Use aggregated tables for dashboard queries
3. Partition raw metrics by month
4. Use composite indexes for common query patterns

## Privacy & Compliance

### Data We Collect
- Token counts and types
- Request/response metadata
- Performance metrics
- Cost calculations

### Data We DO NOT Collect
- Code content
- Prompt/completion text
- PII unless explicitly needed
- Any user intellectual property

### GDPR Compliance
- Right to deletion: CASCADE delete by `tenant_id`
- Right to access: Export all tenant data
- Data minimization: Only collect necessary metrics
- Purpose limitation: Analytics only, no secondary use

## Integration Points

### With Yuki's Infrastructure Layer

1. **Usage Tracking Events**: Yuki's system emits events to Kafka/stream
2. **Event Consumer**: Analytics service consumes and writes to `usage_metrics`
3. **Real-time API**: REST endpoint for current usage stats
4. **Shared Schema**: Align on event payload structure

### With DeVonte's Dashboard

1. **REST API**: `/api/v1/analytics/*` endpoints
2. **WebSocket**: Real-time updates for live metrics
3. **GraphQL** (optional): Flexible querying for complex dashboards

## Migration Plan

1. **Phase 1**: Create base tables and indexes
2. **Phase 2**: Seed provider cost configs with current pricing
3. **Phase 3**: Deploy event consumers
4. **Phase 4**: Backfill historical data (if any)
5. **Phase 5**: Enable RLS policies

## Next Steps

- [ ] Review with Sable (architecture validation)
- [ ] Sync with Yuki (event schema alignment)
- [ ] Coordinate with DeVonte (API contract)
- [ ] Create Prisma schema updates
- [ ] Write migration scripts
- [ ] Build aggregation cron jobs
- [ ] Deploy to staging environment
