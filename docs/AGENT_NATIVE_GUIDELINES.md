# Agent-Native Architecture Guidelines

> How to build autonomous multi-agent systems that ship quality work reliably.
> Synthesized from Every.to (Dan Shipper) and Steve Yegge's Gas Town.

---

## Core Philosophy

**Dan Shipper's key insight**: "Most new software will just be Claude Code in a trench coat—new features are just buttons that activate prompts to an underlying general agent."

**Steve Yegge's key insight**: "AI agents are ephemeral. Work context should be permanent."

**The goal**: Fully autonomous agents that ship quality code without babysitting.

---

## Part 1: Org Structure (How Agents Work Together)

### The Gas Town Model

Gas Town uses a three-tier hierarchy that actually works:

```
Mayor (Orchestrator)
  └── Polecats (Specialists)
        └── Convoys (Workers)
```

**Why this works**:
- **Mayor** holds context about the overall goal - doesn't do work, routes work
- **Polecats** are domain experts - they understand their area deeply
- **Convoys** do the actual work - focused, disposable, parallelizable

### Applied to GENERIC CORP

Current plan has 10 agents with flat-ish structure. Here's how to make it work:

```
Marcus (CEO/Orchestrator)
├── Technical Lead: Sable
│   ├── DeVonte (Full-Stack)
│   ├── Miranda (Software Engineer)
│   └── Yuki (SRE)
├── Data Lead: Graham
│   └── (can spawn analysis workers)
├── Business Lead: Walter
│   ├── Frankie (Sales)
│   └── Kenji (Marketing)
└── Operations: Helen (EA)
```

**Key principles**:

1. **Marcus routes, doesn't execute**
   - Receives task → determines domain → delegates to lead
   - Tracks progress across workstreams
   - Resolves cross-team conflicts
   - Never writes code or sends emails

2. **Leads own their domain**
   - Sable decides HOW to implement technical work
   - Graham decides HOW to structure data pipelines
   - Walter decides HOW to approach business problems
   - They can reject or reshape tasks from Marcus

3. **Workers are disposable and parallelizable**
   - DeVonte, Miranda, Yuki can work in parallel
   - If one fails, others continue
   - Work products merge through the lead

### Communication Patterns

**What Gas Town got right**:
```
Task flow:    Marcus → Sable → DeVonte
Status flow:  DeVonte → Sable → Marcus
Artifacts:    DeVonte → Git → (anyone can read)
```

