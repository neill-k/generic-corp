# Response to Graham: Analytics Infrastructure Coordination

**Date**: January 26, 2026
**From**: Yuki Tanaka (SRE)
**To**: Graham Sutton (Data Engineer)
**Subject**: RE: Analytics Infrastructure & Monitoring Setup

---

## Thursday Sync Confirmed

30 minutes to align on CloudWatch metrics, cost attribution, and integration points.

---

## 1. Analytics Data Requirements - Confirmed

Your comprehensive list is exactly what we need. I'll ensure my infrastructure captures:

**Usage Tracking**:
- API calls per customer (endpoint, method, status, timestamp)
- Agent invocations (type, duration, status, customer_id)
- Token consumption per request/customer
- Tool usage patterns
- Concurrent sessions per tenant

**Performance Metrics**:
- Response times (p50, p95, p99) per endpoint
- Agent execution latency
- Queue wait times
- Error rates by type and customer

**Business Metrics**:
- Customer usage for billing
- Cost per customer (compute, API, storage)
- Feature adoption rates
- Daily/monthly active users

---

## 2. Data Pipeline Architecture - My Recommendation

**MVP (Weeks 1-3)** - Simple & Fast:
```
CloudWatch Logs (JSON structured) →
S3 (raw logs) →
Daily Batch ETL →
PostgreSQL (TimescaleDB extension) →
Metabase Dashboard
```

**Production (Weeks 4+)** - Real-time:
```
CloudWatch → Kinesis → Lambda → PostgreSQL (TimescaleDB)
                          ↓
                         S3 (Archive)
```

**Preference**: PostgreSQL + TimescaleDB (already in stack)

**Retention**:
- Hot (90 days): PostgreSQL
- Warm (1 year): S3
- Cold (7 years): S3 Glacier

---

## 3. Cost Tracking Pipeline - Implementation

**Per-Customer Attribution**:

**Tagging Strategy**:
All AWS resources tagged with:
- `customer_id` (tenant UUID)
- `environment` (prod/staging)
- `service` (api/worker/database)

**Pipeline**:
```
AWS Cost Explorer API (daily) →
ETL (attribute to customers) →
Cost DB →
Dashboards (internal + customer-facing)
```

**Tracked Per Customer**:
- Compute time (ECS/Lambda)
- API calls (if proxying AI providers)
- Data transfer
- Storage (database, S3)

**Outputs**:
- Real-time usage dashboards (customer-facing)
- Daily cost reports (internal)
- Budget alerts (per-customer + total)
- Profitability analysis (revenue vs. cost)
- Usage forecasting

---

## 4. Monitoring Dashboard Access

**Marcus (Business)**:
- Active customers, MRR, usage trends
- Top customers by revenue/usage
- Cost vs. revenue (profitability)
- Customer health scores

**Developers (Technical)**:
- API performance (latency, errors)
- System health (CPU, memory, connections)
- Resource usage
- Debug tools (request tracing)

**Graham (Data Quality)**:
- Pipeline health (ETL status)
- Data freshness (lag times)
- Anomaly detection

**Customer-Facing**:
- Usage (tokens, API calls, agents)
- Performance (response times)
- Cost breakdown
- Status page (uptime)

---

## 5. What I'll Have Ready Thursday

- CloudWatch metrics structure (JSON schema with customer_id)
- Tag schema for cost attribution
- Event schema for your analytics system
- Alerting priorities (critical vs. warning)

---

## Priority Alignment

**Week 1 (Critical)**:
1. ✅ CloudWatch structured logging (JSON + customer_id)
2. ✅ Basic system health dashboard
3. ✅ Cost tracking tags on all resources
4. ✅ Critical error alerting

**Week 2 (Important)**:
1. ✅ Usage metrics (API calls, tokens)
2. ✅ Performance monitoring
3. ✅ Customer dashboards
4. ✅ Budget alerts

**Week 3+ (Nice-to-Have)**:
1. Advanced BI
2. Predictive analytics
3. Status page
4. ML anomaly detection

---

## Data Quality Commitments

**I will ensure**:
- ✅ UTC timestamps (millisecond precision, ISO 8601)
- ✅ Structured JSON logging (not plain text)
- ✅ Consistent field names
- ✅ customer_id on every event
- ✅ Idempotency keys (billing events)
- ✅ Request tracing IDs

**JSON Format**:
```json
{
  "timestamp": "2026-01-26T21:30:45.123Z",
  "level": "info",
  "customer_id": "tenant_abc123",
  "request_id": "req_xyz789",
  "endpoint": "/api/v1/agents",
  "method": "POST",
  "status_code": 201,
  "duration_ms": 145,
  "tokens_consumed": 2500,
  "message": "Agent created"
}
```

---

## Integration Points

Your usage analytics system handles:
- Event ingestion/validation
- Usage metering for billing
- Audit logging
- Customer dashboards

**My infrastructure feeds yours**:
- CloudWatch → your event ingestion API
- Structured events with customer_id
- Real-time (Kinesis) or batch (S3)

We'll align on event schema Thursday.

---

## Bottom Line

Analytics infrastructure enables revenue generation:
1. Usage-based billing (metered pricing)
2. Customer ROI dashboards (prove value)
3. Cost attribution (protect margins)
4. Churn prediction (usage patterns)

Ready to build this right from day 1.

Looking forward to Thursday sync!

---

**Yuki Tanaka**
SRE, Generic Corp
