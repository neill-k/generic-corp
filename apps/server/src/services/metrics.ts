import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from "prom-client";

// Create a Registry to hold all metrics
export const register = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// ==================== WebSocket Metrics ====================

// Active WebSocket connections
export const wsActiveConnections = new Gauge({
  name: "websocket_active_connections",
  help: "Number of currently active WebSocket connections",
  registers: [register],
});

// Total connection events
export const wsConnectionsTotal = new Counter({
  name: "websocket_connections_total",
  help: "Total number of WebSocket connections established",
  registers: [register],
});

// Total disconnection events
export const wsDisconnectionsTotal = new Counter({
  name: "websocket_disconnections_total",
  help: "Total number of WebSocket disconnections",
  registers: [register],
});

// Connection duration histogram
export const wsConnectionDuration = new Histogram({
  name: "websocket_connection_duration_seconds",
  help: "Duration of WebSocket connections in seconds",
  buckets: [1, 5, 15, 30, 60, 300, 600, 1800, 3600], // 1s to 1hr
  registers: [register],
});

// ==================== Event Metrics ====================

// Events emitted by type
export const wsEventsEmitted = new Counter({
  name: "websocket_events_emitted_total",
  help: "Total number of WebSocket events emitted by event type",
  labelNames: ["event_type"],
  registers: [register],
});

// Events received by type
export const wsEventsReceived = new Counter({
  name: "websocket_events_received_total",
  help: "Total number of WebSocket events received by event type",
  labelNames: ["event_type"],
  registers: [register],
});

// Event handler errors
export const wsEventErrors = new Counter({
  name: "websocket_event_errors_total",
  help: "Total number of WebSocket event handler errors",
  labelNames: ["event_type"],
  registers: [register],
});

// ==================== Latency Metrics ====================

// Event delivery latency (EventBus emit → WebSocket client)
export const wsEventLatency = new Histogram({
  name: "websocket_event_latency_milliseconds",
  help: "Latency of event delivery from EventBus to WebSocket client",
  labelNames: ["event_type"],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500], // 1ms to 2.5s
  registers: [register],
});

// Heartbeat round-trip time
export const wsHeartbeatLatency = new Histogram({
  name: "websocket_heartbeat_rtt_milliseconds",
  help: "Round-trip time for WebSocket heartbeat pings",
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000], // 1ms to 1s
  registers: [register],
});

// Initial state send time
export const wsInitialStateLatency = new Histogram({
  name: "websocket_initial_state_latency_milliseconds",
  help: "Time taken to send initial state to connecting clients",
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000], // 10ms to 5s
  registers: [register],
});

// ==================== Helper Functions ====================

/**
 * Record event emission with timestamp for latency tracking
 */
export function recordEventEmission(eventType: string): number {
  wsEventsEmitted.inc({ event_type: eventType });
  return Date.now();
}

/**
 * Record event delivery and calculate latency
 */
export function recordEventDelivery(eventType: string, emitTimestamp: number): void {
  const latency = Date.now() - emitTimestamp;
  wsEventLatency.observe({ event_type: eventType }, latency);
}

/**
 * Track connection lifecycle
 */
export class ConnectionTracker {
  private connectionStart: number;

  constructor() {
    this.connectionStart = Date.now();
    wsActiveConnections.inc();
    wsConnectionsTotal.inc();
  }

  disconnect(): void {
    const duration = (Date.now() - this.connectionStart) / 1000;
    wsConnectionDuration.observe(duration);
    wsActiveConnections.dec();
    wsDisconnectionsTotal.inc();
  }
}
