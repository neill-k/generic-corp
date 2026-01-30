# GENERIC CORP: Implementation Plan

> A fully autonomous software development company powered by AI agents.

**Last Updated**: January 2026
**Status**: Phase 1 Complete, Phase 2 In Progress

---

## Table of Contents

1. [Vision](#vision)
2. [Architecture Overview](#architecture-overview)
3. [Implementation Phases](#implementation-phases)
4. [Detailed Task Breakdown](#detailed-task-breakdown)
5. [Cron Jobs & Scheduled Work](#cron-jobs--scheduled-work)
6. [Agent Roster](#agent-roster)
7. [Quality Standards](#quality-standards)
8. [Success Metrics](#success-metrics)

---

## Vision

GENERIC CORP is a fully autonomous software development company where AI agents:
- Build software (engineering)
- Design products (product)
- Create content and manage social presence (marketing)
- Generate leads and close deals (sales)
- Manage finances (finance)
- Handle operations (HR, legal, admin)

**Humans provide strategic oversight, not operational approval.**

The isometric game interface provides visibility into agent activity, but the company runs autonomously 24/7 via scheduled cron jobs.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GENERIC CORP (Autonomous)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRESENTATION: React Dashboard + Phaser Isometric View                       │
│                              │                                               │
│                         WebSocket                                            │
│                              │                                               │
│  ORCHESTRATION:  ┌───────────────────────┐  ┌────────────────────────────┐  │
│                  │       Temporal         │  │         BullMQ             │  │
│                  │  - Agent workflows     │  │  - Cron jobs (scheduled)   │  │
│                  │  - Multi-step tasks    │  │  - Notifications           │  │
│                  │  - Durable execution   │  │  - Rate-limited calls      │  │
│                  └───────────────────────┘  └────────────────────────────┘  │
│                              │                                               │
│  DEPARTMENTS:    ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│                  │ ENG │ │DATA │ │PROD │ │ MKT │ │SALES│ │ FIN │ │ OPS │   │
│                  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘   │
│                              │                                               │
│  AGENTS:         CLI-based agent runtime + TDD Workflow + Peer Review        │
│                              │                                               │
│  TOOLS:          MCP Server (role-scoped) + External Integrations            │
│                              │                                               │
│  DATA:           PostgreSQL (state) + Redis (cache, queues)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

| Phase | Name | Duration | Status |
|-------|------|----------|--------|
| 1 | Foundation | 2 weeks | ✅ Complete |
| 2 | Core Game Interface | 2 weeks | 🔄 In Progress |
| 3 | Agent SDK Integration | 2 weeks | ⏳ Pending |
| 4 | Temporal Migration | 2 weeks | ⏳ Pending |
| 5 | Full Company Expansion | 2 weeks | ⏳ Pending |
| 6 | Autonomous Operations | 2 weeks | ⏳ Pending |
| 7 | Polish & Production | 2 weeks | ⏳ Pending |

---

## Detailed Task Breakdown

### Phase 1: Foundation ✅ Complete

- [x] 1.1 Monorepo setup (pnpm workspaces)
- [x] 1.2 Docker infrastructure (PostgreSQL 16, Redis 7)
- [x] 1.3 Database schema (Prisma ORM)
- [x] 1.4 Seed initial agents (5 agents)
- [x] 1.5 REST API (agents, tasks, messages CRUD)
- [x] 1.6 WebSocket server (Socket.io)
- [x] 1.7 BullMQ task queue
- [x] 1.8 Internal EventBus
- [x] 1.9 BaseAgent class (simulation mode)
- [x] 1.10 Game frontend scaffold (Vite + React + Phaser)
- [x] 1.11 Shared types package
- [x] 1.12 Agent pixel art sprites

---

### Phase 2: Core Game Interface 🔄 In Progress

#### 2.1 Frontend Components
- [ ] 2.1.1 AgentPanel component (shows selected agent details)
- [ ] 2.1.2 TaskQueue component (pending/active tasks)
- [ ] 2.1.3 ActivityFeed component (real-time log)
- [ ] 2.1.4 MessageCenter component (inter-agent messages)
- [ ] 2.1.5 DraftOutbox component (pending external comms)
- [ ] 2.1.6 Dashboard layout (responsive grid)

#### 2.2 Phaser Isometric Scene
- [ ] 2.2.1 Office tilemap and floor layout
- [ ] 2.2.2 Agent sprite placement and animation
- [ ] 2.2.3 Status indicators (working, idle, blocked)
- [ ] 2.2.4 Click-to-select agent interaction
- [ ] 2.2.5 Thought bubbles for current task
- [ ] 2.2.6 60fps render loop decoupled from React

#### 2.3 Real-time Integration
- [ ] 2.3.1 WebSocket client setup
- [ ] 2.3.2 Zustand store for game state
- [ ] 2.3.3 Event handlers for agent updates
- [ ] 2.3.4 Event handlers for task updates
- [ ] 2.3.5 Event handlers for message updates
- [ ] 2.3.6 Optimistic UI updates

---

### Phase 3: Agent SDK Integration

#### 3.1 Test Infrastructure
- [ ] 3.1.1 Install Vitest test runner
- [ ] 3.1.2 Configure test environment
- [ ] 3.1.3 Create test utilities (mocks, fixtures)
- [ ] 3.1.4 Set up coverage reporting (80% minimum)

#### 3.2 TDD Workflow
- [ ] 3.2.1 Define Task schema with acceptanceCriteria field
- [ ] 3.2.2 Create TDD workflow executor
- [ ] 3.2.3 Implement test-first verification (must fail initially)
- [ ] 3.2.4 Implement test-pass verification
- [ ] 3.2.5 Add quality gates (typecheck, lint, test, coverage)

#### 3.3 Agent Runtime (CLI)
- [ ] 3.3.1 Install @anthropic-ai/agent-sdk
- [ ] 3.3.2 Create AgentRunner wrapper class
- [ ] 3.3.3 Implement conversation session management
- [ ] 3.3.4 Add token usage tracking
- [ ] 3.3.5 Implement streaming response handling
- [ ] 3.3.6 Add retry logic with exponential backoff

#### 3.4 MCP Tools Server
- [ ] 3.4.1 Set up MCP server infrastructure
- [ ] 3.4.2 Implement filesystem tools (read, write, edit)
- [ ] 3.4.3 Implement git tools (clone, commit, branch, merge)
- [ ] 3.4.4 Implement messaging tools (send, check_inbox)
- [ ] 3.4.5 Implement external_draft tool (requires approval)
- [ ] 3.4.6 Implement credential proxy (secure API calls)
- [ ] 3.4.7 Add role-based tool access control

#### 3.5 End-to-End Test
- [ ] 3.5.1 Write E2E test: create task → execute → verify completion
- [ ] 3.5.2 Verify real SDK integration (tokens_used > 0)
- [ ] 3.5.3 Verify tool execution
- [ ] 3.5.4 Verify state persistence

---

### Phase 4: Temporal Migration

#### 4.1 Temporal Infrastructure
- [ ] 4.1.1 Add Temporal to docker-compose.yml
- [ ] 4.1.2 Add Temporal UI container
- [ ] 4.1.3 Configure Temporal with PostgreSQL backend
- [ ] 4.1.4 Install @temporalio/client, @temporalio/worker, @temporalio/workflow

#### 4.2 Workflow Structure
- [ ] 4.2.1 Create workflows/ directory structure
- [ ] 4.2.2 Create activities/ directory structure
- [ ] 4.2.3 Create workers/ directory structure
- [ ] 4.2.4 Define activity interfaces

#### 4.3 Core Workflows
- [ ] 4.3.1 agentTaskWorkflow - single agent executing a task
- [ ] 4.3.2 tddWorkflow - test-driven development flow
- [ ] 4.3.3 peerReviewWorkflow - agent reviews another's code
- [ ] 4.3.4 escalationWorkflow - handle failures and escalate

#### 4.4 Activities
- [ ] 4.4.1 llmCall activity - invoke Claude
- [ ] 4.4.2 toolExecution activity - run MCP tools
- [ ] 4.4.3 gitOperations activity - git commands
- [ ] 4.4.4 testRunner activity - run test suite
- [ ] 4.4.5 notifyLead activity - escalation notification

#### 4.5 Migration
- [ ] 4.5.1 Create Temporal worker process
- [ ] 4.5.2 Migrate task execution from BullMQ to Temporal
- [ ] 4.5.3 Keep BullMQ for cron jobs only
- [ ] 4.5.4 Update API endpoints to start Temporal workflows
- [ ] 4.5.5 Add Temporal workflow status to UI

---

### Phase 5: Full Company Expansion

#### 5.1 Database Schema Updates
- [ ] 5.1.1 Add Department model
- [ ] 5.1.2 Add tier field to Agent (ceo, lead, worker)
- [ ] 5.1.3 Add reportsTo relation to Agent
- [ ] 5.1.4 Add department autonomy config (canApprove, mustEscalate)
- [ ] 5.1.5 Run migration

#### 5.2 New Agents - Product Department
- [ ] 5.2.1 Nina Patel (VP Product)
- [ ] 5.2.2 Design Agent
- [ ] 5.2.3 UX Research Agent

#### 5.3 New Agents - Marketing Department (Expanded)
- [ ] 5.3.1 Promote Kenji Ross to VP Marketing
- [ ] 5.3.2 Content Agent
- [ ] 5.3.3 Social Media Agent
- [ ] 5.3.4 SEO Agent

#### 5.4 New Agents - Sales Department (Expanded)
- [ ] 5.4.1 Promote Frankie Deluca to VP Sales
- [ ] 5.4.2 SDR Agent
- [ ] 5.4.3 Account Executive Agent

#### 5.5 New Agents - Finance Department (Expanded)
- [ ] 5.5.1 Walter Huang remains CFO
- [ ] 5.5.2 Accounting Agent

#### 5.6 New Agents - Operations Department (Expanded)
- [ ] 5.6.1 Promote Helen Marsh to Chief of Staff
- [ ] 5.6.2 HR Agent
- [ ] 5.6.3 Legal Agent

#### 5.7 Hierarchical Routing
- [ ] 5.7.1 Update task routing logic (CEO → Leads only)
- [ ] 5.7.2 Implement lead-to-worker assignment
- [ ] 5.7.3 Add parallel worker execution
- [ ] 5.7.4 Implement lead integration of worker results

---

### Phase 6: Autonomous Operations

#### 6.1 Cron Job Infrastructure
- [ ] 6.1.1 Define cron schedule schema
- [ ] 6.1.2 Create CronManager service
- [ ] 6.1.3 Add cron job registration API
- [ ] 6.1.4 Add cron job monitoring UI

#### 6.2 CEO Cron Jobs (Marcus)
- [ ] 6.2.1 Daily strategy review (9:00 AM)
- [ ] 6.2.2 Weekly planning session (Monday 10:00 AM)
- [ ] 6.2.3 Daily task prioritization (8:00 AM)
- [ ] 6.2.4 End-of-day status synthesis (6:00 PM)
- [ ] 6.2.5 Monthly OKR review (1st of month)

#### 6.3 Department Lead Cron Jobs
- [ ] 6.3.1 Sable: Daily engineering standup (9:30 AM)
- [ ] 6.3.2 Sable: Code review queue check (every 2 hours)
- [ ] 6.3.3 Nina: Daily product backlog review (10:00 AM)
- [ ] 6.3.4 Kenji: Content calendar check (daily 11:00 AM)
- [ ] 6.3.5 Frankie: Pipeline review (daily 9:00 AM)
- [ ] 6.3.6 Walter: Financial reconciliation (daily 8:00 AM)
- [ ] 6.3.7 Helen: Operations check (daily 8:30 AM)

#### 6.4 Worker Cron Jobs
- [ ] 6.4.1 All workers: Check inbox for new tasks (every 15 min)
- [ ] 6.4.2 All workers: Resume interrupted work (on startup)
- [ ] 6.4.3 Social Agent: Post scheduled content (per schedule)
- [ ] 6.4.4 SDR Agent: Follow-up on leads (daily 10:00 AM)
- [ ] 6.4.5 Accounting Agent: Process invoices (daily 9:00 AM)

#### 6.5 System Cron Jobs
- [ ] 6.5.1 Health check all agents (every 5 min)
- [ ] 6.5.2 Circuit breaker status check (every 1 min)
- [ ] 6.5.3 Token usage aggregation (hourly)
- [ ] 6.5.4 Dead letter queue processing (every 10 min)
- [ ] 6.5.5 Database cleanup (daily 3:00 AM)
- [ ] 6.5.6 Redis cache pruning (hourly)

#### 6.6 Cross-Department Workflows
- [ ] 6.6.1 Feature launch workflow (Product → Eng → Marketing → Sales)
- [ ] 6.6.2 Bug fix workflow (Support → Eng → QA)
- [ ] 6.6.3 Content publish workflow (Marketing → Legal → Publish)
- [ ] 6.6.4 Customer onboarding workflow (Sales → Ops → Success)

#### 6.7 Circuit Breakers & Resilience
- [ ] 6.7.1 Implement agent-level circuit breaker
- [ ] 6.7.2 Implement department-level circuit breaker
- [ ] 6.7.3 Add automatic backup agent assignment
- [ ] 6.7.4 Add escalation chain (Agent → Lead → CEO → Human)
- [ ] 6.7.5 Add self-healing retry with context

---

### Phase 7: Polish & Production

#### 7.1 Performance Optimization
- [ ] 7.1.1 Object pooling for Phaser sprites
- [ ] 7.1.2 Batched state updates
- [ ] 7.1.3 Database query optimization
- [ ] 7.1.4 Redis caching strategy
- [ ] 7.1.5 WebSocket message batching

#### 7.2 Observability
- [ ] 7.2.1 Structured logging (pino)
- [ ] 7.2.2 Metrics collection (prometheus)
- [ ] 7.2.3 Distributed tracing (opentelemetry)
- [ ] 7.2.4 Dashboard for system health
- [ ] 7.2.5 Alerting for critical failures

#### 7.3 Security Hardening
- [ ] 7.3.1 Input sanitization audit
- [ ] 7.3.2 Credential proxy audit
- [ ] 7.3.3 Rate limiting configuration
- [ ] 7.3.4 CORS configuration
- [ ] 7.3.5 Security headers (Helmet.js)

#### 7.4 Documentation
- [ ] 7.4.1 API documentation (OpenAPI)
- [ ] 7.4.2 Agent prompt documentation
- [ ] 7.4.3 Deployment guide
- [ ] 7.4.4 Operations runbook

#### 7.5 Production Deployment
- [ ] 7.5.1 Docker production builds
- [ ] 7.5.2 Environment configuration
- [ ] 7.5.3 Database migrations
- [ ] 7.5.4 Load testing
- [ ] 7.5.5 Staged rollout

---

## Cron Jobs & Scheduled Work

This section details the autonomous operation schedule that keeps GENERIC CORP running 24/7.

### CEO (Marcus Bell) - Strategic Cadence

| Job | Schedule | Description |
|-----|----------|-------------|
| `ceo:daily-priorities` | 8:00 AM | Review company state, set daily priorities |
| `ceo:strategy-review` | 9:00 AM | Analyze metrics, adjust strategy |
| `ceo:status-synthesis` | 6:00 PM | Compile daily summary, identify blockers |
| `ceo:weekly-planning` | Mon 10:00 AM | Create weekly goals, distribute to leads |
| `ceo:monthly-okr` | 1st 9:00 AM | Review OKRs, set new targets |

```typescript
// CEO cron implementation
const ceoCrons = [
  {
    name: 'ceo:daily-priorities',
    pattern: '0 8 * * *',  // 8:00 AM daily
    workflow: 'ceoDailyPrioritiesWorkflow',
    description: 'Review state, create tasks for leads',
  },
  {
    name: 'ceo:weekly-planning',
    pattern: '0 10 * * 1',  // 10:00 AM Monday
    workflow: 'ceoWeeklyPlanningWorkflow',
    description: 'Create weekly strategy and distribute goals',
  },
];
```

### Department Leads - Operational Cadence

| Agent | Job | Schedule | Description |
|-------|-----|----------|-------------|
| Sable | `eng:standup` | 9:30 AM | Check blocked tasks, reassign work |
| Sable | `eng:review-queue` | Every 2h | Process pending code reviews |
| Sable | `eng:deploy-check` | 4:00 PM | Verify deployments, rollback if needed |
| Nina | `product:backlog` | 10:00 AM | Groom backlog, prioritize features |
| Kenji | `marketing:content` | 11:00 AM | Review content calendar, assign posts |
| Frankie | `sales:pipeline` | 9:00 AM | Review deals, assign follow-ups |
| Walter | `finance:reconcile` | 8:00 AM | Process transactions, flag issues |
| Helen | `ops:check` | 8:30 AM | Review operational status, tickets |

```typescript
const leadCrons = [
  // Engineering
  {
    name: 'eng:standup',
    pattern: '30 9 * * *',
    agentId: 'sable',
    workflow: 'engineeringStandupWorkflow',
  },
  {
    name: 'eng:review-queue',
    pattern: '0 */2 * * *',  // Every 2 hours
    agentId: 'sable',
    workflow: 'codeReviewQueueWorkflow',
  },

  // Marketing
  {
    name: 'marketing:content',
    pattern: '0 11 * * *',
    agentId: 'kenji',
    workflow: 'contentCalendarWorkflow',
  },

  // Sales
  {
    name: 'sales:pipeline',
    pattern: '0 9 * * *',
    agentId: 'frankie',
    workflow: 'pipelineReviewWorkflow',
  },
];
```

### Workers - Task Processing

| Job | Schedule | Description |
|-----|----------|-------------|
| `worker:check-inbox` | Every 15 min | Check for new assigned tasks |
| `worker:resume-work` | On startup | Resume any interrupted workflows |
| `worker:heartbeat` | Every 5 min | Report status, update activity |

```typescript
const workerCrons = [
  {
    name: 'worker:check-inbox',
    pattern: '*/15 * * * *',  // Every 15 minutes
    scope: 'all-workers',
    workflow: 'checkInboxWorkflow',
  },
  {
    name: 'worker:heartbeat',
    pattern: '*/5 * * * *',  // Every 5 minutes
    scope: 'all-workers',
    workflow: 'heartbeatWorkflow',
  },
];
```

### Specialized Agent Crons

| Agent | Job | Schedule | Description |
|-------|-----|----------|-------------|
| Social Agent | `social:post` | Per schedule | Publish scheduled social posts |
| Social Agent | `social:engage` | Every 4h | Check mentions, respond |
| SDR Agent | `sdr:followup` | 10:00 AM | Follow up on warm leads |
| SDR Agent | `sdr:research` | 2:00 PM | Research new prospects |
| Content Agent | `content:publish` | Per schedule | Publish scheduled blog posts |
| Accounting | `accounting:invoices` | 9:00 AM | Process pending invoices |
| Accounting | `accounting:reports` | Mon 8:00 AM | Generate weekly financial report |

### System Maintenance Crons

| Job | Schedule | Description |
|-----|----------|-------------|
| `system:health-check` | Every 5 min | Verify all agents responsive |
| `system:circuit-check` | Every 1 min | Check/reset circuit breakers |
| `system:token-aggregate` | Hourly | Aggregate token usage stats |
| `system:dead-letter` | Every 10 min | Process failed job queue |
| `system:db-cleanup` | 3:00 AM | Archive old records, vacuum |
| `system:redis-prune` | Hourly | Clear expired cache entries |
| `system:backup` | 2:00 AM | Database backup |

```typescript
const systemCrons = [
  {
    name: 'system:health-check',
    pattern: '*/5 * * * *',
    handler: 'healthCheckHandler',
    alertOnFailure: true,
  },
  {
    name: 'system:circuit-check',
    pattern: '* * * * *',  // Every minute
    handler: 'circuitBreakerHandler',
  },
  {
    name: 'system:db-cleanup',
    pattern: '0 3 * * *',  // 3:00 AM
    handler: 'databaseCleanupHandler',
  },
];
```

### Cron Manager Implementation

```typescript
// apps/server/src/services/cron-manager.ts

import { Queue } from 'bullmq';
import { CronJob } from '../types';

class CronManager {
  private queue: Queue;
  private jobs: Map<string, CronJob> = new Map();

  constructor(redisConnection: Redis) {
    this.queue = new Queue('crons', { connection: redisConnection });
  }

  async register(job: CronJob) {
    // Add repeatable job to BullMQ
    await this.queue.add(job.name, job.data, {
      repeat: { pattern: job.pattern },
      jobId: job.name,
    });

    this.jobs.set(job.name, job);
    console.log(`Registered cron: ${job.name} (${job.pattern})`);
  }

  async unregister(name: string) {
    await this.queue.removeRepeatable(name, { pattern: this.jobs.get(name)?.pattern });
    this.jobs.delete(name);
  }

  async pause(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      job.paused = true;
    }
  }

  async resume(name: string) {
    const job = this.jobs.get(name);
    if (job) {
      job.paused = false;
    }
  }

  getStatus(): CronStatus[] {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      pattern: job.pattern,
      paused: job.paused ?? false,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
    }));
  }
}
```

---

## Agent Roster

### Final Agent Count: 22 agents across 7 departments

| Dept | Lead | Workers | Total |
|------|------|---------|-------|
| Executive | Marcus (CEO) | - | 1 |
| Engineering | Sable | DeVonte, Miranda, Yuki | 4 |
| Data | Graham | (spawns workers) | 1+ |
| Product | Nina | Design Agent, UX Agent | 3 |
| Marketing | Kenji | Content, Social, SEO | 4 |
| Sales | Frankie | SDR, Account Exec | 3 |
| Finance | Walter | Accounting | 2 |
| Operations | Helen | HR, Legal | 3 |
| **Total** | | | **22** |

### Agent Hierarchy

```
Marcus Bell (CEO)
│
├── Sable Chen (VP Engineering)
│   ├── DeVonte Jackson (Senior Full-Stack)
│   ├── Miranda Okonkwo (Software Engineer)
│   └── Yuki Tanaka (SRE/DevOps)
│
├── Graham Sutton (VP Data)
│   └── [Dynamic analysis workers]
│
├── Nina Patel (VP Product)
│   ├── Design Agent
│   └── UX Research Agent
│
├── Kenji Ross (VP Marketing)
│   ├── Content Agent
│   ├── Social Media Agent
│   └── SEO Agent
│
├── Frankie Deluca (VP Sales)
│   ├── SDR Agent
│   └── Account Executive Agent
│
├── Walter Huang (CFO)
│   └── Accounting Agent
│
└── Helen Marsh (Chief of Staff)
    ├── HR Agent
    └── Legal Agent
```

---

## Quality Standards

### TDD is Mandatory

Every coding task follows this workflow:

```
1. Task received with acceptance criteria
2. Agent writes failing tests FIRST
3. System verifies tests fail (prevents false passes)
4. Agent implements until tests pass
5. Agent refactors (tests must stay green)
6. Peer agent reviews code
7. Quality gates run (typecheck, lint, test, coverage)
8. PR created for human review (async, non-blocking)
```

### Quality Gates

| Gate | Requirement | Blocking |
|------|-------------|----------|
| TypeScript | Compiles with strict mode | Yes |
| ESLint | No errors | Yes |
| Tests | All pass | Yes |
| Coverage | ≥80% on new code | Yes |
| Build | Successful | Yes |

### Code Review

- Different agent reviews code (not author)
- Review checks: bugs, error handling, security, test coverage
- Approved PRs get `agent-approved` label
- Humans can review async (not blocking)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Task completion rate | >90% |
| Time to first response | <30 seconds |
| Error recovery rate | >95% |
| Average cost per task | <$0.50 |
| Test coverage | ≥80% |
| Agent uptime | >99% |
| Cron job reliability | >99.9% |

---

## Appendix: Technology Stack

| Layer | Technology |
|-------|------------|
| Game Engine | Phaser 3.87+ |
| UI Framework | React 18 + TailwindCSS + Zustand |
| Agent Runtime | CLI-based runtime |
| Workflow Orchestration | Temporal.io |
| Job Scheduling | BullMQ (crons only) |
| Real-time | Socket.io (WebSocket) |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Language | TypeScript 5.x (strict) |
| Build | Vite + pnpm |
| Testing | Vitest |
| MCP Tools | Custom MCP server |
