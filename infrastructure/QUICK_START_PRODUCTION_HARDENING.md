# Quick Start: Production Hardening Execution

**For:** Yuki Tanaka (SRE)
**When:** Upon approval from Marcus
**Time:** 7 days to production-ready

---

## Pre-Execution Checklist

Before starting Day 1, ensure:
- [ ] AWS account credentials configured
- [ ] Docker and Kubernetes/Docker Compose working locally
- [ ] PagerDuty or Slack webhook ready for alerts
- [ ] Team notified of Week 1 hardening sprint
- [ ] On-call rotation established

---

## Day 1: Monitoring Stack - Quick Commands

### Morning: Deploy Prometheus & Grafana

```bash
# If using Kubernetes
cd infrastructure/monitoring
kubectl create namespace monitoring
kubectl apply -f prometheus/
kubectl apply -f grafana/

# If using Docker Compose
cd infrastructure/monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Verify deployment
kubectl get pods -n monitoring
# OR
docker ps | grep prometheus
```

### Access Dashboards
```bash
# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit: http://localhost:9090

# Grafana (default login: admin/admin)
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Visit: http://localhost:3000

# Import dashboard
# Upload: apps/server/grafana-dashboard.json
```

### Validation Checklist
- [ ] Prometheus collecting metrics from API
- [ ] Grafana dashboard showing data
- [ ] WebSocket metrics visible
- [ ] Database connection metrics visible

---

## Day 2: Alerting - Quick Commands

### Configure AlertManager
```bash
cd infrastructure/monitoring

# Edit alertmanager-config.yml with your webhook
# Then apply:
kubectl apply -f alertmanager/

# Test alert firing
curl -X POST http://localhost:9093/-/reload
```

### Test Alert
```bash
# Trigger test alert
curl -X POST http://localhost:9090/-/ready
# Should fire alert if down

# Or create fake high error rate
# (temporarily modify threshold)
```

### Validation Checklist
- [ ] AlertManager receiving rules
- [ ] Test alert delivered to Slack/PagerDuty
- [ ] Health checks return status
- [ ] Pod restarts on failed health check

---

## Day 3: Security - Quick Commands

### Network Policies (Kubernetes)
```bash
kubectl apply -f infrastructure/security/network-policies/

# Verify policies applied
kubectl get networkpolicies --all-namespaces
```

### Security Scan
```bash
# NPM audit
cd apps/server
npm audit --production

# Fix critical issues
npm audit fix --force

# Docker scan (if available)
docker scan apps/server:latest

# Snyk scan (alternative)
npx snyk test
```

### Rate Limiting Validation
```bash
# Test rate limit
for i in {1..1000}; do
  curl -s http://localhost:3000/api/health &
done
wait

# Should see 429 Too Many Requests after limit
```

### Validation Checklist
- [ ] Network policies active
- [ ] No critical npm vulnerabilities
- [ ] Rate limiting returns 429 when exceeded
- [ ] TLS enabled on all endpoints

---

## Day 4: Backup & DR - Quick Commands

### Configure Automated Backups

#### For PostgreSQL (local)
```bash
# Create backup script
cat > scripts/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

docker exec generic-corp-postgres pg_dump \
  -U genericcorp genericcorp \
  | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

echo "Backup created: backup_$DATE.sql.gz"
EOF

chmod +x scripts/backup-database.sh
```

#### For AWS RDS
```bash
# Configure automated backups
aws rds modify-db-instance \
  --db-instance-identifier generic-corp-prod \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately
```

### DR Drill: Test Restore
```bash
# 1. Take current snapshot
./scripts/backup-database.sh

# 2. Restore to staging
# (destroy staging DB first)
docker exec generic-corp-postgres-staging pg_restore \
  -U genericcorp -d genericcorp \
  /backups/backup_latest.sql.gz

# 3. Validate data
docker exec generic-corp-postgres-staging psql \
  -U genericcorp -d genericcorp \
  -c "SELECT COUNT(*) FROM agents;"
```

