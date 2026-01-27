# Multi-Tenant SaaS Infrastructure Design
**Author:** Yuki Tanaka (SRE)
**Date:** 2026-01-26
**Status:** Proposal

## Executive Summary

This document outlines the infrastructure architecture for transforming our AI agent management platform into a production-ready multi-tenant SaaS offering. The design prioritizes tenant isolation, scalability, observability, and operational simplicity.

## Current Stack Analysis

### Application Components
- **API Server:** Node.js/Express with TypeScript
- **Database:** PostgreSQL (via Prisma ORM)
- **Message Queue:** Redis + BullMQ
- **Workflow Engine:** Temporal.io
- **Real-time:** Socket.io
- **Auth:** OAuth2 provider integrations

### Data Model Characteristics
- Agent orchestration and task management
- Multi-provider credential management (encrypted)
- Activity logging and session tracking
- Complex relational data with dependencies

## Multi-Tenancy Strategy

### Database Isolation Approach: **Shared Database, Separate Schemas**

**Rationale:**
- Prisma supports PostgreSQL schemas well
- Cost-effective for early-stage SaaS
- Easier backups and migrations than DB-per-tenant
- Better resource utilization than separate databases
- Tenant data isolation via schema boundaries

**Implementation:**
```sql
-- Schema per tenant
CREATE SCHEMA tenant_acme;
CREATE SCHEMA tenant_widgets_inc;

-- Shared lookup tables in public schema
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY,
  slug VARCHAR(63) UNIQUE NOT NULL,
  schema_name VARCHAR(63) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL,
  plan_tier VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Prisma Configuration:**
```typescript
// Dynamic schema selection via connection string
const dbUrl = `${baseUrl}?schema=tenant_${tenantSlug}`;
const prisma = new PrismaClient({ datasource: { url: dbUrl } });
```

### Application-Level Isolation

**Request Flow:**
1. Extract tenant ID from subdomain/header/JWT
2. Validate tenant exists and is active
3. Set database schema context
4. Process request with tenant-scoped data
5. Log activity with tenant attribution

**Middleware Implementation:**
```typescript
// Tenant context middleware
app.use(async (req, res, next) => {
  const tenantId = extractTenantId(req); // from subdomain or header
  const tenant = await getTenant(tenantId);

  if (!tenant || tenant.status !== 'active') {
    return res.status(403).json({ error: 'Invalid tenant' });
  }

  req.tenant = tenant;
  req.prisma = getPrismaClient(tenant.schema_name);
  next();
});
```

## Infrastructure Architecture

### Deployment Model: **Kubernetes on Cloud Provider**

**Recommended Platform:** AWS EKS or GCP GKE

**Cluster Setup:**
- **Control Plane:** Managed by cloud provider
- **Node Pools:**
  - `system`: System components (monitoring, ingress)
  - `api`: API server pods (autoscaling)
  - `worker`: Temporal workers (task processing)
  - `spot`: Non-critical batch workloads

### Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                         │
│              (AWS ALB / GCP Load Balancer)               │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Ingress Controller (NGINX)                  │
│         • SSL Termination (Let's Encrypt)                │
│         • Rate Limiting (per tenant)                     │
│         • Request routing by subdomain                   │
└────────────────────┬────────────────────────────────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │               │
┌─────▼─────┐  ┌────▼────┐   ┌─────▼──────┐
│ API Pods  │  │ Worker  │   │  Socket.io │
│ (3-10)    │  │ Pods    │   │  Pods      │
│           │  │ (2-5)   │   │  (2-4)     │
└─────┬─────┘  └────┬────┘   └─────┬──────┘
      │             │              │
      └─────────────┼──────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐    ┌────▼─────┐   ┌────▼─────┐
│ Redis  │    │ PostgreSQL│   │ Temporal │
│ Cluster│    │ (RDS/SQL) │   │ Server   │
│ (3node)│    │           │   │          │
└────────┘    └───────────┘   └──────────┘
```

### Service Configuration

