# Production Infrastructure Plan
**Author**: Yuki Tanaka (SRE)
**Date**: January 26, 2026
**Status**: In Review
**Priority**: CRITICAL

## Executive Summary

This document outlines the production infrastructure plan for transforming Generic Corp into a multi-tenant SaaS platform. Our goal is to support the revenue strategy with production-ready, scalable, and reliable infrastructure within 6 weeks.

**Current State**: Development-ready monorepo with local Docker infrastructure
**Target State**: Production-ready multi-tenant SaaS with monitoring, security, and 99.9% uptime

---

## Current Infrastructure Assessment

### ✅ What We Have (Production-Ready)

1. **Application Stack**
   - Express.js API server with TypeScript
   - WebSocket (Socket.io) for real-time updates
   - Prisma ORM with PostgreSQL 16
   - Redis 7 for caching and queues
   - BullMQ task queue with workers
   - Temporal workflow engine for agent orchestration
   - React frontend (game UI)
   - Landing page app

2. **Development Infrastructure**
   - Docker Compose setup for local development
   - PostgreSQL with healthchecks
   - Redis with persistence (AOF)
   - Temporal server + UI
   - pnpm monorepo structure

3. **Code Quality**
   - TypeScript throughout
   - Shared types package
   - Environment variable configuration
   - Database migrations via Prisma

### ❌ What We Need (Production Gaps)

1. **Multi-Tenancy**
   - Tenant isolation in database
   - Resource limits per tenant
   - Tenant-aware API routing
   - Billing/usage tracking per tenant

2. **Security**
   - API authentication (JWT, API keys)
   - Rate limiting per tenant
   - Input validation and sanitization
   - Secrets management
   - HTTPS/TLS termination
   - CORS configuration for production domains

3. **Monitoring & Observability**
   - Application metrics (Prometheus/Datadog)
   - Logging aggregation (Loki/CloudWatch)
   - Error tracking (Sentry)
   - APM (Application Performance Monitoring)
   - Uptime monitoring
   - Alert routing (PagerDuty/OpsGenie)

4. **Reliability**
   - Health check endpoints (already have /health)
   - Graceful shutdown
   - Circuit breakers for external services
   - Database connection pooling
   - Queue backpressure handling
   - Retry policies with exponential backoff

5. **Deployment**
   - Production Docker images
   - Container orchestration (K8s/ECS/Railway)
   - Infrastructure as Code (Terraform/Pulumi)
   - CI/CD pipeline (GitHub Actions)
   - Blue-green or rolling deployments
   - Database migration strategy

6. **Scalability**
   - Horizontal scaling for API servers
   - Worker auto-scaling based on queue depth
   - Database read replicas
   - Redis clustering
   - CDN for static assets

7. **Backup & Disaster Recovery**
   - Automated database backups
   - Point-in-time recovery
   - Backup verification and testing
   - Disaster recovery runbook

---

## Phase 1: Week 1 - Production Hardening (Foundation)

**Goal**: Make existing infrastructure production-ready with security and monitoring

### Tasks

#### 1. Multi-Tenant Database Architecture

**Implementation**:
```sql
-- Add tenant_id to all relevant tables
ALTER TABLE agents ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE tasks ADD COLUMN tenant_id UUID NOT NULL;
ALTER TABLE messages ADD COLUMN tenant_id UUID NOT NULL;

-- Create tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL, -- free, starter, pro, enterprise
  status VARCHAR(50) NOT NULL, -- active, suspended, cancelled

  -- Resource limits
  max_agents INTEGER DEFAULT 5,
  max_agent_minutes INTEGER DEFAULT 1000,

  -- Usage tracking
  current_agents INTEGER DEFAULT 0,
  used_agent_minutes INTEGER DEFAULT 0,

  -- Billing
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for tenant queries
CREATE INDEX idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
```

**Middleware**: Tenant context injection
```typescript
// Middleware to extract tenant from JWT/API key
app.use(extractTenantMiddleware);

// Row-level security in Prisma queries
const agents = await prisma.agent.findMany({
  where: { tenant_id: req.tenantId }
});
```