**Anti-patterns to avoid**:
- ❌ Marcus directly assigning to DeVonte (bypasses Sable's context)
- ❌ DeVonte messaging Frankie directly (cross-domain confusion)
- ❌ All agents in one chat (cognitive overload)

**Implementation**:
```typescript
interface TaskRouting {
  // Marcus routes to leads only
  ceoCanAssignTo: ['sable', 'graham', 'walter', 'helen'];

  // Leads route to their teams
  techLeadCanAssignTo: ['devonte', 'miranda', 'yuki'];
  dataLeadCanAssignTo: ['analytics_worker_*'];  // Can spawn workers
  bizLeadCanAssignTo: ['frankie', 'kenji'];

  // Workers cannot assign tasks
  workerCanAssignTo: [];
}
```

### Parallel Execution

**Gas Town lesson**: "Four agents working simultaneously on Bats tests" - this is the whole point.

**How to enable it**:
```typescript
// When Sable receives a feature request, she can parallelize:
const subtasks = await sable.decompose(task);
// [
//   { assignee: 'devonte', work: 'implement API endpoint' },
//   { assignee: 'miranda', work: 'write unit tests' },
//   { assignee: 'yuki', work: 'set up monitoring' },
// ]

// All three execute simultaneously
await Promise.all(subtasks.map(t => executeTask(t)));

// Sable merges the results
await sable.integrate(subtasks);
```

**Key insight**: The lead (Sable) holds the integration context. Workers don't need to coordinate with each other - they just deliver their piece.

---

## Part 2: Reliability (Systems That Don't Break)

### The Gas Town Failure

**What happened**: "Gas Town operated in an overly aggressive mode, merging code despite failing integration tests."

**The problem wasn't autonomy** - it was lack of verification.

### Verification, Not Approval

The difference:
- **Approval**: Human says "yes" before action (blocks autonomy)
- **Verification**: System confirms action succeeded (enables autonomy)

**Implementation**:
```typescript
// WRONG: Block on human
async function completeTask(task: Task) {
  await waitForHumanApproval(task);  // ❌ Kills autonomy
  await markComplete(task);
}

// RIGHT: Verify automatically
async function completeTask(task: Task) {
  const checks = await runVerifications(task);
  // - Does the code compile?
  // - Do tests pass?
  // - Is the PR created?
  // - Does the commit exist?

  if (checks.allPassed) {
    await markComplete(task);
  } else {
    await markFailed(task, checks.failures);
    await notifyLead(task.lead, checks.failures);  // Lead decides retry
  }
}
```

### Circuit Breakers (Not Safety Theater)

**The real problem**: An agent in a bad state will burn money and create garbage.

**Simple solution**:
```typescript
class AgentCircuitBreaker {
  private failures = 0;
  private readonly threshold = 3;
  private readonly cooldown = 5 * 60 * 1000; // 5 minutes

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Agent circuit open - too many recent failures');
    }

    try {
      const result = await fn();
      this.failures = 0;  // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures >= this.threshold) {
        this.trip();
        // Alert the lead, not a human committee
        await this.alertLead();
      }
      throw error;
    }
  }
}
```

**What this prevents**:
- Agent loops burning $100/hour
- Garbage commits piling up
- Cascading failures across agents

**What this doesn't do**:
- Require human approval for every action
- Block work that's succeeding
- Add bureaucratic overhead

### State Persistence

**Gas Town principle**: Work survives agent death.

**Implementation**:
```typescript
// Every agent action creates a persistent record
interface WorkRecord {
  id: string;
  taskId: string;
  agentId: string;
  action: string;
  input: unknown;
  output: unknown;
  artifacts: string[];  // Git commits, file paths, PR URLs
  timestamp: Date;
}

// If agent dies mid-task, another can pick up
async function resumeTask(taskId: string) {
  const records = await getWorkRecords(taskId);
  const lastCheckpoint = findLastSuccessfulCheckpoint(records);
  const agent = await spawnAgent(taskId);
  await agent.resumeFrom(lastCheckpoint);
}
```

### Error Recovery Hierarchy

When things go wrong:

```
1. Agent retries (automatic, up to 3x)
   └── Still failing?
2. Lead reassigns to different worker
   └── Still failing?
3. Lead escalates to Marcus with context
   └── Still failing?
4. Marcus alerts human with full context
```

**Key point**: Humans get involved when the SYSTEM can't figure it out, not as a gate on every action.

---

## Part 3: Code Quality (Output That's Actually Good)

### The Every.to Approach

**Dan Shipper**: "All of the code is AI-written, but humans review."

The pattern:
1. Agent writes code
2. Agent writes tests
3. Agent runs tests
4. If tests pass → PR created
5. Human reviews PR (async, non-blocking)

### Quality Gates (Automated)

```typescript
interface QualityGate {
  name: string;
  check: (artifacts: Artifact[]) => Promise<QualityResult>;
  blocking: boolean;  // If true, must pass before merge
}

const standardGates: QualityGate[] = [
  {
    name: 'typescript_compiles',
    check: async (artifacts) => {
      const result = await runCommand('pnpm typecheck');
      return { passed: result.exitCode === 0, output: result.output };
    },
    blocking: true,
  },
  {
    name: 'tests_pass',
    check: async (artifacts) => {
      const result = await runCommand('pnpm test');
      return { passed: result.exitCode === 0, output: result.output };
    },
    blocking: true,
  },
  {
    name: 'lint_clean',
    check: async (artifacts) => {
      const result = await runCommand('pnpm lint');
      return { passed: result.exitCode === 0, output: result.output };
    },
    blocking: true,
  },
  {
    name: 'no_console_logs',
    check: async (artifacts) => {
      const result = await grepFiles('console.log', artifacts.filter(a => a.type === 'code'));
      return { passed: result.matches.length === 0, output: result.matches };
    },
    blocking: false,  // Warning only
  },
];
```

### Code Review by Agents

**Radical idea from Every.to**: Agents can review each other's code.

```typescript
// DeVonte writes code, Miranda reviews
async function peerReview(pr: PullRequest) {
  const author = pr.author;  // 'devonte'
  const reviewer = selectReviewer(author);  // 'miranda' (different agent)

  const review = await reviewer.reviewCode({
    diff: pr.diff,
    context: pr.description,
    guidelines: [
      'Check for obvious bugs',
      'Verify error handling',
      'Look for security issues',
      'Ensure tests cover main paths',
    ],
  });

  if (review.approved) {
    await pr.addLabel('agent-approved');
    // Human can still review, but it's not blocking
  } else {
    await pr.requestChanges(review.comments);
    // Back to author to fix
  }
}
```

### Prompt Engineering for Quality

**Every.to insight**: The prompt IS the product.

**Agent system prompts should include**:
```typescript
const sableSystemPrompt = `
You are Sable Chen, Principal Engineer at Generic Corp.

CODE QUALITY STANDARDS:
- TypeScript strict mode, no 'any' types
- All functions have error handling
- All public APIs have JSDoc comments
- No magic numbers - use named constants
- Prefer composition over inheritance
- Keep functions under 50 lines
- One concept per file

TESTING STANDARDS:
- Every feature has unit tests
- Critical paths have integration tests
- Test the behavior, not the implementation
- Use descriptive test names: "should X when Y"

BEFORE SUBMITTING:
- Run typecheck, lint, and tests locally
- Write a clear PR description explaining WHY
- Link to the task/issue being addressed
`;
```

### Self-Correction Loop

**Gas Town lesson**: Agents misreport status. Build in verification.

```typescript
async function executeWithVerification(task: Task) {
  // Agent does the work
  const result = await agent.execute(task);

  // Don't trust the agent's self-report
  if (result.claimedComplete) {
    const verification = await verifyCompletion(task, result);

    if (!verification.passed) {
      // Agent said it was done, but it's not
      await agent.correct({
        originalTask: task,
        claimedResult: result,
        actualState: verification.actualState,
        instruction: 'Your previous attempt did not fully complete. Here is what is actually in the system. Please fix.',
      });
    }
  }
}
```

---

## Summary: What Actually Matters

### Org Structure
- **Hierarchical routing**: Marcus → Leads → Workers
- **Domain ownership**: Leads decide HOW, not just WHAT
- **Parallel execution**: Workers don't coordinate, leads integrate

### Reliability
- **Verification, not approval**: Automated checks, not human gates
- **Circuit breakers**: Stop runaway agents, don't block good ones
- **Persistent state**: Work survives agent death
- **Escalation hierarchy**: Agents → Leads → Marcus → Human (last resort)

### Code Quality
- **Automated gates**: Compile, test, lint must pass
- **Agent peer review**: Different agent reviews before merge
- **Strong prompts**: Quality standards baked into agent identity
- **Self-correction**: Don't trust self-reports, verify externally

---

## What I Removed (And Why)

The previous version had a lot of compliance theater:
- ❌ Multi-level authorization (Level 0-4) - blocks autonomy
- ❌ HIPAA/SOX/FAA compliance modules - premature optimization
- ❌ Human-in-the-loop guarantees - defeats the purpose
- ❌ Cryptographic audit trails - overkill for most uses
- ❌ Committee approvals - bureaucracy

**When you actually need compliance**: Build it as a separate layer on top. Don't bake it into the core. A healthcare deployment can add HIPAA logging without changing how agents work together.

---

## Sources

- [Every.to: Agent-native Architectures](https://every.to/chain-of-thought/agent-native-architectures-how-to-build-apps-after-the-end-of-code)
- [Every.to: The AI-native startup](https://www.lennysnewsletter.com/p/inside-every-dan-shipper)
- [Gas Town: DoltHub Analysis](https://www.dolthub.com/blog/2026-01-15-a-day-in-gas-town/)
- [Gas Town GitHub](https://github.com/steveyegge/gastown)