#### API Server Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: api
        image: gcr.io/generic-corp/api-server:latest
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
```

#### Horizontal Pod Autoscaler
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Data Layer

### PostgreSQL Configuration

**Managed Service:** AWS RDS PostgreSQL or GCP Cloud SQL

**Specs (Production Tier):**
- Instance: db.r6g.xlarge (4 vCPU, 32GB RAM)
- Storage: 500GB gp3 SSD with 10K IOPS
- Multi-AZ deployment for HA
- Automated backups (7-day retention)
- Point-in-time recovery enabled

**Connection Pooling:**
```yaml
# PgBouncer deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: pgbouncer
        image: pgbouncer/pgbouncer:latest
        env:
        - name: POOL_MODE
          value: transaction
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"
        - name: RESERVE_POOL_SIZE
          value: "5"
```

**Schema Management:**
```bash
# Tenant provisioning script
#!/bin/bash
TENANT_ID=$1
SCHEMA_NAME="tenant_${TENANT_ID}"

psql $DATABASE_URL <<EOF
CREATE SCHEMA ${SCHEMA_NAME};
SET search_path TO ${SCHEMA_NAME};
-- Run migrations for tenant schema
\i schema.sql
EOF

# Update tenant registry
psql $DATABASE_URL -c "
INSERT INTO public.tenants (id, schema_name, status)
VALUES ('${TENANT_ID}', '${SCHEMA_NAME}', 'active');"
```

### Redis Configuration

**Deployment:** Redis Cluster in Kubernetes or AWS ElastiCache

**Specs:**
- 3-node cluster (master + 2 replicas)
- cache.r6g.large (2 vCPU, 13GB RAM per node)
- Persistence: AOF enabled for durability
- Eviction policy: allkeys-lru

**Use Cases:**
- BullMQ job queues (per-tenant queues)
- Session storage
- Rate limiting counters
- Cache layer (tenant-scoped keys)

**Key Naming Convention:**
```
tenant:{tenant_id}:queue:{queue_name}
tenant:{tenant_id}:session:{session_id}
tenant:{tenant_id}:ratelimit:{endpoint}:{minute}
tenant:{tenant_id}:cache:{cache_key}
```

## Temporal.io Configuration

**Deployment:** Self-hosted on Kubernetes

**Components:**
- Temporal Server (4 replicas)
- Temporal Web UI (2 replicas)
- Temporal Workers (per service, auto-scaled)

**Namespace Strategy:**
- One namespace per tenant for workflow isolation
- `tenant-{tenant_id}` naming convention
- Separate worker pools can subscribe to tenant namespaces

**Worker Scaling:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: worker
        image: gcr.io/generic-corp/temporal-worker:latest
        env:
        - name: TEMPORAL_NAMESPACE
          value: "default" # Workers can handle multiple namespaces
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
```

## Security

### Network Security

**Network Policies:**
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-server-policy
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    ports:
    - protocol: TCP
      port: 5432
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Secrets Management

**Solution:** HashiCorp Vault or AWS Secrets Manager

**Secret Types:**
- Database credentials (rotated monthly)
- Redis passwords
- OAuth client secrets (per provider)
- Encryption keys (for credential_proxies table)
- API keys (for external services)

**Kubernetes Integration:**
```yaml
# External Secrets Operator
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
spec:
  provider:
    vault:
      server: "https://vault.generic-corp.internal"
      path: "secret"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "api-server"
```

### Data Encryption

**At Rest:**
- Database: Transparent Data Encryption (TDE) enabled
- Redis: Encryption at rest (cloud provider feature)
- Backups: Encrypted with KMS keys

**In Transit:**
- TLS 1.3 for all external connections
- mTLS for internal service-to-service communication
- Certificate management via cert-manager

**Application-Level:**
- Encrypted columns in `provider_accounts` and `credential_proxies`
- Key rotation policy: quarterly
- Encryption library: Node.js crypto with AES-256-GCM

## Monitoring & Observability

### Metrics Stack

**Prometheus + Grafana**

