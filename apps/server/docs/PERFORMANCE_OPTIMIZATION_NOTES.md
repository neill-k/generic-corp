# Performance Optimization Notes

**For**: Monday Load Test and Production Launch
**Author**: eng-1
**Date**: 2026-01-26

## Current Architecture Assessment

### Task File Watcher Service

**Current Config**:
```typescript
awaitWriteFinish: {
  stabilityThreshold: 100,  // Wait 100ms for file to stabilize
  pollInterval: 50,         // Check every 50ms
}
```

**Performance Characteristics**:
- ✅ Good: Batches rapid changes automatically
- ✅ Good: Minimal CPU usage when idle
- ⚠️ Concern: High-frequency changes (10+/sec) may queue up

**Potential Optimizations** (if needed during load test):

1. **Add Event Debouncing**
   ```typescript
   // Debounce WebSocket broadcasts to max 10/sec per team
   private debounceMap = new Map<string, NodeJS.Timeout>();

   private emitWithDebounce(event: string, data: any) {
     const key = `${data.team}-${data.taskId}`;
     if (this.debounceMap.has(key)) {
       clearTimeout(this.debounceMap.get(key)!);
     }
     this.debounceMap.set(key, setTimeout(() => {
       this.io.emit(event, data);
       this.debounceMap.delete(key);
     }, 100));
   }
   ```

2. **Increase Stability Threshold**
   ```typescript
   stabilityThreshold: 200,  // Up from 100ms
   ```

3. **Add Max Listeners Warning Suppression**
   ```typescript
   chokidar.watch(path, {
     // ... existing config
     usePolling: false,  // Ensure we're using native OS events
   });
   ```

### WebSocket Connections

**Current**: Socket.io with default settings

**Potential Issues**:
- Connection pool limits
- Memory per connection
- Broadcast performance with 1000+ clients

**Potential Optimizations**:

1. **Enable Binary Protocol** (already using websocket transport)
   - Current: `transports: ["websocket", "polling"]` ✅

2. **Add Connection Throttling**
   ```typescript
   io.use((socket, next) => {
     // Rate limit connections per IP
     const connections = getConnectionCount(socket.handshake.address);
     if (connections > MAX_CONNECTIONS_PER_IP) {
       return next(new Error('Too many connections'));
     }
     next();
   });
   ```

3. **Room-Based Broadcasting** (already implemented in #29) ✅
   ```typescript
   // Instead of: io.emit('task:updated', data)
   // Use: io.to(`team-${team}`).emit('task:updated', data)
   ```

### Database (Prisma)

**Current Pool Size**: Check `prisma/schema.prisma` for connection_limit

**Potential Issues**:
- Pool exhaustion with 1000+ concurrent requests
- Slow queries under load
- Transaction lock contention

**Potential Optimizations**:

1. **Increase Connection Pool**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
     // Add: ?connection_limit=50
   }
   ```

2. **Add Query Timeout**
   ```typescript
   // In Prisma client initialization
   const prisma = new PrismaClient({
     datasources: {
       db: {
         url: process.env.DATABASE_URL,
       },
     },
     log: ['query', 'error', 'warn'],
     // Add timeout middleware
   });
   ```

3. **Enable Query Caching** (if read-heavy)
   ```typescript
   import { cachified } from '@epic-web/cachified';
   // Cache frequently read data
   ```

### Memory Management

**Current**: No explicit limits

**Potential Issues**:
- EventEmitter memory leaks
- WebSocket connection buffers
- File watcher cache growing unbounded

**Potential Optimizations**:

1. **Add Cache Size Limit**
   ```typescript
   private taskFilesCache = new Map<string, { mtime: number; data: TaskFile }>();
   private MAX_CACHE_SIZE = 1000;

   private addToCache(key: string, value: any) {
     if (this.taskFilesCache.size >= this.MAX_CACHE_SIZE) {
       // Remove oldest entries (LRU)
       const firstKey = this.taskFilesCache.keys().next().value;
       this.taskFilesCache.delete(firstKey);
     }
     this.taskFilesCache.set(key, value);
   }
   ```

2. **Increase Node.js Heap Size** (if needed)
   ```bash
   node --max-old-space-size=2048 dist/index.js
   ```

3. **Add Periodic Cleanup**
   ```typescript
   setInterval(() => {
     if (global.gc) {
       global.gc();
     }
   }, 60000); // Every minute
   ```

## Load Test Scenarios & Responses

### Scenario 1: Connection Pool Exhausted

**Symptoms**:
```
Error: Connection pool timeout
Prisma: Failed to acquire connection from pool
```

**Immediate Response**:
1. Increase pool size in DATABASE_URL: `?connection_limit=50`
2. Restart server
3. Monitor pool usage

**Long-term Fix**:
- Implement connection pooling middleware (PgBouncer)
- Add connection retry logic

### Scenario 2: Memory Leak

**Symptoms**:
```
Process RSS growing continuously
Node.js heap approaching max
OOM crashes
```

**Immediate Response**:
1. Identify leak source (heap snapshot)
2. If EventEmitter: Check for listener leaks
3. If WebSocket: Check for unclosed connections
4. Hotfix: Add memory limit and auto-restart

**Long-term Fix**:
- Fix leak source
- Add memory monitoring alerts
- Implement graceful degradation

### Scenario 3: File Watcher Overload

**Symptoms**:
```
[TaskWatcher] falling behind
WebSocket broadcasts delayed
High CPU on file operations
```

**Immediate Response**:
1. Increase stabilityThreshold to 200ms
2. Add debouncing to broadcasts
3. Consider disabling file watcher during extreme load

**Long-term Fix**:
- Implement event queue with backpressure
- Add rate limiting on file operations
- Consider using Redis for task state instead of files

### Scenario 4: WebSocket Broadcast Storm

**Symptoms**:
```
High CPU on io.emit
Delayed message delivery
Client disconnections
```

**Immediate Response**:
1. Enable room-based broadcasting (if not already)
2. Add broadcast throttling
3. Reduce broadcast frequency

**Long-term Fix**:
- Implement proper pub/sub with Redis
- Use binary protocol for large payloads
- Add message batching

## Quick Hotfixes (If Needed)

### Hotfix 1: Emergency Rate Limiting

```typescript
// Add to src/middleware/production.ts
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: 'Too many requests, please try again later',
});

