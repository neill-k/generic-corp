# WebSocket Monitoring & Metrics

## Overview

The Generic Corp server exposes Prometheus metrics for monitoring WebSocket infrastructure health and performance. Metrics are collected using `prom-client` and exposed at `/metrics`.

## Metrics Endpoint

```
GET http://localhost:3000/metrics
```

Returns metrics in Prometheus text format.

## Available Metrics

### Connection Metrics

#### `websocket_active_connections` (Gauge)
Current number of active WebSocket connections.

**Use case:** Monitor real-time connection count, alert on unexpected drops.

#### `websocket_connections_total` (Counter)
Total number of WebSocket connections established since server start.

**Use case:** Track connection rate over time.

#### `websocket_disconnections_total` (Counter)
Total number of WebSocket disconnections since server start.

**Use case:** Track disconnection rate, identify stability issues.

#### `websocket_connection_duration_seconds` (Histogram)
Distribution of WebSocket connection durations in seconds.

**Buckets:** 1s, 5s, 15s, 30s, 1m, 5m, 10m, 30m, 1h

**Use case:** Understand typical session lengths, identify abnormally short sessions.

### Event Metrics

#### `websocket_events_emitted_total` (Counter)
Total number of server→client events emitted, labeled by `event_type`.

**Labels:**
- `event_type`: agent:status, task:progress, task:completed, task:failed, message:new, draft:pending, activity:log

**Use case:** Track event throughput by type, identify high-volume events.

#### `websocket_events_received_total` (Counter)
Total number of client→server events received, labeled by `event_type`.

**Labels:**
- `event_type`: task_assign, draft_approve, draft_reject, message_send, state_sync

**Use case:** Monitor client interaction patterns.

#### `websocket_event_errors_total` (Counter)
Total number of WebSocket event handler errors, labeled by `event_type`.

**Labels:**
- `event_type`: task_assign, draft_approve, draft_reject, message_send

**Use case:** Alert on event processing failures.

### Latency Metrics

#### `websocket_event_latency_milliseconds` (Histogram)
End-to-end latency from EventBus emission to WebSocket client delivery, labeled by `event_type`.

**Buckets:** 1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s

**Use case:** Track event delivery performance, alert on degraded latency (>500ms).

#### `websocket_heartbeat_rtt_milliseconds` (Histogram)
Round-trip time for WebSocket heartbeat pings.

**Buckets:** 1ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s

**Use case:** Monitor network latency to clients.

**Note:** Not yet implemented - heartbeat currently one-way.

#### `websocket_initial_state_latency_milliseconds` (Histogram)
Time taken to fetch and send initial state to connecting clients.

**Buckets:** 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s

**Use case:** Track connection startup performance, alert on slow queries.

## Grafana Dashboard Configuration

### Example Dashboard Panels

#### Active Connections
```promql
websocket_active_connections
```

#### Connection Rate (per minute)
```promql
rate(websocket_connections_total[1m]) * 60
```

#### Event Throughput (per second)
```promql
sum(rate(websocket_events_emitted_total[1m])) by (event_type)
```

#### P95 Event Latency
```promql
histogram_quantile(0.95, sum(rate(websocket_event_latency_milliseconds_bucket[5m])) by (le, event_type))
```

#### Error Rate
```promql
sum(rate(websocket_event_errors_total[5m])) by (event_type)
```

#### Average Connection Duration
```promql
rate(websocket_connection_duration_seconds_sum[5m]) / rate(websocket_connection_duration_seconds_count[5m])
```

## Alert Rules

### High Error Rate
```yaml
- alert: WebSocketHighErrorRate
  expr: sum(rate(websocket_event_errors_total[5m])) > 0.1
  for: 2m
  labels:
    severity: warning
  annotations:
    summary: "High WebSocket error rate detected"
    description: "WebSocket events are failing at {{ $value }} errors/sec"
```

### Degraded Event Latency
```yaml
- alert: WebSocketHighLatency
  expr: histogram_quantile(0.95, sum(rate(websocket_event_latency_milliseconds_bucket[5m])) by (le)) > 500
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "WebSocket event latency degraded"
    description: "P95 event latency is {{ $value }}ms (threshold: 500ms)"
```

### Connection Drop
```yaml
- alert: WebSocketConnectionDrop
  expr: rate(websocket_disconnections_total[1m]) > rate(websocket_connections_total[1m]) * 1.5
  for: 3m
  labels:
    severity: critical
  annotations:
    summary: "WebSocket connections dropping rapidly"
    description: "Disconnection rate exceeds connection rate by 50%"
```

### Slow Initial State
```yaml
- alert: WebSocketSlowInitialState
  expr: histogram_quantile(0.90, sum(rate(websocket_initial_state_latency_milliseconds_bucket[5m])) by (le)) > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "WebSocket initial state send is slow"
    description: "P90 initial state latency is {{ $value }}ms (threshold: 1000ms)"
```

## Implementation Details

### Instrumentation Points

**EventBus (`src/services/event-bus.ts`):**
- Attaches `_emitTimestamp` to all emitted events for latency tracking
- Increments `websocket_events_emitted_total` on emit

**WebSocket Handlers (`src/websocket/index.ts`):**
- `ConnectionTracker` class manages connection lifecycle metrics
- All server→client event listeners record delivery latency
- All client→server event handlers increment received counters
- Error handlers increment error counters
- Initial state function tracks query + send time

### Metric Collection

Metrics are collected in-process using `prom-client`. For multi-instance deployments with horizontal scaling:

1. Each server instance exposes its own `/metrics` endpoint
2. Prometheus scrapes all instances separately
3. Use `sum()` aggregation in queries for cluster-wide metrics

### Connection Type Tracking

**Future Enhancement:** Track connection transport type (websocket vs polling).

Add label to connection metrics:
```typescript
wsActiveConnections.inc({ transport: socket.conn.transport.name });
```

## Troubleshooting

### Metrics Not Updating
- Check that events are flowing through EventBus
- Verify WebSocket connections are established
- Check server logs for instrumentation errors

### High Latency
- Check database query performance (initial state includes multiple queries)
- Monitor Redis performance (used for Socket.io adapter)
- Check network latency between server and clients

### Memory Issues
- Default metrics collection includes Node.js memory metrics
- High connection count will increase memory usage
- Consider implementing connection limits or rate limiting

## Next Steps

1. **Grafana Dashboard:** Import pre-configured dashboard JSON
2. **Alertmanager:** Configure alert routing and notifications
3. **Horizontal Scaling:** Add Redis adapter metrics for multi-instance deployments
4. **Custom Metrics:** Add business-specific metrics (e.g., active tasks per agent)