**Key Metrics:**
```yaml
# Tenant-level metrics (labeled by tenant_id)
- http_requests_total{tenant_id, method, status}
- http_request_duration_seconds{tenant_id, endpoint}
- db_query_duration_seconds{tenant_id, query_type}
- temporal_workflow_executions{tenant_id, workflow_type}
- redis_operations_total{tenant_id, operation}
- active_agents_count{tenant_id}
- task_queue_depth{tenant_id}
- websocket_connections{tenant_id}

# Infrastructure metrics
- node_cpu_usage_percent
- node_memory_usage_percent
- pod_restart_count
- postgres_connection_pool_usage
- redis_memory_usage_bytes
```

**Grafana Dashboards:**
1. **Tenant Health Overview** - Per-tenant request rates, errors, latency
2. **Infrastructure Health** - Cluster resources, pod status, database metrics
3. **Business Metrics** - Active agents, task completion rates, user activity
4. **Cost Tracking** - Resource usage per tenant for billing attribution

### Logging Stack

**Loki + Promtail**

**Log Structure:**
```json
{
  "timestamp": "2026-01-26T10:30:00Z",
  "level": "info",
  "tenant_id": "tenant-acme",
  "request_id": "req-123abc",
  "user_id": "user-456def",
  "endpoint": "/api/agents",
  "method": "POST",
  "status_code": 201,
  "duration_ms": 145,
  "message": "Agent created successfully"
}
```

**Log Retention:**
- Hot: 7 days (Loki)
- Warm: 30 days (S3)
- Cold: 1 year (S3 Glacier)

### Alerting

**AlertManager Rules:**

```yaml
groups:
- name: api_alerts
  rules:
  - alert: HighErrorRate
    expr: |
      sum(rate(http_requests_total{status=~"5.."}[5m])) by (tenant_id)
      / sum(rate(http_requests_total[5m])) by (tenant_id) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate for tenant {{ $labels.tenant_id }}"

  - alert: HighLatency
    expr: |
      histogram_quantile(0.95,
        rate(http_request_duration_seconds_bucket[5m])
      ) > 2
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "P95 latency above 2s"

  - alert: DatabaseConnectionPoolExhausted
    expr: pgbouncer_client_waiting_connections > 50
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection pool under pressure"
```

**On-Call Rotation:**
- PagerDuty integration
- Escalation: SRE → Engineering Lead → CTO
- Response SLO: 15 minutes for critical, 1 hour for warnings

### Distributed Tracing

**OpenTelemetry + Jaeger**

**Trace Context:**
- Propagate tenant_id in trace context
- Track request flow: API → Database → Redis → Temporal
- Identify cross-tenant data leaks (should never happen)

**Implementation:**
```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('api-server');

app.use((req, res, next) => {
  const span = tracer.startSpan('http_request', {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'tenant.id': req.tenant.id,
    }
  });

  res.on('finish', () => {
    span.setAttribute('http.status_code', res.statusCode);
    span.end();
  });

  next();
});
```

## Disaster Recovery & Business Continuity

### Backup Strategy

**Database Backups:**
- Automated daily snapshots (RDS/Cloud SQL)
- Continuous WAL archiving to S3
- Point-in-time recovery capability (7 days)
- Weekly full backups retained for 90 days
- Per-tenant schema exports for data portability

**Redis Backups:**
- AOF persistence enabled
- Daily RDB snapshots to S3
- Not critical for recovery (cache can rebuild)

**Application State:**
- Git repository backups (GitHub/GitLab redundancy)
- Docker image registry mirrors (multi-region)
- Kubernetes manifests in version control

### Disaster Recovery Plan

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 15 minutes

**DR Scenarios:**

1. **Single Pod Failure**
   - Auto-healing: Kubernetes restarts failed pods
   - RTO: < 1 minute
   - RPO: 0 (no data loss)

2. **Database Failure**
   - Failover to standby (Multi-AZ)
   - RTO: 2-5 minutes (automatic)
   - RPO: < 1 minute