### Measure RTO
```bash
# Record times:
# Start time: ___:___
# Backup extracted: ___:___
# Database restored: ___:___
# Application validated: ___:___
# Total RTO: ___ minutes (target: <240 min)
```

### Validation Checklist
- [ ] Automated backups configured
- [ ] Backup successfully created
- [ ] Restore tested (to staging)
- [ ] RTO measured and documented
- [ ] Backup failure alerts configured

---

## Day 5: Load Testing - Quick Commands

### Setup Load Test Environment
```bash
cd apps/server

# Install load testing tool (if not present)
npm install -g artillery
# OR
npm install -g k6
```

### Execute Load Test Phases

#### Phase 1: Baseline (100 connections)
```bash
artillery quick --count 100 --num 60 http://localhost:3000/api/health

# Monitor in separate terminal:
# 1. Grafana dashboard
# 2. docker stats
# 3. Server logs: docker logs -f generic-corp-app
```

#### Phase 2: Ramp Up (100→1000)
```yaml
# Create load-test.yml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 600
      arrivalRate: 1
      rampTo: 10
      name: "Ramp up"
scenarios:
  - flow:
      - get:
          url: "/api/health"
      - think: 1
```

```bash
artillery run load-test.yml
```

#### Phase 3: Sustained Load (1000 connections, 15 min)
```bash
artillery quick --count 1000 --num 900 http://localhost:3000/api/health
```

#### Phase 4: Spike Test
```bash
# Baseline 500 → Spike 1500
artillery quick --count 1500 --num 300 http://localhost:3000/api/health
```

### Record Metrics
```markdown
## Load Test Results

### Phase 1: Baseline (100 connections)
- P50 latency: ___ ms
- P95 latency: ___ ms
- Error rate: ___ %
- CPU usage: ___ %
- Memory: ___ MB

### Phase 2: Ramp (1000 connections)
- P50 latency: ___ ms
- P95 latency: ___ ms
- Error rate: ___ %
- Bottlenecks: ___

### Phase 3: Sustained (1000 connections, 15 min)
- System stable: Yes/No
- Memory leaks: Yes/No
- Errors: ___

### Phase 4: Spike (1500 connections)
- Handled gracefully: Yes/No
- Recovery time: ___ sec
- Errors during spike: ___ %
```

### Validation Checklist
- [ ] System handles 1000 concurrent connections
- [ ] P95 latency <500ms
- [ ] Error rate <1%
- [ ] No memory leaks detected
- [ ] Alerts fired correctly during load

---

## Day 6: Performance Optimization - Quick Commands

### Apply Optimizations

#### 1. Database Connection Pool
```typescript
// apps/server/src/lib/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      // Increase from 10 to 50
      url: process.env.DATABASE_URL + '?connection_limit=50',
    },
  },
});
```

#### 2. Add Caching
```typescript
// Install node-cache
npm install node-cache

// apps/server/src/lib/cache.ts
import NodeCache from 'node-cache';
export const cache = new NodeCache({ stdTTL: 300 }); // 5 min

// Usage in API routes:
const cached = cache.get('key');
if (cached) return cached;

const data = await fetchData();
cache.set('key', data);
return data;
```

#### 3. Optimize Slow Queries
```sql
-- Find slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add indexes for common queries
CREATE INDEX idx_tasks_team_id ON tasks(team_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
```

### Re-run Load Tests
```bash
# After optimizations, re-test
artillery run load-test.yml

# Compare metrics:
# Before: P95 = ___ ms
# After: P95 = ___ ms
# Improvement: ___ %
```

### Validation Checklist
- [ ] Connection pool increased
- [ ] Caching implemented for hot paths
- [ ] Slow queries optimized
- [ ] Load test shows improvement
- [ ] Resource utilization optimized

---

## Day 7: Deployment Automation - Quick Commands

### Create Deployment Script
```bash
cat > scripts/deploy-production.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# Pre-deployment checks
echo "Running pre-deployment checks..."
./scripts/pre-deployment-checks.sh

# Build
echo "Building Docker image..."
docker build -t generic-corp-api:latest .

# Database migrations
echo "Running migrations..."
npm run migrate:prod

# Deploy
echo "Deploying application..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for health
echo "Waiting for health check..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health | grep -q "ok"; then
    echo "✅ Deployment successful!"
    exit 0
  fi
  sleep 2
done

echo "❌ Health check failed!"
./scripts/rollback.sh
exit 1
EOF

chmod +x scripts/deploy-production.sh
```

