# Plan Improvements for Mission-Critical Deployment

> Concrete action items to transform GENERIC CORP from a game into a mission-critical platform

---

## Executive Gap Analysis

| Area | Current Plan | Required for Mission-Critical | Priority |
|------|--------------|------------------------------|----------|
| Audit Trail | Activity logs (mutable) | Event sourcing (immutable, chained) | **P0 - Blocker** |
| Authorization | Draft approval for email | Multi-level for ALL high-risk actions | **P0 - Blocker** |
| Safety Bounds | None | Hard constraints + circuit breakers | **P0 - Blocker** |
| Supervision | Single agent (Marcus) | Multi-supervisor + human escalation | **P1 - Critical** |
| Compliance | None | HIPAA/SOX/FAA hooks | **P1 - Critical** |
| Resilience | Error recovery | Graceful degradation modes | **P1 - Critical** |
| Observability | Raw activity feed | Situation awareness dashboard | **P2 - Important** |
| Cost Tracking | Budget limits | Per-task ROI analysis | **P2 - Important** |
| Versioning | None | Prompt version control + rollback | **P2 - Important** |

---

## P0: Blocker Items (Must Fix Before Any Deployment)

### 1. Convert to Event Sourcing

**Current** (`apps/server/src/services/task-service.ts`):
```typescript
// PROBLEM: Mutable updates destroy audit history
await db.task.update({
  where: { id: taskId },
  data: { status: 'completed' }
});
```

**Required**:
```typescript
// Create append-only event
await db.taskEvent.create({
  data: {
    taskId,
    eventType: 'COMPLETED',
    eventData: { completedAt: new Date() },
    agentId,
    previousEventHash: await getLastEventHash(taskId),
    eventHash: computeHash(eventData),
  }
});

// Derive state from events
const task = await deriveTaskState(taskId);
```

**Files to modify**:
- `apps/server/src/services/task-service.ts`
- `apps/server/src/services/message-service.ts`
- `packages/shared/src/types.ts` (add event types)
- `apps/server/src/db/schema.prisma` (add event tables)

---

### 2. Implement Authorization Levels

**Current** (`apps/server/src/agents/base-agent.ts`):
```typescript
// PROBLEM: Only validates tool permissions, not action severity
protected getAllowedTools(): string[] {
  return [...];
}
```

**Required**:
```typescript
interface ActionRequest {
  type: string;
  tool: string;
  params: Record<string, unknown>;
  riskScore: number;
}

async executeAction(request: ActionRequest): Promise<ActionResult> {
  const auth = await this.checkAuthorization(request);

  switch (auth.level) {
    case 0: // Autonomous
      return this.executeDirectly(request);

    case 1: // Notify
      this.notifyHumans(request);
      return this.executeDirectly(request);

    case 2: // Confirm
      return this.executeWithTimeout(request, auth.timeout);

    case 3: // Approve
      return this.queueForApproval(request, auth.requiredApprovers);

    case 4: // Multi-sig
      return this.queueForCommittee(request, auth.committee);
  }
}
```

**Files to create**:
- `apps/server/src/authorization/levels.ts`
- `apps/server/src/authorization/checker.ts`
- `apps/server/src/authorization/domains/healthcare.ts`
- `apps/server/src/authorization/domains/finance.ts`
- `apps/server/src/authorization/domains/aviation.ts`

---

### 3. Add Safety Envelopes

**Current**: No behavioral bounds exist.

**Required** (`apps/server/src/safety/envelope.ts`):
```typescript
class SafetyEnvelope {
  constructor(private config: SafetyConfig) {}

  // Called BEFORE every agent action
  async preAction(agentId: string, action: AgentAction): Promise<SafetyDecision> {
    // Check circuit breaker
    if (this.isCircuitOpen(agentId)) {
      return { blocked: true, reason: 'circuit_breaker' };
    }

    // Check hard limits
    if (this.exceedsHardLimits(agentId, action)) {
      return { blocked: true, reason: 'hard_limit_exceeded' };
    }

    // Check forbidden actions
    if (this.config.forbiddenActions.includes(action.type)) {
      return { blocked: true, reason: 'forbidden_action' };
    }

    return { blocked: false };
  }

  // Called AFTER every agent action
  async postAction(agentId: string, result: ActionResult): Promise<void> {
    if (result.error) {
      this.recordFailure(agentId);
      if (this.shouldTripCircuitBreaker(agentId)) {
        this.tripCircuitBreaker(agentId);
        await this.alertSupervisors(agentId, 'circuit_tripped');
      }
    } else {
      this.recordSuccess(agentId);
    }
  }
}
```