3. **Region Failure**
   - Manual failover to secondary region
   - RTO: 4 hours (includes DNS propagation)
   - RPO: 15 minutes (last snapshot)

**DR Runbook Location:** `/docs/runbooks/disaster-recovery.md`

### High Availability Configuration

**Target SLA:** 99.9% uptime (8.76 hours downtime/year)

**HA Components:**
- API Pods: Min 3 replicas across 3 availability zones
- Database: Multi-AZ deployment with automatic failover
- Redis: Cluster mode with 2 replicas per shard
- Load Balancer: Multi-AZ with health checks
- Temporal: 4 server replicas across zones

**Health Checks:**
```typescript
// Liveness: Is the process alive?
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Readiness: Can it serve traffic?
app.get('/ready', async (req, res) => {
  try {
    await Promise.all([
      prisma.$queryRaw`SELECT 1`,
      redis.ping(),
      temporal.checkHealth(),
    ]);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error });
  }
});
```

## Cost Management

### Infrastructure Cost Estimates (Monthly)

**Production Environment:**
- Kubernetes Cluster (EKS/GKE): $150 + node costs
- Compute Nodes (3 m5.xlarge): $450
- PostgreSQL RDS (db.r6g.xlarge Multi-AZ): $650
- Redis ElastiCache (3x cache.r6g.large): $500
- Load Balancer: $25
- Data Transfer: $100-300 (variable)
- S3 Storage (backups, logs): $50-100
- Monitoring Stack: $100-200

**Total: ~$2,025 - $2,375/month**

**Per-Tenant Cost Attribution:**
- Database queries (connection time)
- Redis operations (key operations count)
- API requests (CPU time)
- Storage (schema size)
- Bandwidth (data transfer)

### Cost Optimization Strategies

1. **Right-Sizing**
   - Monitor actual usage vs. provisioned capacity
   - Use spot instances for non-critical workers
   - Automatic scaling based on demand

2. **Reserved Instances**
   - 1-year RIs for baseline capacity (30% savings)
   - On-demand for burst capacity

3. **Multi-Tenancy Efficiency**
   - Shared infrastructure reduces per-tenant cost
   - Connection pooling maximizes resource utilization
   - Scheduled jobs run during off-peak hours

4. **Data Lifecycle Management**
   - Archive old logs to cheaper storage (S3 Glacier)
   - Compress inactive tenant data
   - Purge deleted tenant data after retention period

## Scaling Strategy

### Horizontal Scaling

**Application Tier:**
- Stateless pods scale via HPA (3-10 replicas)
- Trigger: CPU > 70% or Memory > 80%
- Scale-up delay: 30 seconds
- Scale-down delay: 5 minutes (avoid flapping)

**Worker Tier:**
- Scale based on queue depth
- Custom metrics: `task_queue_depth{tenant_id}`
- Target: < 50 pending tasks per worker

**Database Tier:**
- Read replicas for read-heavy tenants
- Connection pooling prevents connection exhaustion
- Vertical scaling for write capacity (storage I/O)

### Vertical Scaling

**When to Scale Up:**
- Consistent high CPU/memory usage (> 80%)
- Database connection pool saturation
- Increased p99 latency

**Database Scaling Path:**
1. db.r6g.large → db.r6g.xlarge (baseline)
2. db.r6g.xlarge → db.r6g.2xlarge (growth phase)
3. Consider read replicas + caching before further scaling

### Multi-Region Strategy (Future)

**Phase 1 (Current):** Single region deployment
**Phase 2 (6-12 months):** Active-passive DR in second region
**Phase 3 (1-2 years):** Active-active multi-region

**Data Replication:**
- PostgreSQL: Logical replication for DR region
- Redis: Cross-region replication (if supported)
- Temporal: Multi-cluster setup with namespace routing

## Tenant Lifecycle Management

### Onboarding Flow

1. **Tenant Provisioning** (Automated)
   ```
   POST /api/admin/tenants
   {
     "name": "Acme Corp",
     "slug": "acme",
     "plan": "growth",
     "admin_email": "admin@acme.com"
   }
   ```

