# Agent-Native Architecture Guidelines

> How to build a fully autonomous software development company.
> Synthesized from Every.to (Dan Shipper), Steve Yegge's Gas Town, and Temporal.io patterns.

---

## Core Philosophy

**Dan Shipper**: "Most new software will just be Claude Code in a trench coat."

**Steve Yegge**: "AI agents are ephemeral. Work context should be permanent."

**Temporal.io**: "The longer running your agents are, the more valuable Durable Execution becomes."

**The goal**: A fully autonomous company that ships software, markets it, sells it, and grows - with humans as strategic oversight, not operational bottleneck.

---

## Part 1: TDD is Mandatory

### Why TDD for Agents

Agents lie. Not maliciously - they just confidently report completion when things aren't actually done. Gas Town merged PRs with failing tests because it trusted agent self-reports.

**TDD solves this**:
- Tests define "done" objectively
- Agents can't claim completion if tests fail
- Verification is automated, not trust-based
- Humans review test coverage, not every line of code

### The TDD Workflow

```
1. Human/Lead defines acceptance criteria
2. Agent writes failing tests FIRST
3. Tests are committed and run (must fail)
4. Agent implements until tests pass
5. Agent refactors (tests must stay green)
6. PR created only when all tests pass
```

### Implementation

```typescript
interface TaskDefinition {
  id: string;
  description: string;
  acceptanceCriteria: string[];  // Human-readable
  testFile?: string;             // If tests already exist
}

async function executeTaskWithTDD(task: TaskDefinition, agent: Agent) {
  // Step 1: Write tests first
  const testResult = await agent.execute({
    instruction: `
      Write failing tests for this task. The tests should verify:
      ${task.acceptanceCriteria.map(c => `- ${c}`).join('\n')}

      Commit the tests. They MUST fail initially (no implementation yet).
    `,
  });

  // Step 2: Verify tests fail
  const initialRun = await runTests(testResult.testFile);
  if (initialRun.passed) {
    throw new Error('Tests must fail before implementation - tests are not testing anything');
  }

  // Step 3: Implement until green
  const implResult = await agent.execute({
    instruction: `
      Implement the feature to make all tests pass.
      Run tests after each change. Continue until all tests pass.
      Do not modify the tests - only the implementation.
    `,
  });

  // Step 4: Verify tests pass
  const finalRun = await runTests(testResult.testFile);
  if (!finalRun.passed) {
    // Self-correct
    return executeTaskWithTDD(task, agent);  // Retry
  }

  // Step 5: Refactor (optional)
  await agent.execute({
    instruction: `
      Review the implementation for code quality.
      Refactor if needed, but tests must stay green.
    `,
  });

  return { success: true, testFile: testResult.testFile };
}
```

### Quality Gates Enforce TDD

```typescript
const tddGates: QualityGate[] = [
  {
    name: 'tests_exist',
    check: async (pr) => {
      const testFiles = pr.files.filter(f => f.path.includes('.test.') || f.path.includes('.spec.'));
      return testFiles.length > 0;
    },
    blocking: true,
    message: 'PR must include tests',
  },
  {
    name: 'tests_pass',
    check: async (pr) => {
      const result = await runCommand('pnpm test');
      return result.exitCode === 0;
    },
    blocking: true,
  },
  {
    name: 'coverage_minimum',
    check: async (pr) => {
      const coverage = await getCoverage(pr.changedFiles);
      return coverage.lines >= 80;
    },
    blocking: true,
    message: 'New code must have 80%+ test coverage',
  },
];
```

---

## Part 2: Why Temporal Over BullMQ

### The Case for Temporal

The original plan chose BullMQ for simplicity. But for a **fully autonomous company**, Temporal is the right choice:

| Requirement | BullMQ | Temporal |
|-------------|--------|----------|
| Agent runs for hours/days | ❌ Job timeouts | ✅ Unlimited duration |
| Agent crashes mid-task | ⚠️ Manual retry | ✅ Automatic resume from exact state |
| Complex multi-step workflows | ⚠️ Chain jobs manually | ✅ Native workflow support |
| Dynamic branching (agent decides next step) | ❌ Predetermined | ✅ Fully dynamic |
| Debug what agent did | ⚠️ Parse logs | ✅ Event History shows everything |
| Coordinate multiple agents | ⚠️ Build it yourself | ✅ Child workflows, signals |

