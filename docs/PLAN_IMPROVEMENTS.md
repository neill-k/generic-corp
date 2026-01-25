# Plan Improvements

> Concrete changes to make GENERIC CORP a fully autonomous software development company.

---

## Current Plan Strengths

Your plan already gets a lot right:
- ✅ Clear narrative and motivation
- ✅ Agent personalities with distinct capabilities
- ✅ Visual representation of agent state
- ✅ MCP tools with role-based access
- ✅ Draft approval for external communications

---

## Change 1: TDD is Mandatory

**Current**: No TDD requirement. Agents self-report completion.

**Problem**: Gas Town merged PRs with failing tests. Agents confidently claim "done" when they're not.

**Fix**: Tests define "done" - not agent self-reports.

### Implementation

1. **Update task schema** (`packages/shared/src/types.ts`):
```typescript
interface Task {
  id: string;
  description: string;
  acceptanceCriteria: string[];  // Required for all tasks
  testFile?: string;              // Populated after test-writing phase
  status: 'pending' | 'tests_written' | 'implementing' | 'testing' | 'review' | 'complete';
}
```

2. **Add TDD workflow** (`apps/server/src/workflows/tdd-workflow.ts`):
```typescript
async function tddWorkflow(task: Task) {
  // Phase 1: Write failing tests
  await agent.writeTests(task.acceptanceCriteria);
  const initialRun = await runTests();
  if (initialRun.passed) {
    throw new Error('Tests must fail initially');
  }

  // Phase 2: Implement until green
  await agent.implement();
  const finalRun = await runTests();
  if (!finalRun.passed) {
    return tddWorkflow(task);  // Retry
  }

  // Phase 3: Refactor
  await agent.refactor();
  await runTests();  // Must stay green
}
```

3. **Add quality gates** that block PRs without tests or with coverage < 80%.

---

## Change 2: Temporal Instead of BullMQ

**Current**: BullMQ for all orchestration.