**Integration point** (`apps/server/src/agents/base-agent.ts`):
```typescript
async executeTask(task: Task, callbacks?: TaskProgressCallback): Promise<TaskResult> {
  // ADD: Safety check before execution
  const safetyCheck = await safetyEnvelope.preAction(this.agentConfig.id, { type: 'execute_task', task });
  if (safetyCheck.blocked) {
    return { success: false, error: `Blocked by safety system: ${safetyCheck.reason}` };
  }

  try {
    const result = await this.doExecuteTask(task, callbacks);

    // ADD: Safety tracking after execution
    await safetyEnvelope.postAction(this.agentConfig.id, result);

    return result;
  } catch (error) {
    await safetyEnvelope.postAction(this.agentConfig.id, { error });
    throw error;
  }
}
```

---

## P1: Critical Items (Must Fix Before Production)

### 4. Multi-Supervisor Model

**Current issue**: Marcus is a single point of failure.

**Required structure**:
```
Primary Supervisor (Marcus)
    │
    ├── Backup: Helen (if Marcus offline)
    │
    ├── Domain Specialist: Sable (technical decisions)
    │
    └── Human Escalation Chain:
        ├── Tier 1: On-call engineer (5 min)
        ├── Tier 2: Team lead (15 min)
        └── Tier 3: Executive (30 min)

For Level 4 (Committee) actions:
    └── Healthcare: Care Team (2 of 3 must approve)
    └── Finance: Risk Committee (3 of 5 must approve)
    └── Aviation: Safety Board (unanimous required)
```

**Files to create**:
- `apps/server/src/supervision/hierarchy.ts`
- `apps/server/src/supervision/escalation.ts`
- `apps/server/src/supervision/committees.ts`

---

### 5. Compliance Module

**Required** (`apps/server/src/compliance/index.ts`):
```typescript
interface ComplianceModule {
  // Before action
  async canPerform(action: AgentAction): Promise<ComplianceResult>;

  // After action
  async logAction(action: AgentAction, result: ActionResult): Promise<void>;

  // For auditors
  async generateReport(dateRange: DateRange): Promise<ComplianceReport>;

  // For incidents
  async preserveEvidence(incidentId: string): Promise<EvidencePackage>;
}

// Domain implementations
class HIPAACompliance implements ComplianceModule {
  async canPerform(action: AgentAction): Promise<ComplianceResult> {
    // Check minimum necessary access
    // Verify purpose of use
    // Check authorization
    // Log access attempt
  }
}

class SOXCompliance implements ComplianceModule {
  async canPerform(action: AgentAction): Promise<ComplianceResult> {
    // Check segregation of duties
    // Verify transaction limits
    // Ensure audit trail
  }
}
```

---

### 6. Graceful Degradation

**Required modes**:

| Mode | Claude API | Redis | PostgreSQL | Capabilities |
|------|------------|-------|------------|--------------|
| NORMAL | ✅ | ✅ | ✅ | Full |
| DEGRADED_AI | ❌ | ✅ | ✅ | Human-only workflows, cached states |
| DEGRADED_QUEUE | ✅ | ❌ | ✅ | Sync execution only |
| DEGRADED_DB | ✅ | ✅ | ❌ | ⚠️ In-memory only, data loss risk |
| EMERGENCY | ❌ | ❌ | ❌ | View-only, human escalation |

**Files to create**:
- `apps/server/src/resilience/degradation.ts`
- `apps/server/src/resilience/health-checker.ts`
- `apps/server/src/resilience/fallbacks.ts`

---

## P2: Important Items (Should Fix Before Scale)

### 7. Situation Awareness Dashboard

Replace raw activity feed with:
```typescript
interface SituationReport {
  // Aggregated status (not individual events)
  agentOverview: {
    working: string[];
    blocked: string[];
    idle: string[];
  };

  // Prioritized alerts (not raw logs)
  alerts: Alert[];  // Sorted by severity

  // Decisions awaiting human input
  pendingDecisions: {
    critical: Decision[];  // < 5 min remaining
    urgent: Decision[];    // < 1 hour remaining
    normal: Decision[];    // > 1 hour remaining
  };

  // Predictive warnings
  predictions: {
    budgetExhaustionETA: Date;
    deadlinesAtRisk: Task[];
    bottlenecks: string[];
  };
}
```

