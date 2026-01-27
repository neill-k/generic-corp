# Event Ingestion API Specification

**Author:** DeVonte Jackson, Full-Stack Developer
**Date:** 2026-01-26
**Status:** Draft v1
**Project:** Multi-Tenant Analytics SaaS Platform

## Overview

This document specifies the RESTful API for event ingestion in our multi-tenant analytics platform. The API enables customers to send real-time events from their applications for tracking, analytics, and visualization.

## Authentication

All endpoints require authentication via one of two methods:

### 1. JWT Bearer Token (User Sessions)
```http
Authorization: Bearer <jwt_token>
```

### 2. API Key (Server-to-Server)
```http
X-API-Key: <api_key>
```

**Security Requirements:**
- All requests must use HTTPS in production
- API keys must be rotatable
- JWT tokens expire after 24 hours
- Refresh tokens supported for JWT flow

## Rate Limiting

Rate limits enforced per tenant based on subscription tier:

| Tier | Requests/Minute | Events/Day | Burst Limit |
|------|----------------|------------|-------------|
| Free | 60 | 10,000 | 100 |
| Pro ($299/mo) | 600 | 1,000,000 | 1,000 |
| Enterprise ($999/mo) | 6,000 | Unlimited | 10,000 |

**Headers Returned:**
```http
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 543
X-RateLimit-Reset: 1706284800
```

**Exceeded Response:**
```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Upgrade to Pro for higher limits.",
  "upgrade_url": "/pricing",
  "retry_after": 45
}
```

## Core Endpoints

### 1. Single Event Ingestion

**Endpoint:** `POST /api/v1/events`

**Description:** Ingest a single analytics event

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <token> OR X-API-Key: <key>
```

**Request Body:**
```json
{
  "event_type": "page_view",
  "timestamp": "2026-01-26T10:30:00Z",
  "user_id": "user_12345",
  "session_id": "session_abc123",
  "properties": {
    "page_url": "/dashboard",
    "referrer": "/login",
    "device_type": "desktop",
    "browser": "Chrome",
    "custom_field_1": "value1"
  },
  "metadata": {
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  }
}
```

**Field Validation:**
- `event_type` (required): string, max 64 chars, alphanumeric + underscore
- `timestamp` (optional): ISO 8601, defaults to server time if not provided
- `user_id` (optional): string, max 128 chars
- `session_id` (optional): string, max 128 chars
- `properties` (optional): object, max 50 fields, max 10KB total
- `metadata` (optional): object, max 5KB

**Success Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "event_id": "evt_1a2b3c4d",
  "status": "accepted",
  "timestamp": "2026-01-26T10:30:00Z",
  "processing_time_ms": 12
}
```

**Error Responses:**

```http
HTTP/1.1 400 Bad Request
{
  "error": "validation_error",
  "message": "Invalid event_type format",
  "field": "event_type"
}
```

```http
HTTP/1.1 401 Unauthorized
{
  "error": "unauthorized",
  "message": "Invalid or missing API key"
}
```

```http
HTTP/1.1 403 Forbidden
{
  "error": "quota_exceeded",
  "message": "Daily event quota exceeded. Upgrade to Pro tier.",
  "current_usage": 10000,
  "limit": 10000
}
```

### 2. Batch Event Ingestion

**Endpoint:** `POST /api/v1/events/batch`

**Description:** Ingest multiple events in a single request (more efficient)

**Request Body:**
```json
{
  "events": [
    {
      "event_type": "page_view",
      "timestamp": "2026-01-26T10:30:00Z",
      "properties": { ... }
    },
    {
      "event_type": "button_click",
      "timestamp": "2026-01-26T10:30:05Z",
      "properties": { ... }
    }
  ]
}
```

**Constraints:**
- Max 1000 events per batch (Free tier)
- Max 10,000 events per batch (Pro/Enterprise)
- Total payload max 5MB
- All events validated individually

**Success Response:**
```http
HTTP/1.1 207 Multi-Status
Content-Type: application/json

{
  "total": 2,
  "accepted": 2,
  "rejected": 0,
  "results": [
    {
      "index": 0,
      "event_id": "evt_1a2b3c4d",
      "status": "accepted"
    },
    {
      "index": 1,
      "event_id": "evt_2b3c4d5e",
      "status": "accepted"
    }
  ],
  "processing_time_ms": 45
}
```

**Partial Success Response:**
```http
HTTP/1.1 207 Multi-Status

{
  "total": 3,
  "accepted": 2,
  "rejected": 1,
  "results": [
    {
      "index": 0,
      "event_id": "evt_1a2b3c4d",
      "status": "accepted"
    },
    {
      "index": 1,
      "error": "validation_error",
      "message": "event_type exceeds max length",
      "status": "rejected"
    },
    {
      "index": 2,
      "event_id": "evt_3c4d5e6f",
      "status": "accepted"
    }
  ]
}
```

### 3. Event Query API

**Endpoint:** `GET /api/v1/events`

**Description:** Query historical events for analysis

**Query Parameters:**
- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date
- `event_type` (optional): filter by event type
- `user_id` (optional): filter by user
- `limit` (optional): max results (default 100, max 1000)
- `offset` (optional): pagination offset

**Success Response:**
```http
HTTP/1.1 200 OK

{
  "events": [
    {
      "event_id": "evt_1a2b3c4d",
      "event_type": "page_view",
      "timestamp": "2026-01-26T10:30:00Z",
      "user_id": "user_12345",
      "properties": { ... }
    }
  ],
  "total": 1547,
  "limit": 100,
  "offset": 0,
  "has_more": true
}
```