**Effort**: 2-3 days
**Owner**: Yuki + Sable
**Risk**: Medium (requires schema changes, data migration)

#### 2. Authentication & Authorization

**Components**:
- JWT-based authentication for dashboard users
- API key authentication for programmatic access
- Role-based access control (owner, admin, developer, viewer)

**Implementation**:
```typescript
// Auth middleware
const authenticateJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    req.tenantId = user.tenantId;
    next();
  });
};

// API key middleware
const authenticateAPIKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'Missing API key' });

  const tenant = await prisma.tenant.findFirst({
    where: { api_keys: { some: { key: apiKey, revoked: false } } }
  });

  if (!tenant) return res.status(403).json({ error: 'Invalid API key' });
  req.tenantId = tenant.id;
  next();
};
```

**Effort**: 2 days
**Owner**: Yuki + DeVonte
**Risk**: Low

#### 3. Rate Limiting

**Implementation**: Using `rate-limiter-flexible` (already in dependencies)

```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rl',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

// Per-tenant rate limiting
const rateLimitMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.tenantId);
    next();
  } catch {
    res.status(429).json({ error: 'Too many requests' });
  }
};

// Different limits per plan
const getPlanLimits = (plan: string) => {
  return {
    free: { points: 60, duration: 60 },
    starter: { points: 300, duration: 60 },
    pro: { points: 1000, duration: 60 },
    enterprise: { points: 10000, duration: 60 },
  }[plan];
};
```

**Effort**: 1 day
**Owner**: Yuki
**Risk**: Low

#### 4. Monitoring & Logging

**Stack Choice**:
- **Metrics**: Prometheus + Grafana (self-hosted) OR Datadog (managed)
- **Logs**: Loki + Grafana (self-hosted) OR CloudWatch (AWS) / Better Stack
- **Errors**: Sentry (free tier: 5K events/month)
- **Uptime**: Better Uptime or UptimeRobot (free)

**Implementation**:
```typescript
// Prometheus metrics
import { register, Counter, Histogram } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'tenant_id'],
});

const agentExecutions = new Counter({
  name: 'agent_executions_total',
  help: 'Total number of agent executions',
  labelNames: ['agent_type', 'tenant_id', 'status'],
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Structured logging
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'generic-corp-api' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log tenant context
logger.info('Agent execution started', {
  tenantId: req.tenantId,
  agentId: agent.id,
  taskId: task.id,
});
```

**Effort**: 3-4 days
**Owner**: Yuki
**Risk**: Low

#### 5. Resource Limits & Usage Tracking

**Implementation**:
```typescript
// Pre-execution check
const canExecuteAgent = async (tenantId: string): Promise<boolean> => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  // Check agent limit
  if (tenant.current_agents >= tenant.max_agents) {
    return false;
  }

  // Check minute quota
  if (tenant.used_agent_minutes >= tenant.max_agent_minutes) {
    return false;
  }

  return true;
};

// Track usage in real-time
const trackAgentMinutes = async (tenantId: string, minutes: number) => {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      used_agent_minutes: { increment: minutes },
    },
  });

  // Emit event for billing
  eventBus.emit('usage.recorded', { tenantId, minutes });
};

// Reset quotas monthly (cron job)
import cron from 'node-cron';

cron.schedule('0 0 1 * *', async () => {
  await prisma.tenant.updateMany({
    data: { used_agent_minutes: 0 },
  });
  logger.info('Monthly quotas reset');
});
```

**Effort**: 2 days
**Owner**: Yuki + Graham
**Risk**: Medium (business-critical logic)

---

## Phase 2: Week 2 - Production Deployment

**Goal**: Deploy to production environment with CI/CD

### Deployment Architecture Options

#### Option A: Railway (Recommended for MVP)
**Pros**:
- Fastest time to production (deploy in hours)
- Built-in PostgreSQL, Redis
- Auto-scaling and load balancing
- $5/month base + usage
- GitHub integration for CI/CD
- Free SSL certificates