**Problem**: For a fully autonomous company with long-running workflows:
- Agents may work for hours/days on complex tasks
- Crashes lose context (BullMQ doesn't have durable execution)
- Multi-step workflows require manual chaining
- No native support for dynamic branching

**Fix**: Temporal for agent workflows, BullMQ for simple scheduled jobs.

### Why Temporal

| Feature | BullMQ | Temporal |
|---------|--------|----------|
| Agent runs for days | ❌ Timeouts | ✅ Unlimited |
| Crash recovery | ⚠️ Retry from start | ✅ Resume from exact state |
| Multi-step workflows | ⚠️ Manual | ✅ Native |
| Dynamic branching | ❌ No | ✅ Yes |
| Debug history | ⚠️ Logs | ✅ Event History |

### Migration Steps

1. **Add Temporal to docker-compose.yml**:
```yaml
services:
  temporal:
    image: temporalio/auto-setup:1.24
    ports:
      - "7233:7233"
    environment:
      - DB=postgresql
      - POSTGRES_SEEDS=postgres

  temporal-ui:
    image: temporalio/ui:2.26
    ports:
      - "8080:8080"
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
```

2. **Install SDK**:
```bash
pnpm add @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

3. **Create workflow structure**:
```
apps/server/src/
├── workflows/           # Deterministic orchestration
│   ├── agent-task.ts
│   ├── tdd-workflow.ts
│   └── feature-launch.ts
├── activities/          # Non-deterministic execution
│   ├── llm-calls.ts
│   ├── tool-execution.ts
│   └── git-operations.ts
└── workers/             # Temporal workers
    └── main.ts
```

4. **Migrate agent execution**:
```typescript
// Before (BullMQ)
await taskQueue.add('execute', { taskId, agentId });

// After (Temporal)
await client.workflow.start(agentTaskWorkflow, {
  workflowId: `task-${taskId}`,
  taskQueue: 'agents',
  args: [{ taskId, agentId }],
});
```

5. **Keep BullMQ for simple jobs**:
```typescript
// Still use BullMQ for:
// - Daily report generation
// - Cleanup jobs
// - Rate-limited API calls
// - Notification queues
```

---

## Change 3: Full Company Structure

**Current**: 10 agents, mostly engineering-focused.

**Problem**: A software company needs more than engineers.

**Fix**: Expand to full company with all departments.

### New Org Chart

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
│       └── [Spawns workers]
│
├── PRODUCT [NEW DEPARTMENT]
│   └── Nina Patel (VP Product)
│       ├── Design Agent
│       └── UX Research Agent
│
├── MARKETING [EXPANDED]
│   └── Kenji Ross (VP Marketing)
│       ├── Content Agent
│       ├── Social Media Agent
│       └── SEO Agent
│
├── SALES [EXPANDED]
│   └── Frankie Deluca (VP Sales)
│       ├── SDR Agent
│       └── Account Exec Agent
│
├── FINANCE [EXPANDED]
│   └── Walter Huang (CFO)
│       └── Accounting Agent
│
└── OPERATIONS [EXPANDED]
    └── Helen Marsh (Chief of Staff)
        ├── HR Agent
        └── Legal Agent
```

### New Agent Definitions to Add

Add to `apps/server/prisma/seed.ts`:

```typescript
const newAgents = [
  // PRODUCT
  { id: 'nina', name: 'Nina Patel', role: 'VP Product', department: 'product' },
  { id: 'design_agent', name: 'Design Agent', role: 'Designer', department: 'product' },
  { id: 'ux_agent', name: 'UX Research Agent', role: 'UX Researcher', department: 'product' },

  // MARKETING
  { id: 'content_agent', name: 'Content Agent', role: 'Content Writer', department: 'marketing' },
  { id: 'social_agent', name: 'Social Media Agent', role: 'Social Media Manager', department: 'marketing' },
  { id: 'seo_agent', name: 'SEO Agent', role: 'SEO Specialist', department: 'marketing' },

  // SALES
  { id: 'sdr_agent', name: 'SDR Agent', role: 'Sales Development Rep', department: 'sales' },
  { id: 'ae_agent', name: 'Account Exec Agent', role: 'Account Executive', department: 'sales' },

  // FINANCE
  { id: 'accounting_agent', name: 'Accounting Agent', role: 'Accountant', department: 'finance' },

  // OPERATIONS
  { id: 'hr_agent', name: 'HR Agent', role: 'HR Coordinator', department: 'operations' },
  { id: 'legal_agent', name: 'Legal Agent', role: 'Legal Coordinator', department: 'operations' },
];
```

### Department Schema

Add to Prisma schema:

```prisma
model Department {
  id          String   @id @default(cuid())
  name        String   @unique
  leadId      String
  budgetLimit Int      @default(0)

  lead        Agent    @relation("DepartmentLead", fields: [leadId], references: [id])
  agents      Agent[]  @relation("DepartmentMembers")

  // Autonomy config
  canApprove  String[] // Actions department can self-approve
  mustEscalate String[] // Actions requiring CEO approval
}

model Agent {
  // ... existing fields ...
  departmentId String?
  reportsToId  String?
  tier         String   @default("worker") // 'ceo' | 'lead' | 'worker'

  department   Department? @relation("DepartmentMembers", fields: [departmentId], references: [id])
  reportsTo    Agent?      @relation("ReportsTo", fields: [reportsToId], references: [id])
  directReports Agent[]    @relation("ReportsTo")
}
```

---

## Change 4: Hierarchical Task Routing

**Current**: Marcus assigns to anyone.

**Problem**: CEO becomes bottleneck. No domain expertise in routing.

**Fix**: Three-tier hierarchy with leads owning their domains.

### Routing Rules

```typescript
const routingRules = {
  // CEO routes to department leads only
  marcus: {
    canAssignTo: ['sable', 'graham', 'nina', 'kenji', 'frankie', 'walter', 'helen'],
    cannotExecute: true,  // Routes, doesn't do work
  },

  // Leads route within their department
  sable: { canAssignTo: ['devonte', 'miranda', 'yuki'] },
  kenji: { canAssignTo: ['content_agent', 'social_agent', 'seo_agent'] },
  frankie: { canAssignTo: ['sdr_agent', 'ae_agent'] },
  // ... etc

  // Workers execute, don't delegate
  devonte: { canAssignTo: [] },
  miranda: { canAssignTo: [] },
  // ... etc
};
```

### Task Flow

```
External Request
      │
      ▼
Marcus (CEO) - classifies domain
      │
      ▼
Department Lead - decides HOW to execute
      │
      ▼
Workers (parallel) - do the work
      │
      ▼
Lead - integrates results
      │
      ▼
Marcus - reports completion
```

---

## Change 5: Cross-Department Workflows

**Current**: No multi-department coordination.

**Problem**: Real companies have workflows that span departments (e.g., feature launch needs engineering + marketing + sales).

**Fix**: Temporal child workflows for cross-department operations.

### Example: Feature Launch

```typescript
async function featureLaunchWorkflow(feature: Feature) {
  // PRODUCT defines requirements
  const prd = await executeActivity(nina.createPRD, { feature });

  // ENGINEERING + DESIGN work in parallel
  const [code, designs] = await Promise.all([
    executeChildWorkflow(engineeringBuildWorkflow, { prd }),
    executeActivity(designAgent.createDesigns, { prd }),
  ]);

  // ENGINEERING deploys
  await executeActivity(sable.deploy, { code, designs });

  // MARKETING prepares launch (parallel)
  const [blog, social] = await Promise.all([
    executeActivity(contentAgent.writeBlog, { feature }),
    executeActivity(socialAgent.draftPosts, { feature }),
  ]);

  // Human approves external content
  await waitForSignal('content_approved');

  // MARKETING publishes
  await executeActivity(kenji.publish, { blog, social });

  // SALES updates materials
  await executeActivity(frankie.updatePitch, { feature });
}
```

---

## Change 6: Circuit Breakers

**Current**: No protection against runaway agents.

**Problem**: A failing agent can burn money indefinitely.

**Fix**: Circuit breakers at agent and department level.

```typescript
class CircuitBreaker {
  private failures = 0;
  private openedAt: Date | null = null;

  constructor(
    private threshold: number = 3,
    private cooldown: number = 5 * 60 * 1000
  ) {}

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

  recordSuccess(): void { this.failures = 0; }
  reset(): void { this.failures = 0; this.openedAt = null; }
}
```

---

## Implementation Order

### Phase 1: Foundation (Week 1-2)
1. Add TDD workflow and quality gates
2. Set up Temporal infrastructure
3. Create first Temporal workflow (simple agent task)

### Phase 2: Migration (Week 3-4)
1. Migrate agent execution from BullMQ to Temporal
2. Add circuit breakers
3. Update task schema with new statuses

### Phase 3: Expansion (Week 5-6)
1. Add new departments and agents
2. Implement hierarchical routing
3. Add department autonomy config

### Phase 4: Workflows (Week 7-8)
1. Build cross-department workflows
2. Add peer review system
3. Polish and test

---

## Architecture Diagram (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENERIC CORP (Autonomous)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      PRESENTATION LAYER                                 │ │
│  │   React Dashboard + Phaser Isometric View                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                              WebSocket                                       │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     ORCHESTRATION LAYER                                 │ │
│  │  ┌─────────────────────────────┐  ┌─────────────────────────────────┐  │ │
│  │  │         Temporal            │  │           BullMQ                │  │ │
│  │  │  - Agent workflows          │  │  - Scheduled crons              │  │ │
│  │  │  - Multi-step tasks         │  │  - Notification queues          │  │ │
│  │  │  - Cross-dept coordination  │  │  - Rate-limited jobs            │  │ │
│  │  │  - Durable execution        │  │  - Batch processing             │  │ │
│  │  │  - Event history            │  │                                 │  │ │
│  │  └─────────────────────────────┘  └─────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      DEPARTMENT LAYER                                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │ │
│  │  │   ENG    │ │ PRODUCT  │ │MARKETING │ │  SALES   │ │   OPS    │     │ │
│  │  │  Sable   │ │   Nina   │ │  Kenji   │ │ Frankie  │ │  Helen   │     │ │
│  │  │  └─3     │ │  └─2     │ │  └─3     │ │  └─2     │ │  └─2     │     │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │ │
│  │                              Marcus (CEO)                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         AGENT LAYER                                     │ │
│  │   Claude Agent SDK + TDD Workflow + Peer Review                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          TOOL LAYER                                     │ │
│  │   MCP Server (role-scoped) + External Integrations                     │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          DATA LAYER                                     │ │
│  │   PostgreSQL (state, history) + Redis (cache, simple queues)           │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What NOT to Change

- ✅ Keep MCP for tools (works well)
- ✅ Keep draft approval for external comms
- ✅ Keep Phaser for visualization
- ✅ Keep PostgreSQL + Redis for data
- ✅ Keep WebSocket for real-time

The core architecture is sound. These changes add:
- TDD for quality
- Temporal for durability
- Full company for autonomy
- Hierarchy for scalability