### 4. Aggregated Metrics API

**Endpoint:** `GET /api/v1/metrics`

**Description:** Get pre-aggregated metrics for dashboard display

**Query Parameters:**
- `metric` (required): metric name (e.g., "page_views", "unique_users")
- `start_date` (required): ISO 8601 date
- `end_date` (required): ISO 8601 date
- `granularity` (optional): "hour", "day", "week", "month" (default: "day")
- `filters` (optional): JSON object of property filters

**Success Response:**
```http
HTTP/1.1 200 OK

{
  "metric": "page_views",
  "granularity": "day",
  "data_points": [
    {
      "timestamp": "2026-01-25T00:00:00Z",
      "value": 1547
    },
    {
      "timestamp": "2026-01-26T00:00:00Z",
      "value": 2134
    }
  ],
  "total": 3681,
  "metadata": {
    "computation_time_ms": 234,
    "cached": false
  }
}
```

### 5. Export API

**Endpoint:** `POST /api/v1/export`

**Description:** Export events to CSV/JSON for customer download

**Request Body:**
```json
{
  "format": "csv",
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-01-31T23:59:59Z",
  "event_types": ["page_view", "button_click"],
  "filters": {
    "user_id": "user_12345"
  }
}
```

**Success Response:**
```http
HTTP/1.1 202 Accepted

{
  "export_id": "exp_abc123",
  "status": "processing",
  "estimated_completion_seconds": 120,
  "status_url": "/api/v1/export/exp_abc123/status"
}
```

**Status Check:**
```http
GET /api/v1/export/exp_abc123/status

200 OK
{
  "export_id": "exp_abc123",
  "status": "completed",
  "download_url": "/api/v1/export/exp_abc123/download",
  "expires_at": "2026-01-27T10:30:00Z",
  "file_size_bytes": 1048576,
  "record_count": 15000
}
```

## Multi-Tenant Isolation

**Critical Security Requirements:**

1. **Tenant Context Injection:**
   - Extract tenant_id from JWT token or API key
   - Inject tenant_id into all database queries automatically
   - Never trust client-provided tenant_id

2. **Row-Level Security:**
   - All queries filtered by tenant_id at database level
   - Use Prisma middleware for automatic filtering
   - Unit tests verify isolation

3. **API Key Scoping:**
   - Each API key tied to single tenant
   - Stored with tenant_id in database
   - Revocable individually

## Error Handling

**Standard Error Format:**
```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "field": "problematic_field",
  "request_id": "req_12345",
  "timestamp": "2026-01-26T10:30:00Z"
}
```

**Common Error Codes:**
- `validation_error`: Invalid input data
- `unauthorized`: Missing or invalid auth
- `forbidden`: Valid auth but insufficient permissions
- `rate_limit_exceeded`: Too many requests
- `quota_exceeded`: Daily/monthly quota exceeded
- `server_error`: Internal server error (5xx)

## Performance Requirements

- **Latency:** p95 < 100ms for single event ingestion
- **Throughput:** Support 10,000 events/second aggregate
- **Availability:** 99.9% uptime SLA
- **Data Freshness:** Events appear in dashboards within 5 seconds

## Monitoring & Observability

**Instrumentation Points:**
- Request latency (p50, p95, p99)
- Error rates by endpoint
- Events ingested per tenant per hour
- Queue depth for async processing
- Database connection pool utilization

**Alerts:**
- Error rate > 1% for 5 minutes
- p95 latency > 500ms for 5 minutes
- Queue depth > 10,000 events
- Rate limit violations spike

## Implementation Notes

**Week 1 Priorities:**
1. Single event ingestion endpoint
2. JWT + API key authentication
3. Basic rate limiting (in-memory, upgrade to Redis later)
4. Tenant isolation middleware
5. Input validation

**Week 2 Enhancements:**
1. Batch ingestion endpoint
2. Redis-backed rate limiting
3. Query API for dashboard
4. Aggregated metrics API
5. Export functionality (async job queue)

**Tech Stack:**
- Express.js middleware for auth/rate limiting
- Prisma for database access with tenant filtering
- Redis for rate limit tracking and caching
- BullMQ for async export jobs
- Zod for request validation

## Client SDKs (Post-MVP)

Provide client libraries for easy integration:
- JavaScript/TypeScript
- Python
- Ruby
- Go

## Testing Strategy

1. **Unit Tests:**
   - Validation logic
   - Tenant isolation
   - Rate limiting

2. **Integration Tests:**
   - End-to-end event flow
   - Multi-tenant isolation verification
   - Auth flows

3. **Load Tests:**
   - 50+ concurrent users
   - Burst traffic scenarios
   - Rate limit enforcement

## Open Questions for Graham

1. **Data Retention:** How long do we keep raw events? Archive policy?
2. **Schema Evolution:** How do we handle property schema changes over time?
3. **Real-time Processing:** Stream processing architecture (Kafka? Direct DB writes?)
4. **Aggregation Jobs:** Cron-based? Event-driven? Materialized views?
5. **Analytics Database:** Separate OLAP database or same Postgres?

## Next Steps

1. Review with Graham (Tuesday sync)
2. Validate with Yuki for auth integration
3. Security review with Sable
4. Begin implementation Wed/Thu

---

**Contact:** DeVonte Jackson - Full-Stack Developer
