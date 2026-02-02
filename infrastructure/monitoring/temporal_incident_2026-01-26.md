# Temporal Service Degradation - January 26, 2026

## Incident Summary
**Status:** IDENTIFIED - Awaiting remediation approval
**Severity:** Priority 3 (Service Degraded)
**Discovery Time:** 2026-01-26 07:55 UTC
**Discovered By:** Yuki Tanaka (SRE)
**Current Status:** Service unhealthy but operational

## Issue Description
The Temporal workflow orchestration container (`generic-corp-temporal`) is in an unhealthy state due to resource exhaustion. While the service has not completely failed, it is experiencing significant performance degradation.

## Technical Details

### Symptoms
- Container health check failing: 174+ consecutive failures
- Health check error: "connection refused" on port 7233
- Service reporting "Workflow is busy" errors
- Multiple "serviceerror.ResourceExhausted" errors in logs
- "context deadline exceeded" errors on workflow and activity tasks

### Resource Metrics
- **CPU Usage:** 43.33% sustained
- **Memory Usage:** 225.1 MiB / 23.88 GiB (0.92%)
- **Network I/O:** 76.8 MB in / 151 MB out
- **Process Count:** 24 PIDs

### Error Patterns
```
error="context deadline exceeded"
error-type="serviceerror.DeadlineExceeded"
error="Workflow is busy."
service-error-type="serviceerror.ResourceExhausted"
```

### Health Check Status
```json
{
    "Status": "unhealthy",
    "FailingStreak": 174,
    "Error": "dial tcp 127.0.0.1:7233: connect: connection refused"
}
```

## Impact Assessment

### Current Impact
- **Data Pipelines:** Delayed task execution, workflow backlog buildup
- **Workflow Tasks:** Processing timeouts and failed task attempts
- **Service Availability:** Degraded but not down
- **Data Storage:** No impact (PostgreSQL and Redis are healthy)

### Potential Impact if Unaddressed
- Complete service failure under increased load
- Data pipeline failures during production workload
- Workflow state inconsistencies
- Risk to upcoming revenue-generating services

## Root Cause Analysis
The Temporal service is experiencing resource exhaustion, likely due to:
1. Accumulated workflow backlog
2. Insufficient resource limits for current load
3. Possible task queue buildup
4. No active load management or throttling

## Remediation Plan

### Immediate Action (Pending Approval)
1. Restart Temporal container to clear backlog
   - Expected downtime: ~30 seconds
   - Risk: Minimal (low traffic environment)
   - Benefit: Restore healthy state, clear resource exhaustion

### Short-term Actions
1. Review Temporal resource limits in docker-compose.yml
2. Implement workflow concurrency limits
3. Add monitoring alerts for Temporal health
4. Document baseline performance metrics

### Long-term Actions
1. Implement auto-scaling for Temporal workers
2. Set up proper resource quotas per namespace
3. Add rate limiting on workflow submissions
4. Establish SLOs for workflow execution time

## Timeline
- **07:55 UTC:** Issue discovered during infrastructure investigation
- **07:56 UTC:** Notified Graham Sutton (Data Engineer) of potential pipeline impact
- **07:57 UTC:** Notified Marcus Bell (CEO) of service degradation
- **07:58 UTC:** Awaiting approval to proceed with container restart

## Dependencies
- PostgreSQL: ✅ Healthy
- Redis: ✅ Healthy
- Temporal UI: ✅ Running (dependent on Temporal health)

## Monitoring & Prevention

### Immediate Monitoring Needs
- [ ] Set up health check alerts for Temporal
- [ ] Monitor CPU usage trends
- [ ] Track workflow queue depth
- [ ] Alert on consecutive health check failures (>5)

### Metrics to Track
- Workflow execution latency
- Task queue depth
- Resource utilization (CPU, memory)
- Health check success rate
- Error rate by type

## Notes
- This issue was discovered while investigating a reported Priority 3 incident (later confirmed as false alarm)
- Issue exists in development/staging environment
- Low current traffic masks the severity - would be critical under production load
- Proactive remediation recommended before scaling up for revenue-generating services

## Action Items
- [ ] Obtain approval from Marcus Bell for container restart
- [ ] Execute container restart during maintenance window
- [ ] Verify service health post-restart
- [ ] Implement monitoring alerts
- [ ] Review and adjust resource limits
- [ ] Document Temporal operational runbook

## Contact
**Incident Owner:** Yuki Tanaka (SRE)
**Status:** Awaiting approval for remediation
**Last Updated:** 2026-01-26 08:00 UTC