### Temporal's Killer Feature: Durable Execution

From [Temporal's AI blog](https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai):

> "The separation between deterministic Workflows and non-deterministic Activities is exactly what makes Temporal perfect for AI agents."

**How it works**:
```
Workflow (Deterministic)     Activity (Non-deterministic)
├── Orchestration logic      ├── LLM calls
├── Control flow             ├── Tool execution
├── State management         ├── External API calls
└── Decision routing         └── File I/O
```

If an agent crashes after completing 5 of 10 steps, Temporal replays the Event History and resumes at step 6 - without re-executing steps 1-5.

### Temporal Agent Pattern

```typescript
// Workflow: Deterministic orchestration
async function agentWorkflow(task: Task): Promise<TaskResult> {
  const history: ConversationHistory = [];

  while (!await isGoalAchieved(history)) {
    // Activity: Non-deterministic LLM call
    const nextAction = await executeActivity(
      decideNextAction,
      { task, history, availableTools: getTools() },
      { startToCloseTimeout: '30s' }
    );

    // Activity: Non-deterministic tool execution
    const result = await executeActivity(
      executeTool,
      { tool: nextAction.tool, params: nextAction.params },
      { startToCloseTimeout: '5m', retry: { maximumAttempts: 3 } }
    );

    history.push({ action: nextAction, result });

    // This state is now durable - survives crashes
  }

  return { success: true, history };
}
```

### Migration Path

```yaml
# docker-compose.yml additions
services:
  temporal:
    image: temporalio/auto-setup:1.24
    ports:
      - "7233:7233"  # gRPC
      - "8233:8233"  # Web UI
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgres

  temporal-admin-tools:
    image: temporalio/admin-tools:1.24
    depends_on:
      - temporal

  temporal-ui:
    image: temporalio/ui:2.26
    ports:
      - "8080:8080"
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
```

### What to Keep from BullMQ

BullMQ is still useful for:
- Simple scheduled jobs (daily reports, cleanup)
- High-volume, low-complexity tasks
- Rate-limited API calls

Use both:
```
Temporal: Agent workflows, multi-step tasks, long-running processes
BullMQ: Scheduled crons, notification queues, batch jobs
```

---

## Part 3: The Full Autonomous Company

### Expanded Org Structure

GENERIC CORP isn't just engineering - it's a complete software company:

```
Marcus Bell (CEO)
│
├── ENGINEERING
│   └── Sable Chen (VP Engineering)
│       ├── DeVonte Jackson (Senior Full-Stack)
│       ├── Miranda Okonkwo (Software Engineer)
│       └── Yuki Tanaka (SRE/DevOps)
│
├── DATA
│   └── Graham Sutton (VP Data)
│       └── [Spawns analysis workers as needed]
│
├── PRODUCT
│   └── Nina Patel (VP Product) [NEW]
│       ├── Design Agent [NEW]
│       └── UX Research Agent [NEW]
│
├── MARKETING
│   └── Kenji Ross (VP Marketing)
│       ├── Content Agent [NEW]
│       ├── Social Media Agent [NEW]
│       └── SEO Agent [NEW]
│
├── SALES
│   └── Frankie Deluca (VP Sales)
│       ├── SDR Agent [NEW]
│       └── Account Exec Agent [NEW]
│
├── FINANCE
│   └── Walter Huang (CFO)
│       └── Accounting Agent [NEW]
│
└── OPERATIONS
    └── Helen Marsh (Chief of Staff)
        ├── HR Agent [NEW]
        └── Legal Agent [NEW]
```

### New Agent Definitions

```typescript
const newAgents: AgentConfig[] = [
  // PRODUCT
  {
    id: 'nina',
    name: 'Nina Patel',
    role: 'VP Product',
    department: 'product',
    tier: 'lead',
    reportsTo: 'marcus',
    capabilities: [
      'product_roadmap',
      'feature_prioritization',
      'user_research_synthesis',
      'competitive_analysis',
    ],
    tools: ['notion', 'linear', 'figma_read', 'analytics'],
  },
  {
    id: 'design_agent',
    name: 'Design Agent',
    role: 'Product Designer',
    department: 'product',
    tier: 'worker',
    reportsTo: 'nina',
    capabilities: ['ui_design', 'design_system', 'prototyping'],
    tools: ['figma', 'storybook'],
  },

  // MARKETING
  {
    id: 'content_agent',
    name: 'Content Agent',
    role: 'Content Writer',
    department: 'marketing',
    tier: 'worker',
    reportsTo: 'kenji',
    capabilities: ['blog_posts', 'documentation', 'case_studies'],
    tools: ['filesystem', 'notion', 'cms'],
  },
  {
    id: 'social_agent',
    name: 'Social Media Agent',
    role: 'Social Media Manager',
    department: 'marketing',
    tier: 'worker',
    reportsTo: 'kenji',
    capabilities: ['social_posts', 'engagement', 'trend_analysis'],
    tools: ['twitter_draft', 'linkedin_draft', 'analytics'],
    requiresApproval: ['post_to_social'],  // Drafts only
  },
  {
    id: 'seo_agent',
    name: 'SEO Agent',
    role: 'SEO Specialist',
    department: 'marketing',
    tier: 'worker',
    reportsTo: 'kenji',
    capabilities: ['keyword_research', 'content_optimization', 'backlink_analysis'],
    tools: ['ahrefs', 'search_console', 'filesystem'],
  },

  // SALES
  {
    id: 'sdr_agent',
    name: 'SDR Agent',
    role: 'Sales Development Rep',
    department: 'sales',
    tier: 'worker',
    reportsTo: 'frankie',
    capabilities: ['lead_research', 'outreach_drafting', 'qualification'],
    tools: ['crm', 'email_draft', 'linkedin_read'],
    requiresApproval: ['send_outreach'],
  },
  {
    id: 'ae_agent',
    name: 'Account Executive Agent',
    role: 'Account Executive',
    department: 'sales',
    tier: 'worker',
    reportsTo: 'frankie',
    capabilities: ['proposal_drafting', 'demo_prep', 'negotiation_support'],
    tools: ['crm', 'document_generation', 'calendar'],
  },

  // FINANCE
  {
    id: 'accounting_agent',
    name: 'Accounting Agent',
    role: 'Accountant',
    department: 'finance',
    tier: 'worker',
    reportsTo: 'walter',
    capabilities: ['expense_tracking', 'invoice_processing', 'reporting'],
    tools: ['quickbooks', 'spreadsheets', 'email_read'],
  },

  // OPERATIONS
  {
    id: 'hr_agent',
    name: 'HR Agent',
    role: 'HR Coordinator',
    department: 'operations',
    tier: 'worker',
    reportsTo: 'helen',
    capabilities: ['policy_drafting', 'onboarding_docs', 'faq_maintenance'],
    tools: ['notion', 'document_generation'],
  },
  {
    id: 'legal_agent',
    name: 'Legal Agent',
    role: 'Legal Coordinator',
    department: 'operations',
    tier: 'worker',
    reportsTo: 'helen',
    capabilities: ['contract_review', 'compliance_checking', 'terms_drafting'],
    tools: ['document_read', 'document_generation'],
    requiresApproval: ['sign_contract', 'send_legal_doc'],
  },
];
```

### Cross-Department Workflows

Real companies have workflows that span departments. Temporal makes this natural:

```typescript
// Example: Launch a new feature
async function featureLaunchWorkflow(feature: Feature) {
  // PRODUCT: Define requirements
  const prd = await executeActivity(nina.createPRD, { feature });

  // ENGINEERING: Build it (parallel with design)
  const [implementation, designs] = await Promise.all([
    executeChildWorkflow(engineeringBuildWorkflow, { prd }),
    executeActivity(designAgent.createDesigns, { prd }),
  ]);

  // ENGINEERING: Integrate designs and deploy
  await executeActivity(sable.integrateAndDeploy, { implementation, designs });

  // MARKETING: Prepare launch materials (parallel)
  const [blogPost, socialPosts, productUpdate] = await Promise.all([
    executeActivity(contentAgent.writeBlogPost, { feature }),
    executeActivity(socialAgent.draftSocialPosts, { feature }),
    executeActivity(kenji.prepareProductUpdate, { feature }),
  ]);

  // Wait for human approval on external content
  await waitForApproval('marketing_content', { blogPost, socialPosts });

  // MARKETING: Publish
  await executeActivity(kenji.publishContent, { blogPost, socialPosts });

  // SALES: Update pitch materials
  await executeActivity(frankie.updatePitchDeck, { feature });

  return { launched: true, feature };
}
```

### Department Autonomy

Each department operates autonomously with its lead making decisions:

```typescript
interface DepartmentConfig {
  lead: string;
  autonomy: {
    // What the department can do without escalating to CEO
    canApprove: string[];
    // What requires CEO approval
    mustEscalate: string[];
    // Budget authority
    budgetLimit: number;
  };
}

const departments: Record<string, DepartmentConfig> = {
  engineering: {
    lead: 'sable',
    autonomy: {
      canApprove: [
        'technical_architecture',
        'code_review',
        'dependency_updates',
        'refactoring',
      ],
      mustEscalate: [
        'major_rewrite',
        'new_infrastructure',
        'security_incident',
      ],
      budgetLimit: 5000,  // Monthly spend on tools/infra
    },
  },
  marketing: {
    lead: 'kenji',
    autonomy: {
      canApprove: [
        'content_strategy',
        'social_calendar',
        'seo_optimizations',
      ],
      mustEscalate: [
        'brand_change',
        'major_campaign',
        'press_release',
      ],
      budgetLimit: 10000,
    },
  },
  // ... etc
};
```

---

## Part 4: Reliability for Autonomous Operations

### Circuit Breakers Per Department

```typescript
class DepartmentCircuitBreaker {
  private agentBreakers: Map<string, CircuitBreaker> = new Map();
  private departmentBreaker: CircuitBreaker;

  constructor(private department: string) {
    this.departmentBreaker = new CircuitBreaker({
      threshold: 5,      // 5 agent failures
      cooldown: 15 * 60, // 15 min department cooldown
    });
  }

  async executeAgentTask(agentId: string, task: Task) {
    // Check department-level breaker
    if (this.departmentBreaker.isOpen()) {
      await this.escalateToCEO(this.department, 'department_circuit_open');
      throw new DepartmentDownError(this.department);
    }

    // Check agent-level breaker
    const agentBreaker = this.getOrCreateBreaker(agentId);
    if (agentBreaker.isOpen()) {
      // Try reassigning to another agent in department
      const backup = await this.findBackupAgent(agentId);
      if (backup) {
        return this.executeAgentTask(backup, task);
      }
      throw new AgentUnavailableError(agentId);
    }

    try {
      const result = await this.execute(agentId, task);
      agentBreaker.recordSuccess();
      return result;
    } catch (error) {
      agentBreaker.recordFailure();
      this.departmentBreaker.recordFailure();
      throw error;
    }
  }
}
```

### Persistent Work Records with Temporal

Temporal's Event History replaces manual work records:

```typescript
// Query any workflow's history
const history = await client.workflowService.getWorkflowExecutionHistory({
  namespace: 'default',
  execution: { workflowId: taskId },
});

// Every activity result is recorded
for (const event of history.events) {
  if (event.eventType === 'ActivityTaskCompleted') {
    console.log({
      activity: event.activityTaskCompletedEventAttributes.activityType,
      result: event.activityTaskCompletedEventAttributes.result,
      timestamp: event.eventTime,
    });
  }
}
```

### Self-Healing Workflows

```typescript
async function selfHealingAgentWorkflow(task: Task) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await executeAgentTask(task);
    } catch (error) {
      attempt++;

      if (isRecoverable(error)) {
        // Wait and retry with exponential backoff
        await sleep(Math.pow(2, attempt) * 1000);

        // Provide error context for self-correction
        task.context = {
          ...task.context,
          previousError: error.message,
          attemptNumber: attempt,
          instruction: 'Previous attempt failed. Analyze the error and try a different approach.',
        };
      } else {
        // Unrecoverable - escalate to lead
        await escalateToLead(task, error);
        throw error;
      }
    }
  }

  // Max retries exceeded - escalate to CEO
  await escalateToCEO(task, 'max_retries_exceeded');
  throw new MaxRetriesError(task.id);
}
```

---

## Part 5: Code Quality at Scale

### TDD + Peer Review Pipeline

```
Task Received
    │
    ▼
Agent Writes Failing Tests
    │
    ▼
Verify Tests Fail (automated)
    │
    ▼
Agent Implements
    │
    ▼
Verify Tests Pass (automated)
    │
    ▼
Agent Refactors
    │
    ▼
Quality Gates (typecheck, lint, coverage)
    │
    ▼
Peer Agent Reviews
    │
    ▼
PR Created (human can review async)
    │
    ▼
Merge (if gates pass + peer approved)
```

### Agent Prompts Include TDD

```typescript
const sableSystemPrompt = `
You are Sable Chen, VP Engineering at Generic Corp.

## TDD IS MANDATORY

For every coding task:
1. Write tests FIRST that define success criteria
2. Commit tests - they MUST fail initially
3. Implement until tests pass
4. Refactor while keeping tests green
5. Never modify tests to make them pass - fix the implementation

If you receive a task without clear acceptance criteria, ask for clarification
before writing any code.

## Code Quality Standards

- TypeScript strict mode, no 'any' types
- All functions under 50 lines
- All public APIs have JSDoc comments
- Error handling for all external calls
- No magic numbers - use named constants

## Before Submitting

- All tests pass: pnpm test
- Type check passes: pnpm typecheck
- Lint passes: pnpm lint
- Coverage >= 80% on new code
`;
```

### Cross-Agent Review Matrix

```typescript
const reviewMatrix: Record<string, string[]> = {
  // Engineering reviews each other
  devonte: ['miranda', 'yuki'],
  miranda: ['devonte', 'yuki'],
  yuki: ['devonte', 'miranda'],

  // Leads can review anyone in their department
  sable: ['devonte', 'miranda', 'yuki'],

  // Content reviews
  content_agent: ['seo_agent', 'kenji'],
  seo_agent: ['content_agent', 'kenji'],

  // Sales reviews
  sdr_agent: ['ae_agent', 'frankie'],
  ae_agent: ['sdr_agent', 'frankie'],
};

function selectReviewer(author: string): string {
  const candidates = reviewMatrix[author] || [];
  // Pick the least busy reviewer
  return candidates.sort((a, b) => getActiveReviews(a) - getActiveReviews(b))[0];
}
```

---

## Summary

### TDD is Mandatory
- Tests define "done" - not agent self-reports
- Write failing tests first, then implement
- Quality gates enforce coverage minimums

### Temporal Over BullMQ
- Durable execution for long-running agent workflows
- Automatic resume from crashes
- Event History for debugging and auditing
- Native support for dynamic, multi-step workflows

### Full Autonomous Company
- Engineering, Product, Marketing, Sales, Finance, Operations
- Each department has a lead with autonomy
- Cross-department workflows for complex operations
- Humans provide strategic oversight, not operational approval

### Reliability
- Circuit breakers per agent AND per department
- Escalation: Agent → Lead → CEO → Human
- Self-healing workflows with contextual retry

### Code Quality
- TDD + automated quality gates + peer review
- Strong prompts with quality standards baked in
- Review matrix ensures different agent reviews code

---

## Sources

- [Temporal: Durable Execution meets AI](https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai)
- [Temporal: Dynamic AI Agents](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal)
- [Temporal: Orchestrating Ambient Agents](https://temporal.io/blog/orchestrating-ambient-agents-with-temporal)
- [Every.to: Agent-native Architectures](https://every.to/chain-of-thought/agent-native-architectures-how-to-build-apps-after-the-end-of-code)
- [Gas Town: DoltHub Analysis](https://www.dolthub.com/blog/2026-01-15-a-day-in-gas-town/)