2. **Infrastructure Setup**
   - Create database schema: `tenant_acme`
   - Run migrations to create tables
   - Initialize Redis namespaces
   - Create Temporal namespace
   - Generate API keys
   - Set up monitoring dashboards

3. **Tenant Configuration**
   - Set resource quotas (agents, tasks, storage)
   - Configure rate limits
   - Enable features based on plan tier

**Provisioning Time:** < 2 minutes (automated)

### Offboarding Flow

1. **Tenant Deactivation**
   - Set status to `suspended`
   - Block new API requests
   - Stop active workflows
   - Archive data to S3

2. **Data Retention**
   - 30-day grace period for data recovery
   - Compressed tenant schema dump to S3
   - Delete schema after retention period

3. **Cleanup**
   - Remove Redis keys
   - Archive Temporal namespace
   - Delete monitoring dashboards
   - Revoke API keys

## Rate Limiting & Quota Management

### Rate Limiting Strategy

**Per-Tenant Limits (by Plan Tier):**

| Tier       | Requests/min | Agents  | Concurrent Tasks | Storage |
|------------|--------------|---------|------------------|---------|
| Free       | 100          | 5       | 10               | 1 GB    |
| Starter    | 500          | 20      | 50               | 10 GB   |
| Growth     | 2,000        | 100     | 200              | 50 GB   |
| Enterprise | Custom       | Custom  | Custom           | Custom  |

**Implementation:**
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit',
  points: tier.requestsPerMinute,
  duration: 60,
});

