# Infrastructure Incident Log

**Maintained by**: Yuki Tanaka, SRE
**Purpose**: Track infrastructure issues, resolutions, and lessons learned

---

## Incident #001: Temporal Container Health Check Failure

**Date**: January 26, 2026, 1:57 PM UTC
**Severity**: Priority 3 (Medium)
**Status**: 🟡 INVESTIGATING
**Reporter**: Yuki Tanaka (via automated monitoring alert to Marcus Bell)

### Summary
Temporal workflow orchestration container is running but marked as "unhealthy" by Docker health checks. The container has been failing health checks for approximately 30 minutes (181 consecutive failures).

### Impact Assessment
- **Current Operations**: ⚠️ MINIMAL IMPACT
  - Container is still running and accepting external connections
  - Temporal UI remains accessible (port 8080)
  - No active workflow execution failures reported
  - PostgreSQL and Redis remain healthy

- **Potential Impact**:
  - Docker may automatically restart container if health checks continue failing
  - Workflow execution reliability could degrade
  - Could indicate deeper configuration or resource issue

### Timeline
- **~13:25 UTC**: Temporal container started (30 minutes before detection)
- **13:25-13:57 UTC**: Health checks continuously failing (181 consecutive failures)
- **13:57 UTC**: Issue detected by Yuki during infrastructure status review
- **13:57 UTC**: Marcus Bell notified via internal message

### Technical Details

**Container Info**:
- Name: `generic-corp-temporal`
- Status: Up 30 minutes (unhealthy)
- Port: 7233 (internal), 8080 (UI)

**Error Message**:
```
failed reaching server: last connection error:
connection error: desc = "transport: Error while dialing:
dial tcp 127.0.0.1:7233: connect: connection refused"
```

**Health Check Configuration**:
- Failing Streak: 181 checks
- Check Interval: ~10-30 seconds (estimated)
- Error: Cannot connect to Temporal's gRPC port 7233 internally

**Related Services**:
- ✅ PostgreSQL: Healthy (Up 15 hours)
- ✅ Redis: Healthy (Up 15 hours)
- ✅ Temporal UI: Running (Up 30 minutes)

### Root Cause Analysis (Preliminary)
**Hypothesis 1** (Most Likely): Health check timing issue
- Temporal takes longer to initialize than health check allows
- Health check starts before Temporal is fully ready
- Solution: Adjust health check `start_period` or `interval`

**Hypothesis 2**: Port binding configuration
- Health check trying to connect to wrong port or interface
- Internal service not binding to 127.0.0.1:7233 correctly
- Solution: Review docker-compose.yml port configuration

**Hypothesis 3**: Resource constraints
- Container not getting enough CPU/memory to start properly
- Deadlock detector triggering (visible in logs)
- Solution: Increase resource limits or investigate performance

### Proposed Resolution

**Step 1: Immediate - Container Restart** (RECOMMENDED)
```bash
docker restart generic-corp-temporal
```
- **Duration**: 2-3 minutes
- **Risk**: Low (workflow state persisted in PostgreSQL)
- **Success Rate**: 90% for transient issues

**Step 2: Configuration Review**
Check `docker-compose.yml` health check settings:
```yaml
healthcheck:
  test: ["CMD", "temporal", "operator", "cluster", "health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s  # May need to increase this
```

**Step 3: Monitoring**
- Monitor for 24 hours after restart
- Set up alerting for future health check failures
- Document actual startup time vs health check timing

### Resolution
**Status**: Awaiting approval from Marcus Bell to restart container

**Next Steps**:
1. [ ] Get approval to restart Temporal
2. [ ] Execute restart: `docker restart generic-corp-temporal`
3. [ ] Monitor startup (2-3 minutes)
4. [ ] Verify health check passes
5. [ ] Monitor stability for 1 hour
6. [ ] Update incident status
7. [ ] Document lessons learned

### Lessons Learned
*(To be completed after resolution)*

### Prevention Measures
- [ ] Review all Docker health check configurations
- [ ] Set up proactive monitoring with BetterStack (Week 1 roadmap item)
- [ ] Implement automated alerting for container health failures
- [ ] Document expected startup times for all services
- [ ] Create runbook for common infrastructure issues

---

## Incident Template

### Incident #XXX: [Title]

**Date**:
**Severity**: Priority 1 (Critical) / Priority 2 (High) / Priority 3 (Medium) / Priority 4 (Low)
**Status**: 🔴 CRITICAL / 🟡 INVESTIGATING / 🟢 RESOLVED
**Reporter**:

### Summary
[Brief description of the issue]

### Impact Assessment
[Who/what is affected and how severely]

### Timeline
[Chronological sequence of events]

### Technical Details
[Technical information about the issue]

### Root Cause Analysis
[What caused the issue]

### Proposed Resolution
[Steps to fix the issue]

### Resolution
[What was actually done to resolve it]

### Lessons Learned
[What we learned from this incident]

### Prevention Measures
[How to prevent this in the future]

---

**Last Updated**: January 26, 2026, 1:57 PM UTC
**Next Review**: After Incident #001 resolution
