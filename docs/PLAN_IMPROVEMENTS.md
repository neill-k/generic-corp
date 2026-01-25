# Plan Improvements

> Concrete changes to make GENERIC CORP fully autonomous with reliable output.

---

## Current Plan Strengths

Your plan already gets a lot right:
- ✅ BullMQ for task orchestration (simpler than Temporal)
- ✅ WebSocket for real-time updates
- ✅ PostgreSQL + Redis for persistence
- ✅ Role-based tool access
- ✅ Agent personalities with distinct capabilities

---

## Gap 1: Flat Org Structure

**Current**: All 10 agents report to Marcus, who does everything.

**Problem**: Marcus becomes a bottleneck. No parallel execution. No domain expertise.

**Fix**: Three-tier hierarchy.

```
Marcus (Orchestrator)
├── Sable (Tech Lead) → DeVonte, Miranda, Yuki
├── Graham (Data Lead) → spawns workers
├── Walter (Biz Lead) → Frankie, Kenji
└── Helen (Operations)
```

**Changes needed**:

1. **Update agent config** (`apps/server/src/config/agents.ts`):
```typescript
export const agentHierarchy = {
  marcus: {
    role: 'orchestrator',
    canAssignTo: ['sable', 'graham', 'walter', 'helen'],
    cannotExecute: true,  // Marcus routes, doesn't do work
  },
  sable: {
    role: 'lead',
    domain: 'technical',
    canAssignTo: ['devonte', 'miranda', 'yuki'],
    reportsTo: 'marcus',
  },
  devonte: {
    role: 'worker',
    domain: 'technical',
    canAssignTo: [],  // Workers don't delegate
    reportsTo: 'sable',
  },
  // ... etc
};
```

2. **Update task routing** (`apps/server/src/services/task-service.ts`):
```typescript
async function routeTask(task: Task) {
  // Marcus determines domain
  const domain = await marcus.classifyTask(task);

  // Route to appropriate lead
  const lead = getLeadForDomain(domain);
  await assignTask(task, lead);

  // Lead decides how to execute (may parallelize)
}
```

---

## Gap 2: No Automated Verification

**Current**: Task marked complete when agent says so.

**Problem**: Gas Town showed agents misreport completion. Code merged with failing tests.

**Fix**: Verification layer that checks actual state.

**Changes needed**:

1. **Add verification service** (`apps/server/src/services/verification-service.ts`):
```typescript
interface Verification {
  type: 'git_commit_exists' | 'tests_pass' | 'pr_created' | 'build_succeeds';
  check: () => Promise<boolean>;
}

async function verifyTaskCompletion(task: Task, claimed: TaskResult): Promise<boolean> {
  const verifications = getVerificationsForTask(task);

  for (const v of verifications) {
    const passed = await v.check();
    if (!passed) {
      await logVerificationFailure(task, v);
      return false;
    }
  }

  return true;
}
```

2. **Integrate into task completion** (`apps/server/src/agents/base-agent.ts`):
```typescript
async completeTask(task: Task, result: TaskResult) {
  // Don't trust self-report
  const verified = await verifyTaskCompletion(task, result);

  if (!verified) {
    // Self-correct
    await this.retryWithContext(task, result, 'Verification failed');
    return;
  }

  await markTaskComplete(task);
}
```

---

## Gap 3: No Circuit Breakers

**Current**: Agent can fail infinitely, burning money.

**Problem**: Gas Town spent $100/hour when things went wrong.

**Fix**: Simple circuit breaker per agent.

**Changes needed**:

1. **Add circuit breaker** (`apps/server/src/agents/circuit-breaker.ts`):
```typescript
class CircuitBreaker {
  private failures = 0;
  private openedAt: Date | null = null;
  private readonly threshold = 3;
  private readonly cooldown = 5 * 60 * 1000;

  isOpen(): boolean {
    if (!this.openedAt) return false;
    if (Date.now() - this.openedAt.getTime() > this.cooldown) {
      this.reset();
      return false;
    }
    return true;
  }

  recordFailure(): void {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.openedAt = new Date();
    }
  }

  recordSuccess(): void {
    this.failures = 0;
  }

  reset(): void {
    this.failures = 0;
    this.openedAt = null;
  }
}
```

2. **Wrap agent execution**:
```typescript
async executeTask(task: Task) {
  if (this.circuitBreaker.isOpen()) {
    await this.escalateToLead(task, 'Circuit breaker open');
    return;
  }

  try {
    const result = await this.doExecute(task);
    this.circuitBreaker.recordSuccess();
    return result;
  } catch (error) {
    this.circuitBreaker.recordFailure();
    throw error;
  }
}
```

---

## Gap 4: No Agent Peer Review

**Current**: Code goes straight to PR, human reviews.

**Problem**: Humans become bottleneck. Quality varies.

**Fix**: Agent reviews agent code before PR.

**Changes needed**:

1. **Add review step to workflow**:
```typescript
async function submitWork(agent: Agent, work: WorkResult) {
  // Create draft PR
  const pr = await createDraftPR(work);

  // Get a different agent to review
  const reviewer = selectReviewer(agent);  // Different agent, same domain
  const review = await reviewer.reviewCode(pr);

  if (review.approved) {
    await pr.markReady();
    await pr.addLabel('agent-approved');
  } else {
    // Send back to author with comments
    await agent.handleReviewFeedback(pr, review);
  }
}
```

2. **Add review capability to agents** (in system prompt):
```
When reviewing code, check for:
- Does it compile? Run typecheck.
- Do tests pass? Run test suite.
- Are there obvious bugs? Look for null checks, error handling.
- Does it match the task requirements?
- Is it reasonably clean? No obvious code smells.

If any of these fail, request changes with specific feedback.
```

---

## Gap 5: No Persistent Work Records

**Current**: Agent execution is ephemeral. If agent dies, context lost.

**Problem**: Can't resume failed tasks. Can't audit what happened.

**Fix**: Log every action to database.

**Changes needed**:

1. **Add work_records table**:
```prisma
model WorkRecord {
  id        String   @id @default(cuid())
  taskId    String
  agentId   String
  action    String
  input     Json
  output    Json?
  artifacts String[] // Git SHAs, file paths, PR URLs
  status    String   // 'started' | 'completed' | 'failed'
  error     String?
  createdAt DateTime @default(now())

  task  Task  @relation(fields: [taskId], references: [id])
  agent Agent @relation(fields: [agentId], references: [id])

  @@index([taskId])
  @@index([agentId])
}
```

2. **Log actions in base agent**:
```typescript
async executeAction(action: string, input: unknown) {
  const record = await db.workRecord.create({
    data: { taskId: this.currentTask.id, agentId: this.id, action, input, status: 'started' }
  });

  try {
    const output = await this.doAction(action, input);
    await db.workRecord.update({
      where: { id: record.id },
      data: { output, status: 'completed' }
    });
    return output;
  } catch (error) {
    await db.workRecord.update({
      where: { id: record.id },
      data: { error: error.message, status: 'failed' }
    });
    throw error;
  }
}
```

3. **Enable task resumption**:
```typescript
async resumeTask(taskId: string) {
  const records = await db.workRecord.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' }
  });

  const lastCompleted = records.filter(r => r.status === 'completed').at(-1);

  // Give agent context about what was already done
  await agent.continueFrom({
    task: await getTask(taskId),
    completedActions: records.filter(r => r.status === 'completed'),
    lastFailure: records.find(r => r.status === 'failed'),
  });
}
```

---

## Gap 6: Weak Quality Gates

**Current**: No automated checks before merge.

**Problem**: Bad code gets through. Manual review catches it too late.

**Fix**: Automated quality gates that block merge.

**Changes needed**:

1. **Add quality gate runner** (`apps/server/src/services/quality-gates.ts`):
```typescript
const gates: QualityGate[] = [
  {
    name: 'typecheck',
    run: () => exec('pnpm typecheck'),
    blocking: true,
  },
  {
    name: 'lint',
    run: () => exec('pnpm lint'),
    blocking: true,
  },
  {
    name: 'test',
    run: () => exec('pnpm test'),
    blocking: true,
  },
  {
    name: 'build',
    run: () => exec('pnpm build'),
    blocking: true,
  },
];

async function runQualityGates(pr: PullRequest): Promise<GateResult[]> {
  const results = await Promise.all(gates.map(async (gate) => {
    const result = await gate.run();
    return {
      name: gate.name,
      passed: result.exitCode === 0,
      output: result.output,
      blocking: gate.blocking,
    };
  }));

  return results;
}
```

2. **Block PR merge on failures**:
```typescript
async function canMerge(pr: PullRequest): Promise<boolean> {
  const gateResults = await runQualityGates(pr);
  const blockingFailures = gateResults.filter(r => r.blocking && !r.passed);

  if (blockingFailures.length > 0) {
    await pr.addComment(`Quality gates failed:\n${blockingFailures.map(f => `- ${f.name}`).join('\n')}`);
    return false;
  }

  return true;
}
```

---

## Implementation Order

1. **Org structure** - Changes how tasks flow, do first
2. **Circuit breakers** - Prevents runaway costs, quick win
3. **Work records** - Enables everything else
4. **Verification** - Catches bad completions
5. **Quality gates** - Blocks bad code
6. **Peer review** - Final quality layer

---

## What NOT to Add

- ❌ Human approval gates (blocks autonomy)
- ❌ Compliance modules (add later if needed)
- ❌ Multi-sig approvals (bureaucracy)
- ❌ Cryptographic audit trails (overkill)
- ❌ Graceful degradation modes (premature)

Keep the system simple. Agents should be able to ship code end-to-end without human intervention. Humans review PRs async, not as a blocking gate.
