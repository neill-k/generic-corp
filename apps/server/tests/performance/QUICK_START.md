# Quick Start - Performance Testing

Fast reference guide for running performance tests.

## Prerequisites

1. **Start the server:**
   ```bash
   pnpm dev:server
   ```

2. **Ensure dependencies installed:**
   ```bash
   pnpm install
   ```

---

## Quick Test Commands

### 1. Quick Load Test (30 seconds)
```bash
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts
```
**What it does:** 50 connections, 100 events/sec, 30 seconds
**When to use:** Quick health check, pre-commit testing

---

### 2. Quick Memory Check (5 minutes)
```bash
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts
```
**What it does:** 5-minute session with activity simulation
**When to use:** Quick memory leak check, pre-commit testing

---

### 3. Normal Load Test (1 minute)
```bash
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 50 100 60 10
```
**What it does:** 50 connections, 100 events/sec, 60 seconds
**When to use:** Standard performance testing, CI/CD

---

### 4. Stress Test (2 minutes)
```bash
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 100 500 120 10
```
**What it does:** 100 connections, 500 events/sec, 120 seconds
**When to use:** Before release, capacity planning

---

### 5. Extended Memory Test (1 hour)
```bash
pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts http://localhost:3000 60 10 10
```
**What it does:** 1-hour session with memory monitoring
**When to use:** Before release, when investigating memory issues

---

### 6. Breaking Point Test
```bash
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts http://localhost:3000 500 1000 120 15
```
**What it does:** 500 connections, 1000 events/sec, 120 seconds
**When to use:** Finding system limits, capacity planning

---

## Understanding Results

### ✅ Good Performance
```
Connection Success Rate: 100% ✅
Connection Time (p95): 150ms ✅
Event Latency (p95): 80ms ✅
Event Loss Rate: 0% ✅
Memory Leak: NO ✅
```

### ⚠️  Warning Signs
```
Connection Success Rate: 98% ⚠️  (< 99.5%)
Connection Time (p95): 600ms ⚠️  (> 500ms)
Event Latency (p95): 250ms ⚠️  (> 200ms)
Event Loss Rate: 0.5% ⚠️  (> 0%)
```

### ❌ Critical Issues
```
Connection Success Rate: 90% ❌
Connection Time (p95): 2000ms ❌
Event Latency (p95): 1000ms ❌
Event Loss Rate: 5% ❌
Memory Leak: YES (50 MB/hour) ❌
```

---

## Test Progression (Recommended Order)

```
1. Quick Load Test (30s)         → Baseline
   ↓
2. Quick Memory Check (5m)       → No obvious leaks
   ↓
3. Normal Load Test (1m)         → Meets targets
   ↓
4. Stress Test (2m)              → Graceful degradation
   ↓
5. Extended Memory Test (1h)     → Confirm no leaks
   ↓
6. Breaking Point Test           → Know the limits
```

---

## Common Issues & Solutions

### Issue: Connection Failures
```
❌ Connection Success Rate: 75%
```
**Solutions:**
1. Check server is running
2. Reduce concurrent connections
3. Increase server resources
4. Check Redis is available

---

### Issue: High Latency
```
⚠️  Event Latency (p95): 800ms
```
**Solutions:**
1. Check Redis performance
2. Optimize event handlers
3. Review database queries
4. Check network conditions

---

### Issue: Memory Leak Detected
```
❌ Leak Rate: 30 MB/hour
```
**Solutions:**
1. Take heap snapshots (start vs end)
2. Check for unclosed connections
3. Review event listener cleanup
4. Check React component unmounting

---

### Issue: Event Loss
```
⚠️  Event Loss Rate: 2%
```
**Solutions:**
1. Check queue overflow
2. Increase buffer sizes
3. Implement backpressure
4. Check Redis Pub/Sub

---

## Automated Testing

### In CI/CD Pipeline
```yaml
# .github/workflows/performance.yml
- name: Quick Performance Test
  run: pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts

- name: Quick Memory Test
  run: pnpm --filter @generic-corp/server tsx tests/performance/memory-leak-test.ts
```

### Pre-commit Hook
```bash
# .git/hooks/pre-push
#!/bin/bash
echo "Running quick performance tests..."
pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts
```

---

## Monitoring in Production

### Key Metrics to Track
```
- WebSocket connection count
- Event processing latency (p50, p95, p99)
- Connection success rate
- Error rate
- Memory usage
- CPU usage
```

### Alert Thresholds
```
Critical: Event latency p95 > 1000ms
Warning:  Event latency p95 > 500ms
Info:     Event latency p95 > 200ms
```

---

## Emergency Response

### If Performance Degrades in Production

1. **Check current load:**
   ```bash
   # SSH to server
   top
   htop
   ```

2. **Check Redis:**
   ```bash
   redis-cli INFO stats
   redis-cli MEMORY STATS
   ```

3. **Check database:**
   ```bash
   # Check active connections
   SELECT count(*) FROM pg_stat_activity;
   ```

4. **Run quick load test:**
   ```bash
   pnpm --filter @generic-corp/server tsx tests/performance/websocket-load-test.ts https://your-production-url.com 10 50 20 5
   ```

5. **Take heap snapshot:**
   ```bash
   # If memory leak suspected
   node --expose-gc --inspect server.js
   # Use Chrome DevTools to take snapshot
   ```

---

## Need Help?

- **Full documentation:** `tests/performance/README.md`
- **Test scenarios:** `apps/server/docs/qa-test-scenarios-dashboard.md`
- **Bug reports:** `apps/server/docs/bug-report-template.md`
- **Benchmarks:** `apps/server/docs/performance-benchmarks.md`

---

## Quick Checklist Before Release

- [ ] Quick load test passes
- [ ] Quick memory check passes
- [ ] Normal load test passes
- [ ] Stress test shows graceful degradation
- [ ] 1-hour memory test shows no leaks
- [ ] Cross-browser testing complete
- [ ] Security validation complete
- [ ] All critical bugs fixed

---

**Pro Tip:** Run tests in this order to catch issues early without wasting time on long tests if basic functionality is broken.