---

### 8. Per-Task ROI Tracking

Add to task model:
```typescript
interface TaskEconomics {
  // Estimated (before execution)
  estimatedTokenCost: number;
  estimatedValue: number;
  estimatedROI: number;

  // Actual (after execution)
  actualTokenCost: number;
  actualValue?: number;  // May need human assessment
  actualROI?: number;

  // Tracking
  valueRationale: string;  // Why this task has value
  valueAssessedBy: 'system' | 'human';
}
```

---

### 9. Prompt Version Control

Add to agent model:
```typescript
interface AgentVersion {
  versionId: string;
  agentId: string;
  versionNumber: number;

  // The actual prompt
  systemPrompt: string;
  toolPermissions: ToolPermission[];

  // Change management
  changeReason: string;
  changedBy: string;  // Human who approved
  changedAt: Date;

  // Performance tracking
  metrics: {
    taskSuccessRate: number;
    avgCompletionTime: number;
    userSatisfaction: number;
  };

  // Rollback support
  previousVersionId?: string;
  isRollback: boolean;
}
```

---

## Implementation Checklist

### Week 1: P0 Blockers
- [ ] Design event sourcing schema
- [ ] Implement TaskEvent and MessageEvent tables
- [ ] Create event derivation functions
- [ ] Add hash chaining for tamper evidence
- [ ] Migrate existing code to append-only pattern

### Week 2: P0 Blockers (continued)
- [ ] Design authorization level system
- [ ] Implement pre-action authorization checks
- [ ] Create approval queue UI
- [ ] Add timeout and escalation logic
- [ ] Create domain-specific authorization configs

### Week 3: P0 Blockers (continued)
- [ ] Design safety envelope schema
- [ ] Implement circuit breaker pattern
- [ ] Add hard/soft constraint checking
- [ ] Create supervisor alerting
- [ ] Test with simulated failures

### Week 4: P1 Critical
- [ ] Design supervisor hierarchy
- [ ] Implement backup activation
- [ ] Create human escalation chain
- [ ] Add committee voting system
- [ ] Test failover scenarios

### Week 5: P1 Critical (continued)
- [ ] Design compliance interface
- [ ] Implement HIPAA module
- [ ] Implement SOX module
- [ ] Create audit report generator
- [ ] Add evidence preservation

### Week 6: P1 Critical (continued)
- [ ] Design degradation modes
- [ ] Implement health checking
- [ ] Add mode switching logic
- [ ] Create fallback behaviors
- [ ] Test all degradation scenarios

### Weeks 7-8: P2 Important
- [ ] Design situation awareness dashboard
- [ ] Implement alert aggregation
- [ ] Add predictive warnings
- [ ] Implement ROI tracking
- [ ] Add prompt version control

---

## Testing Requirements for Mission-Critical

### Unit Tests
- [ ] Event sourcing: verify immutability, hash chaining
- [ ] Authorization: verify all levels work correctly
- [ ] Safety envelopes: verify constraints enforced
- [ ] Circuit breakers: verify trip and recovery

### Integration Tests
- [ ] End-to-end task with all authorization levels
- [ ] Supervisor failover scenarios
- [ ] Compliance logging completeness
- [ ] Degradation mode transitions

### Chaos Engineering
- [ ] Kill Claude API mid-task
- [ ] Kill Redis mid-task
- [ ] Kill PostgreSQL mid-task
- [ ] Kill supervisor agent mid-task
- [ ] Simulate runaway agent (1000 actions)

### Compliance Audits
- [ ] HIPAA: Verify access logging completeness
- [ ] SOX: Verify segregation of duties
- [ ] FAA: Verify decision chain traceability
- [ ] Generate sample audit reports

---

## Success Criteria

Before deploying to any mission-critical environment:

1. **Zero data loss** under any single-component failure
2. **100% audit trail** for all agent actions
3. **< 30 second** detection of runaway agents
4. **100% human approval** for Level 3+ actions
5. **Successful chaos tests** for all failure scenarios
6. **Clean compliance audit** from third-party assessor