**Cons**:
- Less control than K8s
- Vendor lock-in risk
- Limited customization

**Cost Estimate**: $20-50/month initially

#### Option B: AWS ECS + RDS
**Pros**:
- Full control and flexibility
- Industry standard
- Easy to scale to enterprise
- Wide range of services (CloudWatch, CloudFront, etc.)

**Cons**:
- More complex setup
- Higher initial costs
- Requires more ops expertise

**Cost Estimate**: $100-200/month initially

#### Option C: DigitalOcean App Platform
**Pros**:
- Simpler than AWS
- Good documentation
- Managed databases
- $12/month per app component

**Cons**:
- Less mature than AWS/GCP
- Fewer integrations
- Limited regions

**Cost Estimate**: $50-100/month initially

#### Option D: Self-Hosted (K8s on Hetzner/OVH)
**Pros**:
- Lowest cost at scale
- Maximum control
- No vendor lock-in

**Cons**:
- Highest operational burden
- Requires K8s expertise
- Slower to production

**Cost Estimate**: $30-50/month, but requires significant setup time

**Recommendation**: Start with **Railway** for speed, plan migration to AWS/GCP if we hit scale or enterprise requirements.

### Deployment Components

1. **API Server** (Node.js)
   - Dockerized Express app
   - Auto-scaling (2-10 instances)
   - Health checks on /health
   - Graceful shutdown handling

2. **Worker Processes**
   - Separate container for BullMQ workers
   - Auto-scale based on queue depth
   - Handle long-running agent tasks

3. **Temporal Workers**
   - Dedicated workers for Temporal workflows
   - Separate scaling from API/workers

4. **Database** (PostgreSQL)
   - Managed RDS or Railway PostgreSQL
   - Automated backups (daily)
   - Connection pooling (PgBouncer)

5. **Cache/Queue** (Redis)
   - Managed Redis or Railway Redis
   - Persistence enabled (AOF)
   - Separate instances for cache vs. queues (optional)

6. **Static Assets**
   - Frontend on Vercel or Cloudflare Pages (free)
   - CDN for game assets
   - Environment-based API URLs

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test
      - run: pnpm typecheck

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t generic-corp-api:${{ github.sha }} .
      - name: Push to registry
        run: docker push generic-corp-api:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

**Effort**: 3-4 days
**Owner**: Yuki + DeVonte
**Risk**: Medium (new platform)

---

## Phase 3: Week 3-4 - Advanced Production Features

### 1. Database Connection Pooling

**Problem**: Lambda/serverless functions can exhaust DB connections
**Solution**: PgBouncer or Prisma Data Proxy

```typescript
// Use connection pooling in production
const databaseUrl = process.env.NODE_ENV === 'production'
  ? process.env.DATABASE_URL_POOLED
  : process.env.DATABASE_URL;
```

### 2. Graceful Shutdown

```typescript
// server.ts
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle shutdown signals
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new requests
  server.close(async () => {
    logger.info('HTTP server closed');

    // Close database connections
    await prisma.$disconnect();
    logger.info('Database connections closed');

    // Close Redis connections
    await redisClient.quit();
    logger.info('Redis connections closed');

    // Wait for in-flight requests
    await new Promise(resolve => setTimeout(resolve, 5000));

    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 3. Circuit Breakers

```typescript
import CircuitBreaker from 'opossum';

// Wrap external API calls
const callClaudeAPI = async (prompt: string) => {
  // Claude Agent SDK call
};