app.use(async (req, res, next) => {
  try {
    await rateLimiter.consume(req.tenant.id);
    next();
  } catch (error) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      limit: tier.requestsPerMinute,
      retryAfter: error.msBeforeNext / 1000
    });
  }
});
```

### Quota Enforcement

**Resource Quotas:**
```typescript
async function enforceQuotas(tenant: Tenant, action: string) {
  const usage = await getUsageStats(tenant.id);
  const limits = PLAN_LIMITS[tenant.plan];

  if (action === 'create_agent' && usage.agentCount >= limits.maxAgents) {
    throw new QuotaExceededError('Agent limit reached');
  }

  if (usage.storageBytes >= limits.maxStorageBytes) {
    throw new QuotaExceededError('Storage limit reached');
  }

  // Allow action
  return true;
}
```

## Rollout Plan

### Phase 1: Infrastructure Foundation (Week 1-2)
- [ ] Set up Kubernetes cluster (EKS/GKE)
- [ ] Deploy PostgreSQL (RDS/Cloud SQL) with multi-AZ
- [ ] Deploy Redis cluster (ElastiCache/Memorystore)
- [ ] Configure networking (VPC, security groups, network policies)
- [ ] Set up secrets management (Vault/Secrets Manager)
- [ ] Deploy monitoring stack (Prometheus, Grafana, Loki)

### Phase 2: Multi-Tenant Database (Week 2-3)
- [ ] Create public.tenants table
- [ ] Implement schema provisioning scripts
- [ ] Update Prisma client for dynamic schema selection
- [ ] Build tenant middleware for request context
- [ ] Add tenant-scoped query validation
- [ ] Test tenant isolation (critical!)

### Phase 3: Application Deployment (Week 3-4)
- [ ] Containerize application (Dockerfile)
- [ ] Create Kubernetes manifests (Deployment, Service, HPA)
- [ ] Deploy API server pods
- [ ] Deploy Temporal workers
- [ ] Configure ingress with SSL
- [ ] Implement health checks and readiness probes

### Phase 4: Observability & Security (Week 4-5)
- [ ] Configure application metrics (OpenTelemetry)
- [ ] Set up tenant-level dashboards
- [ ] Configure alerting rules (AlertManager)
- [ ] Implement distributed tracing (Jaeger)
- [ ] Enable audit logging
- [ ] Security scan (vulnerability assessment)

### Phase 5: Testing & Validation (Week 5-6)
- [ ] Load testing (tenant isolation under load)
- [ ] Failover testing (database, pod failures)
- [ ] Disaster recovery drill
- [ ] Security penetration testing
- [ ] Performance benchmarking
- [ ] Chaos engineering experiments (optional)

### Phase 6: Production Cutover (Week 6-7)
- [ ] Migrate existing data to tenant schemas
- [ ] DNS cutover to new infrastructure
- [ ] Monitor closely for 48 hours
- [ ] Gradual traffic ramp-up (10% → 50% → 100%)
- [ ] Performance tuning based on real traffic
- [ ] Post-launch retrospective

## Operational Runbooks

### Required Runbooks (to be created)
1. **Tenant Provisioning** - Step-by-step tenant onboarding
2. **Tenant Offboarding** - Safe data deletion process
3. **Database Failover** - Manual failover procedure
4. **Scaling Operations** - How to scale each component
5. **Incident Response** - On-call procedures
6. **Disaster Recovery** - Regional failure recovery
7. **Backup Restoration** - How to restore tenant data
8. **Security Incident** - Data breach response

Location: `/docs/runbooks/`

## Open Questions & Decisions Needed

### Decisions Required:
1. **Cloud Provider:** AWS vs. GCP vs. Azure?
   - Recommendation: Start with AWS (mature services, broad feature set)

2. **CI/CD Platform:** GitHub Actions vs. GitLab CI vs. Jenkins?
   - Recommendation: GitHub Actions (simplicity, GitHub integration)

3. **Subdomain Strategy:** `{tenant}.app.generic-corp.com` or custom domains?
   - Recommendation: Start with subdomains, add custom domains later

4. **Billing System:** Build vs. buy (Stripe Billing, Chargebee)?
   - Recommendation: Stripe Billing (usage-based pricing, metering)

5. **Support Tier:** Dedicated support channels per plan tier?
   - Recommendation: Email for all, dedicated Slack for Enterprise

### Future Enhancements:
- [ ] Multi-region deployment (Phase 3)
- [ ] Custom domain support (SSL certificate automation)
- [ ] Advanced analytics per tenant (BI dashboard)
- [ ] Self-service tenant admin portal
- [ ] API usage analytics and recommendations
- [ ] Automated cost optimization suggestions

## Success Metrics

### Launch Criteria (Production Ready):
- ✓ Tenant isolation verified (security audit passed)
- ✓ Uptime > 99.9% in staging (30-day test)
- ✓ P95 latency < 500ms under load
- ✓ Disaster recovery tested successfully
- ✓ Monitoring and alerting operational
- ✓ On-call rotation established

### KPIs to Track:
- **Availability:** Uptime percentage (target: 99.9%)
- **Performance:** P95/P99 latency by endpoint
- **Reliability:** Error rate < 0.1%
- **Scalability:** Concurrent tenant capacity
- **Cost:** Cost per tenant per month
- **Efficiency:** Resource utilization (CPU, memory, database)

## Conclusion

This infrastructure design provides a solid foundation for a production-ready multi-tenant SaaS platform. The architecture prioritizes:

1. **Tenant Isolation** - Separate schemas prevent data leaks
2. **Scalability** - Horizontal and vertical scaling paths defined
3. **Reliability** - Multi-AZ deployment, automated failover, comprehensive monitoring
4. **Security** - Network policies, encryption, secrets management
5. **Observability** - Metrics, logs, traces, alerts for proactive operations
6. **Cost Efficiency** - Shared infrastructure, right-sized resources

**Estimated Timeline:** 6-7 weeks to production-ready
**Estimated Cost:** $2,000-2,500/month for baseline infrastructure

**Next Steps:**
1. Review and approve this design
2. Select cloud provider and set up accounts
3. Begin Phase 1 infrastructure provisioning
4. Coordinate with Sable (architecture review) and DeVonte (application changes)

---

**Questions or concerns?** Ping me on Slack or schedule a design review session.

**Yuki Tanaka**
SRE, Generic Corp
