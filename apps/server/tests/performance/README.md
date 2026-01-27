# Performance Testing Suite

This directory contains performance testing tools for the Claude Code Dashboard WebSocket infrastructure.

## Test Scripts

### 1. WebSocket Load Test (`websocket-load-test.ts`)

Tests WebSocket performance under various load conditions.

**Usage:**
```bash
# Run with defaults (50 connections, 100 events/sec, 30s duration)
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts

# Custom configuration
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts <server_url> <connections> <event_rate> <duration> <warmup>

# Examples:
# Light load test
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 10 50 20 5

# Normal load test
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 50 100 30 5

# Heavy load test
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 100 500 60 10

# Stress test
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 500 1000 120 15
```

**Parameters:**
- `server_url`: WebSocket server URL (default: http://localhost:3000)
- `connections`: Number of concurrent connections (default: 50)
- `event_rate`: Events per second (default: 100)
- `duration`: Test duration in seconds (default: 30)
- `warmup`: Warmup duration in seconds (default: 5)

**Metrics Measured:**
- Connection establishment time (avg, p50, p95, p99)
- Connection success rate
- Event latency (avg, p50, p95, p99, max)
- Event loss rate
- Disconnection rate
- Memory usage over time

**Pass Criteria:**
- Connection success rate > 99.5%
- Connection time p95 < 500ms
- Event latency p95 < 200ms

---

### 2. Memory Leak Test (`memory-leak-test.ts`)

Monitors memory usage over extended sessions to detect memory leaks.

**Usage:**
```bash
# Run with defaults (5 minutes, sample every 5s)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts

# Custom configuration
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts <server_url> <duration_minutes> <sampling_seconds> <activity_rate>

# Examples:
# Quick leak check (5 minutes)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 5 5 10

# Standard leak test (1 hour)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 60 10 10

# Extended leak test (4 hours)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 240 30 5

# Overnight test (8 hours)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 480 60 5
```

**Parameters:**
- `server_url`: WebSocket server URL (default: http://localhost:3000)
- `duration_minutes`: Test duration in minutes (default: 5)
- `sampling_seconds`: Memory sampling interval in seconds (default: 5)
- `activity_rate`: Simulated user actions per minute (default: 10)

**Metrics Measured:**
- Heap memory usage (initial, final, avg, max, min)
- RSS memory usage
- Memory growth rate (MB/hour)
- Memory leak detection (linear regression)
- Confidence level (R² correlation)

**Pass Criteria:**
- Memory leak rate < 5 MB/hour
- R² correlation < 0.7 (weak upward trend)

**Leak Detection Algorithm:**
- Uses linear regression to detect memory growth trend
- Calculates leak rate in MB per hour
- Provides confidence score based on R² value
- Generates sparkline visualization of memory timeline

---

## Prerequisites

1. **Server Running:** Ensure the Generic Corp server is running:
   ```bash
   pnpm dev:server
   ```

2. **Dependencies Installed:**
   ```bash
   pnpm install
   ```

3. **Environment:** Tests connect to `http://localhost:3000` by default.

---

## Recommended Test Plan

### Phase 1: Baseline Testing
```bash
# Establish performance baseline with light load
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 10 50 30 5
```

### Phase 2: Normal Load Testing
```bash
# Test under expected production load
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 50 100 60 10
```

### Phase 3: Stress Testing
```bash
# Test system limits
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 100 500 60 10
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 500 1000 120 15
```

### Phase 4: Memory Leak Detection
```bash
# Quick check (5 minutes)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 5 5 10

# Standard check (1 hour)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 60 10 10

# Extended check (4 hours - run overnight)
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 240 30 5
```

---

## Interpreting Results

### WebSocket Load Test Results

**Good Performance:**
```
Connection Success Rate: 100%
Connection Time (p95): 150ms
Event Latency (p95): 80ms
Event Loss Rate: 0%
```

**Concerning Performance:**
```
Connection Success Rate: 95%  ⚠️  (< 99.5% threshold)
Connection Time (p95): 800ms  ⚠️  (> 500ms threshold)
Event Latency (p95): 350ms   ⚠️  (> 200ms threshold)
Event Loss Rate: 2%          ⚠️  (> 0% threshold)
```

**Action Items for Poor Performance:**
- High connection time: Check server load, network latency
- High event latency: Investigate Redis adapter, event processing
- Event loss: Check queue overflow, connection stability
- High disconnection rate: Investigate server errors, timeouts

### Memory Leak Test Results

**No Leak Detected:**
```
Leak Detected: ✅ NO
Leak Rate: 2.5 MB/hour
Confidence: 45%
Total Growth: +12 MB (15%)
```

**Leak Detected:**
```
Leak Detected: ❌ YES
Leak Rate: 25 MB/hour  ⚠️
Confidence: 85%
Total Growth: +150 MB (200%)
```

**Action Items for Memory Leaks:**
1. Take heap snapshots at start and end of test
2. Use Chrome DevTools to compare snapshots
3. Look for:
   - Unclosed WebSocket connections
   - Event listener leaks
   - React component cleanup issues
   - Circular references
   - Unclosed database connections
   - Cached data not being pruned

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Start server
        run: |
          pnpm dev:server &
          sleep 10

      - name: Run load tests
        run: |
          pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 50 100 30 5

      - name: Run memory leak tests
        run: |
          pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 10 5 10
```

---

## Monitoring in Production

### Recommended Tools

1. **Grafana + Prometheus:** Real-time metrics dashboard
2. **Sentry:** Error tracking and performance monitoring
3. **DataDog / New Relic:** APM and infrastructure monitoring
4. **Artillery Cloud:** Scheduled load testing

### Key Metrics to Monitor

- WebSocket connection count
- Event processing latency (p50, p95, p99)
- Redis memory usage
- Node.js heap size
- CPU usage
- Error rate
- Throughput (events/sec)

---

## Troubleshooting

### Test Fails to Connect

```
Error: Connection timeout
```

**Solutions:**
1. Ensure server is running: `pnpm dev:server`
2. Check server URL is correct
3. Verify port 3000 is accessible
4. Check firewall settings

### High Event Latency

```
Event Latency (p95): 1200ms ⚠️
```

**Potential Causes:**
1. Redis slow responses - check Redis performance
2. Database query bottleneck - add indexes
3. Event processing blocking - optimize handlers
4. Network issues - check latency

### Memory Leak False Positives

```
Leak Detected: YES (but not actually leaking)
```

**Causes:**
1. Test duration too short (< 30 minutes)
2. Garbage collection not running
3. Natural cache growth (not a leak)

**Solutions:**
1. Run longer tests (1+ hours)
2. Force GC before test: `node --expose-gc`
3. Check if memory stabilizes over time

---

## Best Practices

1. **Run baseline tests** before making changes
2. **Compare results** to detect regressions
3. **Test in isolation** - stop other services
4. **Use production-like data** for realistic tests
5. **Run extended tests** before major releases
6. **Automate tests** in CI/CD pipeline
7. **Monitor production** metrics continuously
8. **Set up alerts** for performance degradation

---

## Additional Resources

- [Socket.io Performance Tuning](https://socket.io/docs/v4/performance-tuning/)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Chrome DevTools Memory Profiler](https://developer.chrome.com/docs/devtools/memory-problems/)
