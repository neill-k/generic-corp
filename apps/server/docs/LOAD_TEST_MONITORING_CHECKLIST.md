# Load Test Monitoring Checklist - Monday 9 AM EST

**Engineer**: eng-1
**Date**: Monday (scheduled)
**Test**: 1000+ connection load test (Task #27)

## Pre-Test Setup

### Monitoring Tools
- [ ] Server logs tailing: `pnpm dev:server | tee load-test.log`
- [ ] Database client ready (Prisma Studio or psql)
- [ ] System monitor (htop/top) available
- [ ] Network monitoring tools ready

### Baseline Metrics (Capture Before Test)
- [ ] Current database connections: _____
- [ ] Memory usage (RSS): _____
- [ ] CPU usage: _____
- [ ] Open file descriptors: _____
- [ ] Active WebSocket connections: _____

## During Test Monitoring

### Phase 1: Baseline (100 connections, 5 min)
**Start Time**: _____
- [ ] Monitor connection pool size
- [ ] Check query response times
- [ ] Watch for any errors
- [ ] Memory stable?
- [ ] CPU usage: ____%
**End Time**: _____
**Status**: ☐ PASS ☐ FAIL ☐ ISSUES

### Phase 2: Ramp (100→1000, 10 min)
**Start Time**: _____
- [ ] Connection pool scaling properly?
- [ ] Query times degrading?
- [ ] Memory growth linear or exponential?
- [ ] Any connection timeouts?
- [ ] CPU usage: ____%
**End Time**: _____
**Status**: ☐ PASS ☐ FAIL ☐ ISSUES

### Phase 3: Sustained (1000 connections, 15 min)
**Start Time**: _____
- [ ] System stable under sustained load?
- [ ] Memory leaks detected?
- [ ] GC frequency increasing?
- [ ] Connection pool exhaustion?
- [ ] Query timeouts?
- [ ] CPU usage: ____%
**End Time**: _____
**Status**: ☐ PASS ☐ FAIL ☐ ISSUES

### Phase 4: Spike (500→1500, 5 min)
**Start Time**: _____
- [ ] Handles spike gracefully?
- [ ] Connection pool overflows?
- [ ] Query queue backing up?
- [ ] Error rate spike?
- [ ] CPU usage: ____%
**End Time**: _____
**Status**: ☐ PASS ☐ FAIL ☐ ISSUES

### Phase 5: File Watcher Stress (10+ changes/sec)
**Start Time**: _____
- [ ] File watcher keeping up?
- [ ] WebSocket broadcasts delayed?
- [ ] Event queue backing up?
- [ ] CPU spike on file operations?
- [ ] Memory spike?
**End Time**: _____
**Status**: ☐ PASS ☐ FAIL ☐ ISSUES

## Critical Metrics to Watch

### Database (Prisma)
```bash
# Connection pool usage
# Check Prisma logs for "Connection pool exhausted"
grep "pool" load-test.log

# Query performance
# Watch for queries >100ms
grep "slow query" load-test.log
```

**Thresholds:**
- ⚠️ Warning: Query times >100ms
- 🚨 Critical: Query times >500ms
- 🚨 Critical: Connection pool exhausted

### Memory
```bash
# Monitor Node.js heap
node --expose-gc server.js
# Or check with ps
ps aux | grep node
```

**Thresholds:**
- ⚠️ Warning: >512MB RSS
- 🚨 Critical: >1GB RSS or growing continuously

### WebSocket
```bash
# Active connections
# Check server logs for connection count
grep "Client connected" load-test.log | wc -l
```

**Thresholds:**
- ⚠️ Warning: >800 concurrent connections
- 🚨 Critical: Connection rejections or timeouts

### File Watcher
```bash
# File watcher events
grep "TaskWatcher" load-test.log
```

**Thresholds:**
- ⚠️ Warning: Event processing >200ms
- 🚨 Critical: Events backing up or being dropped

## Issue Response Protocol

### If Connection Pool Exhausted
1. Report to devops-manager-2 immediately
2. Check current pool size in Prisma config
3. Recommend: Increase pool size if infrastructure allows
4. Hotfix: Add connection pooling middleware if needed

### If Memory Leak Detected
1. Take heap snapshot: `kill -USR2 <pid>`
2. Report to devops-manager-2
3. Identify leaking component (likely EventEmitter or WebSocket)
4. Hotfix: Add memory limits or restart policy

### If Query Timeouts
1. Identify slow queries in logs
2. Report to devops-manager-2
3. Check database load with devops-2-2
4. Hotfix: Add query timeouts or caching

### If File Watcher Overloaded
1. Check event queue depth
2. Report to devops-manager-2
3. Recommend: Throttle file watcher events
4. Hotfix: Add debouncing or rate limiting

## Communication Templates

### Normal Status Update
```
Phase [X] status: ✅ Stable
- CPU: [X]%
- Memory: [X]MB
- Connections: [X]
- Queries: [X]ms avg
```

### Warning Report
```
⚠️ Warning in Phase [X]:
Issue: [description]
Metric: [value]
Threshold: [warning level]
Action: Monitoring closely
```

### Critical Alert
```
🚨 CRITICAL in Phase [X]:
Issue: [description]
Metric: [value]
Impact: [what's breaking]
Recommendation: [what to do]
Status: [investigating/hotfixing/need decision]
```

## Post-Test Report Template

### Performance Summary
- Total test duration: _____ minutes
- Peak connections: _____
- Peak memory: _____ MB
- Peak CPU: _____%
- Total queries: _____
- Average query time: _____ ms
- Errors encountered: _____

### Issues Found
1. [Issue description]
   - Severity: ☐ Low ☐ Medium ☐ High ☐ Critical
   - Phase occurred: _____
   - Resolution: _____

### Bottlenecks Identified
- [ ] Database connection pool
- [ ] Prisma query performance
- [ ] Memory usage
- [ ] WebSocket connections
- [ ] File watcher throughput
- [ ] Other: _____

### Recommendations
1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

### Launch Readiness
Based on load test results:
- ☐ Ready for launch as-is
- ☐ Ready with minor optimizations
- ☐ Needs fixes before launch
- ☐ Not ready (major issues)

## Quick Reference Commands

```bash
# Tail server logs
tail -f logs/server.log

# Monitor connections
ss -s | grep ESTAB

# Check memory
ps aux --sort=-%mem | head

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Node.js heap usage
node -e "console.log(process.memoryUsage())"

# Find slow queries
grep "query" logs/server.log | grep -o "[0-9]*ms" | sort -n

# WebSocket connections
netstat -an | grep :3000 | wc -l
```

## Notes Section

**Observations:**
_____________________________________
_____________________________________
_____________________________________

**Anomalies:**
_____________________________________
_____________________________________
_____________________________________

**Team Coordination:**
_____________________________________
_____________________________________
_____________________________________