const breaker = new CircuitBreaker(callClaudeAPI, {
  timeout: 30000, // 30s timeout
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.on('open', () => {
  logger.error('Circuit breaker opened - Claude API failing');
  // Alert operations
});
```

### 4. Database Backups

**Strategy**:
- Automated daily backups (managed by Railway/RDS)
- Weekly backup verification tests
- 30-day retention policy
- Point-in-time recovery capability

**Backup Testing**:
```bash
# Weekly: Restore backup to test environment
pg_restore --dbname=test_restore backup.dump

# Verify data integrity
psql test_restore -c "SELECT COUNT(*) FROM tenants;"
```

### 5. Incident Response Runbook

**Common Incidents**:

1. **Database Connection Exhaustion**
   - Symptom: 502 errors, "too many connections"
   - Fix: Scale up connection pool, restart servers
   - Prevention: Implement connection pooling

2. **Redis OOM**
   - Symptom: Queue failures, cache misses
   - Fix: Flush cache, scale up Redis memory
   - Prevention: Set maxmemory policy, monitor usage

3. **Agent Task Timeouts**
   - Symptom: Tasks stuck in "processing"
   - Fix: Retry failed tasks, scale workers
   - Prevention: Better timeout handling, circuit breakers

4. **High API Latency**
   - Symptom: Slow response times, user complaints
   - Fix: Identify slow queries, add caching, scale servers
   - Prevention: APM monitoring, query optimization

---

## Monitoring Dashboard Requirements

### Key Metrics to Track

1. **Infrastructure**
   - CPU usage per service
   - Memory usage per service
   - Disk I/O
   - Network throughput

2. **Application**
   - Request rate (req/sec)
   - Error rate (%)
   - P50/P95/P99 latency
   - Active WebSocket connections

3. **Business**
   - Active tenants
   - Agent executions per tenant
   - API calls per tenant
   - Resource usage vs. limits

4. **Database**
   - Connection count
   - Query duration (slow queries)
   - Deadlocks
   - Replication lag (if applicable)

5. **Queues**
   - Queue depth (pending jobs)
   - Processing rate (jobs/sec)
   - Failed jobs
   - Worker utilization

### Alerting Rules

**Critical (Page immediately)**:
- API error rate > 5%
- Database connection failures
- Redis unavailable
- Worker processes crashed
- Disk usage > 90%

**Warning (Slack notification)**:
- API error rate > 1%
- P95 latency > 1s
- Queue depth > 1000
- Memory usage > 80%
- Failed background jobs

**Info (Log only)**:
- Tenant quota warnings
- Slow queries (>500ms)
- Rate limit hits

---

## Security Hardening

### Checklist

- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Security headers (helmet.js configured)
- [ ] CORS restricted to known domains
- [ ] Input validation on all endpoints (Zod schemas)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (sanitize user input)
- [ ] CSRF protection for web forms
- [ ] Secrets in environment variables (not code)
- [ ] API keys rotatable by users
- [ ] Audit logging for sensitive operations
- [ ] Rate limiting per tenant and per IP
- [ ] DDoS protection (Cloudflare or similar)
- [ ] Regular dependency updates (Dependabot)
- [ ] Penetration testing before launch

### Secrets Management

**Development**: `.env` files (not committed)
**Production**: Railway environment variables or AWS Secrets Manager

```typescript
// Never log secrets
logger.info('Database connected', {
  host: process.env.DATABASE_HOST,
  // DON'T LOG: password: process.env.DATABASE_PASSWORD
});
```

---

## Timeline & Milestones

### Week 1 (Jan 26 - Feb 1)
- [x] Infrastructure assessment (this document)
- [ ] Multi-tenant schema design
- [ ] Authentication & API keys implementation
- [ ] Rate limiting setup
- [ ] Basic monitoring (Sentry, uptime checks)

### Week 2 (Feb 2 - Feb 8)
- [ ] Production deployment to Railway
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] SSL certificates
- [ ] Domain configuration
- [ ] Backup strategy implemented

### Week 3-4 (Feb 9 - Feb 22)
- [ ] Advanced monitoring (Prometheus + Grafana)
- [ ] Circuit breakers and resilience
- [ ] Performance optimization
- [ ] Load testing
- [ ] Security audit
- [ ] Incident response runbook

### Week 5-6 (Feb 23 - Mar 8)
- [ ] Scaling improvements based on load
- [ ] Cost optimization
- [ ] Additional regions (if needed)
- [ ] Disaster recovery testing
- [ ] Documentation completion

---

## Resource Requirements

### Budget

**Immediate (Week 1-2)**:
- Railway: $0 (trial) or $20/month
- Domain: $12/year (already budgeted)
- Sentry: $0 (free tier)
- Total: ~$20-30/month

**Scale (Month 2-3)**:
- Railway: $50-100/month (more resources)
- Better Stack: $0 (free tier)
- Total: ~$50-100/month

**Revenue-Funded (Month 4+)**:
- AWS/GCP migration: $200-500/month
- Datadog: $31/host/month
- PagerDuty: $21/user/month
- Total: ~$300-600/month

**ROI**: Infrastructure costs should be <10% of MRR

### Team Support

**Primary**: Yuki (SRE) - 100% focus on infrastructure
**Secondary**:
- Sable (20%) - API architecture, multi-tenancy design
- DeVonte (15%) - CI/CD, deployment automation
- Graham (10%) - Usage analytics, cost tracking

**Decisions Needed from Marcus**:
1. Approve Railway as initial platform (vs. AWS/DO)
2. Monitoring tool preference (self-hosted vs. managed)
3. Security audit timeline and scope
4. Disaster recovery SLA requirements

---

## Risks & Mitigation

### Risk 1: Database Schema Changes
**Impact**: Breaking changes for existing development data
**Mitigation**: Plan migration carefully, test in staging, can start fresh if needed (no prod data yet)
**Likelihood**: Medium

### Risk 2: Railway Performance at Scale
**Impact**: May need to migrate to AWS/GCP sooner than expected
**Mitigation**: Design abstractly, use Docker, easy to migrate
**Likelihood**: Low

### Risk 3: Monitoring Overhead
**Impact**: Spending too much time on observability vs. shipping features
**Mitigation**: Start simple (Sentry + uptime), add complexity only when needed
**Likelihood**: Medium

### Risk 4: Security Vulnerabilities
**Impact**: Data breach, reputation damage, legal issues
**Mitigation**: Security checklist, dependency scanning, external audit before launch
**Likelihood**: Low (if we're careful)

---

## Success Criteria

**Week 1**:
- ✅ Multi-tenant database schema deployed
- ✅ Authentication working (JWT + API keys)
- ✅ Rate limiting active
- ✅ Basic error tracking (Sentry)

**Week 2**:
- ✅ Production deployment live on Railway
- ✅ CI/CD deploying automatically
- ✅ HTTPS with custom domain
- ✅ Monitoring dashboard accessible

**Week 4**:
- ✅ 99.9% uptime achieved
- ✅ <500ms P95 API latency
- ✅ Zero critical security issues
- ✅ Can handle 10 concurrent tenants

**Week 6**:
- ✅ Handling 50+ tenants
- ✅ Auto-scaling working
- ✅ Incident response tested
- ✅ Infrastructure cost optimized

---

## Next Steps (Immediate)

1. **Get Marcus's approval** on:
   - Railway as deployment platform
   - Multi-tenant architecture approach
   - Week 1 priorities

2. **Coordinate with Sable** on:
   - Multi-tenant schema design
   - API authentication flow
   - Tenant context middleware

3. **Start Week 1 tasks**:
   - Prisma schema updates for multi-tenancy
   - JWT authentication middleware
   - Rate limiting implementation
   - Sentry integration

---

## Questions for Marcus

1. **Platform Choice**: Are you comfortable with Railway for initial deployment? Alternative would be AWS ECS but takes longer to set up.

2. **Security Audit**: Do we need external security audit before launch, or can we self-audit with a checklist?

3. **Monitoring Budget**: Prefer free/cheap tools (self-hosted Prometheus) or paid managed services (Datadog) when we have revenue?

4. **SLA Requirements**: What uptime guarantee should we target? 99.9% (8.7 hours/year downtime) is standard for SaaS.

5. **Data Residency**: Any requirements for data location (US only, EU support, etc.)?

6. **Compliance**: Do we need SOC2, GDPR compliance, or can that wait until we have enterprise customers?

---

**Status**: Awaiting feedback from Marcus to proceed with Week 1 implementation.

**Contact**: Yuki Tanaka (yuki@generic-corp.io)