app.use('/api/', apiLimiter);
```

### Hotfix 2: Disable File Watcher (Nuclear Option)

```typescript
// In src/index.ts, comment out:
// taskWatcher.start();

// Clients will need to poll REST API instead
```

### Hotfix 3: Connection Limiting

```typescript
// In src/websocket/index.ts
let connectionCount = 0;
const MAX_CONNECTIONS = 1000;

io.use((socket, next) => {
  if (connectionCount >= MAX_CONNECTIONS) {
    return next(new Error('Server at capacity'));
  }
  connectionCount++;
  socket.on('disconnect', () => connectionCount--);
  next();
});
```

### Hotfix 4: Graceful Degradation

```typescript
// Add to src/index.ts
process.on('SIGTERM', async () => {
  console.log('[Server] SIGTERM received, closing gracefully...');

  // Stop accepting new connections
  httpServer.close();

  // Stop file watcher
  await taskWatcher.stop();

  // Disconnect all WebSocket clients
  io.disconnectSockets(true);

  // Close database connections
  await db.$disconnect();

  process.exit(0);
});
```

## Performance Metrics to Track

### Key Indicators

1. **Response Time**
   - Target: <100ms p95
   - Warning: >200ms p95
   - Critical: >500ms p95

2. **Throughput**
   - Target: >100 req/sec
   - Warning: <50 req/sec
   - Critical: <10 req/sec

3. **Error Rate**
   - Target: <0.1%
   - Warning: >1%
   - Critical: >5%

4. **Memory Usage**
   - Target: <512MB RSS
   - Warning: >768MB RSS
   - Critical: >1GB RSS

5. **CPU Usage**
   - Target: <50%
   - Warning: >70%
   - Critical: >90%

## Pre-Launch Checklist

Performance-related items to verify before HN launch:

- [ ] Connection pool sized appropriately
- [ ] WebSocket limits configured
- [ ] File watcher stress tested
- [ ] Memory limits set
- [ ] Rate limiting enabled
- [ ] Monitoring/alerting configured
- [ ] Graceful shutdown implemented
- [ ] Load test passed with >1000 connections
- [ ] Hotfix procedures documented
- [ ] Rollback plan ready

## References

- Socket.io Performance: https://socket.io/docs/v4/performance-tuning/
- Prisma Connection Pooling: https://www.prisma.io/docs/concepts/components/prisma-client/connection-management
- Chokidar Performance: https://github.com/paulmillr/chokidar#performance
- Node.js Memory Management: https://nodejs.org/en/docs/guides/simple-profiling/