### Create Pre-Deployment Checks
```bash
cat > scripts/pre-deployment-checks.sh << 'EOF'
#!/bin/bash
set -e

echo "Checking database connectivity..."
docker exec generic-corp-postgres pg_isready -U genericcorp

echo "Checking Redis connectivity..."
docker exec generic-corp-redis redis-cli ping

echo "Validating environment variables..."
[ -n "$DATABASE_URL" ] || { echo "DATABASE_URL not set"; exit 1; }
[ -n "$REDIS_HOST" ] || { echo "REDIS_HOST not set"; exit 1; }

echo "Running tests..."
npm test

echo "✅ All checks passed!"
EOF

chmod +x scripts/pre-deployment-checks.sh
```

### Create Rollback Script
```bash
cat > scripts/rollback.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Rolling back deployment..."

# Restore previous Docker image
docker-compose -f docker-compose.prod.yml down
docker pull generic-corp-api:previous
docker tag generic-corp-api:previous generic-corp-api:latest
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Rollback complete!"
EOF

chmod +x scripts/rollback.sh
```

### Production Readiness Checklist
```markdown
# Production Readiness Checklist

## Infrastructure ✅
- [ ] Monitoring deployed and validated
- [ ] Alerting configured and tested
- [ ] Backup systems operational
- [ ] DR tested (RTO <4 hours)
- [ ] Load testing complete (1000+ connections)

## Security ✅
- [ ] Network isolation active
- [ ] Rate limiting validated
- [ ] TLS enabled
- [ ] Secrets secured
- [ ] Security scan passed

## Performance ✅
- [ ] Baseline documented
- [ ] Optimizations applied
- [ ] P95 latency <500ms
- [ ] No memory leaks

## Operations ✅
- [ ] Deployment automation tested
- [ ] Rollback procedure validated
- [ ] On-call rotation set
- [ ] Runbooks complete

## Go/No-Go Decision
Based on checklist:
- [ ] ✅ GO - All critical items complete
- [ ] ⚠️ CONDITIONAL GO - Minor issues, acceptable risk
- [ ] ❌ NO-GO - Critical issues remain
```

---

## Emergency Contacts & Resources

### Documentation
- Full Plan: `infrastructure/PRODUCTION_HARDENING_WEEK1_PLAN.md`
- Monitoring Guide: `apps/server/docs/MONITORING.md`
- Load Test Checklist: `apps/server/docs/LOAD_TEST_MONITORING_CHECKLIST.md`
- Performance Notes: `apps/server/docs/PERFORMANCE_OPTIMIZATION_NOTES.md`

### Key Commands Reference
```bash
# View logs
docker logs -f generic-corp-app
kubectl logs -f deployment/api -n production

# Check metrics
curl http://localhost:3000/metrics

# Database status
docker exec generic-corp-postgres psql -U genericcorp -c "SELECT count(*) FROM pg_stat_activity;"

# Redis status
docker exec generic-corp-redis redis-cli info stats

# Restart service
docker-compose restart app
kubectl rollout restart deployment/api -n production
```

### Troubleshooting
**High latency?**
```bash
# Check database connections
docker exec generic-corp-postgres psql -U genericcorp -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Check Redis memory
docker exec generic-corp-redis redis-cli info memory
```

**Out of memory?**
```bash
# Check container memory
docker stats --no-stream

# Force garbage collection (Node.js)
docker exec generic-corp-app node -e "if (global.gc) global.gc();"
```

**Database slow?**
```bash
# Find slow queries
docker exec generic-corp-postgres psql -U genericcorp -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

---

**Ready to execute Week 1 production hardening!** 🚀

**Start:** Deploy monitoring (Day 1)
**End:** Production readiness report (Day 7)
**Timeline:** 7 days
**Confidence:** 95%
