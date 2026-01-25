# Generic Corp: Remaining Implementation Tasks

> Gap analysis comparing PROJECT_PLAN_DETAILED.md against current codebase state

**Date**: January 2026

---

## Critical Decision Required

> **Architecture Conflict Detected**: The PROJECT_PLAN_DETAILED.md requires Temporal for durable workflows, but the more recent Game Design Document (January 2026) explicitly states Temporal is "over-engineering" and BullMQ handles all needs.
>
> **Before proceeding**: Clarify whether to:
> - **Option A**: Implement Temporal as specified (adds pause/resume/cancel semantics, durability)
> - **Option B**: Stay with BullMQ (simpler, already working, aligns with design doc)
>
> This decision affects the entire Phase 4 scope below.

---

## Executive Summary

The Generic Corp project has **strong foundations** with core infrastructure in place. Based on analysis of the codebase against PROJECT_PLAN_DETAILED.md:

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Scaffold | Complete | 100% |
| Phase 2: Core Game Interface | Mostly Complete | ~85% |
| Phase 3: Agent SDK Integration | Mostly Complete | ~80% |
| Phase 4: Temporal Migration | Not Started | 0% |
| Phase 6: Autonomous Operations | Partial | ~20% |

**Key finding**: The project has diverged from the plan in beneficial ways (using Claude Agent SDK directly rather than a custom AgentRunner wrapper), but lacks the Temporal workflow infrastructure and autonomous cron operations described in the plan.

---

## Phase 2: Core Game Interface

### Implemented

| Task | Component | Status | Notes |
|------|-----------|--------|-------|
| 2.1.1 | AgentPanel | **Partial** | Dashboard.tsx contains agent panel functionality but not as standalone component |
| 2.1.2 | TaskQueue | **Implemented** | Integrated into Dashboard.tsx |
| 2.1.3 | ActivityFeed | **Implemented** | `apps/game/src/components/ActivityFeed.tsx` exists |
| 2.2.1 | Office Tilemap | **Implemented** | `GameCanvas.tsx` has full isometric office with procedural generation |

### Remaining Tasks

#### Task 2.1.1: Extract AgentPanel as Standalone Component

**Current State**: Agent panel functionality is embedded in `Dashboard.tsx`

**Remaining Work**:
- [ ] Extract `AgentPanel.tsx` as separate component matching plan spec
- [ ] Add AgentAvatar, StatusBadge, TaskCard, StatCard sub-components
- [ ] Add `formatNumber` and `formatTimeAgo` utilities
- [ ] Export from `components/index.ts`

**Files to Create**:
```
apps/game/src/components/AgentPanel.tsx
```

**Estimated Effort**: Small (2-3 hours)

---

#### Task 2.1.2: Enhance TaskQueue Component

**Current State**: Basic task display in Dashboard, lacks grouping and expand/collapse

**Remaining Work**:
- [ ] Create standalone `TaskQueue.tsx` with status grouping
- [ ] Add PriorityIndicator component
- [ ] Add ChevronIcon for expand/collapse
- [ ] Implement `groupTasksByStatus` utility
- [ ] Add cancel button with hover state

**Files to Create**:
```
apps/game/src/components/TaskQueue.tsx
```

**Estimated Effort**: Small (3-4 hours)

---

#### Task 2.x: Missing Components from Plan

**MessagePanel Component**:
- Current: `MessageCenter.tsx` exists with basic functionality
- Gap: Plan may have envisioned additional features

**Estimated Effort**: Review needed

---

## Phase 3: Agent SDK Integration

### Implemented

| Task | Description | Status | Notes |
|------|-------------|--------|-------|
| 3.3.1 | Install Claude Agent SDK | **Implemented** | Using `@anthropic-ai/claude-code` |
| 3.3.2 | AgentRunner Wrapper | **Diverged** | Uses `BaseAgent` class with Claude SDK directly |
| 3.4.1 | MCP Server Infrastructure | **Implemented** | `apps/server/src/services/tools/index.ts` provides tools |

### Key Implementation Differences

The codebase uses a **different but valid approach**:

**Plan**: Custom `AgentRunner` class wrapping raw Anthropic SDK
**Actual**: `BaseAgent` class using Claude Agent SDK's built-in session management

**Current Architecture** (`apps/server/src/agents/base-agent.ts`):
- Uses `@anthropic-ai/claude-code` SDK directly
- Custom MCP server with game-specific tools
- Personality prompts per agent
- Session management via Prisma
- Streaming execution with token tracking

### Remaining Tasks

#### Task 3.x: Complete Remaining Agent Implementations

**Current State**: 5 agents implemented (Marcus, Sable, DeVonte, Yuki, Gray)

**Remaining Agents** (defined in constants but not implemented):
- [ ] Miranda (Marketing Lead) - `miranda-agent.ts`
- [ ] Helen (HR Director) - `helen-agent.ts`
- [ ] Walter (Finance) - `walter-agent.ts`
- [ ] Frankie (Operations) - `frankie-agent.ts`
- [ ] Kenji (Designer) - `kenji-agent.ts`

**Files to Create**:
```
apps/server/src/agents/miranda-agent.ts
apps/server/src/agents/helen-agent.ts
apps/server/src/agents/walter-agent.ts
apps/server/src/agents/frankie-agent.ts
apps/server/src/agents/kenji-agent.ts
```

**Estimated Effort**: Medium (2-3 hours per agent, 10-15 hours total)

---

#### Task 3.x: Tool Handler Completion

**Current State**: `apps/server/src/services/tools/index.ts` has core tools

**Potentially Missing Tools** (from plan):
- [ ] `filesystem_list` - Directory listing
- [ ] `git_status` - Git repository status
- [ ] `task_create` - Create tasks programmatically
- [ ] `shell_exec` - Restricted shell execution (may be intentionally excluded for security)

**Estimated Effort**: Small (3-4 hours)

---

## Phase 4: Temporal Migration (NOT STARTED)

> **Critical Gap**: This entire phase is unimplemented

### Current State
- BullMQ handles task queue (`apps/server/src/queues/index.ts`)
- No Temporal infrastructure exists
- Docker Compose has placeholder for Temporal but no config

### Required Tasks

#### Task 4.1.1: Add Temporal to docker-compose.yml

**Remaining Work**:
- [ ] Add Temporal server service
- [ ] Add Temporal admin-tools service
- [ ] Add Temporal UI service
- [ ] Create `temporal-config/development.yaml`
- [ ] Create PostgreSQL init script for Temporal databases

**Files to Create/Modify**:
```
docker-compose.yml                           # Add services
temporal-config/development.yaml             # Dynamic config
scripts/init-temporal-db.sql                 # Already exists, may need updates
```

**Estimated Effort**: Medium (2-3 hours)

---

#### Task 4.2.x: Install Temporal SDK

**Remaining Work**:
- [ ] Install `@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow`, `@temporalio/activity`
- [ ] Create Temporal client configuration
- [ ] Create Temporal connection module

**Files to Create**:
```
apps/server/src/temporal/client.ts
apps/server/src/temporal/connection.ts
```

**Estimated Effort**: Small (1-2 hours)

---

#### Task 4.3.1: Create agentTaskWorkflow

**Remaining Work**:
- [ ] Create activity definitions (`agentActivities.ts`)
  - `executeAgentStep`
  - `updateTaskStatus`
  - `updateAgentStatus`
  - `runTests`
  - `verifyTaskCompletion`
  - `notifyLead`
- [ ] Create main workflow (`agentTaskWorkflow.ts`)
  - Signal handlers (cancel, pause, resume)
  - Main execution loop
  - Verification step
  - Error handling

**Files to Create**:
```
apps/server/src/temporal/workflows/agentTaskWorkflow.ts
apps/server/src/temporal/activities/agentActivities.ts
```

**Estimated Effort**: Large (8-10 hours)

---

#### Task 4.x: Create Temporal Worker

**Remaining Work**:
- [ ] Create worker entry point
- [ ] Register activities and workflows
- [ ] Add worker to startup sequence

**Files to Create**:
```
apps/server/src/temporal/worker.ts
```

**Estimated Effort**: Medium (3-4 hours)

---

#### Task 4.x: Migrate from BullMQ to Temporal

**Remaining Work**:
- [ ] Update task queue to use Temporal client
- [ ] Deprecate BullMQ job processing
- [ ] Update WebSocket handlers to start Temporal workflows
- [ ] Add workflow status querying

**Estimated Effort**: Large (6-8 hours)

---

## Phase 6: Autonomous Operations

### Implemented

| Component | Status | Notes |
|-----------|--------|-------|
| Agent Scheduler | **Partial** | `agent-scheduler.ts` exists with basic auto-wake |

### Remaining Tasks

#### Task 6.1.2: Create CronManager Service

**Current State**: No CronManager exists

**Remaining Work**:
- [ ] Create `CronManager` class with BullMQ repeatable jobs
- [ ] Implement register/unregister/pause/resume
- [ ] Add job status tracking
- [ ] Create singleton accessor

**Files to Create**:
```
apps/server/src/services/CronManager.ts
```

**Estimated Effort**: Medium (4-5 hours)

---

#### Task 6.x: Create CEO Cron Jobs

**Remaining Work**:
- [ ] `ceo:daily-priorities` - 8 AM daily review
- [ ] `ceo:weekly-planning` - Monday morning strategy
- [ ] `ceo:status-synthesis` - 6 PM daily summary
- [ ] `ceo:monthly-okr` - Monthly OKR review

**Files to Create**:
```
apps/server/src/crons/ceo.ts
```

**Estimated Effort**: Medium (3-4 hours)

---

#### Task 6.x: Create Worker Cron Jobs

**Remaining Work**:
- [ ] `workers:check-inbox` - Every 15 min task pickup
- [ ] `workers:heartbeat` - Every 5 min health check

**Files to Create**:
```
apps/server/src/crons/workers.ts
```

**Estimated Effort**: Small (2-3 hours)

---

#### Task 6.x: Create System Cron Jobs

**Remaining Work**:
- [ ] `system:health-check` - Every 5 min
- [ ] `system:token-aggregate` - Hourly token usage
- [ ] `system:db-cleanup` - Daily old record cleanup
- [ ] `system:circuit-check` - Per-minute circuit breaker check

**Files to Create**:
```
apps/server/src/crons/system.ts
```

**Estimated Effort**: Medium (3-4 hours)

---

#### Task 6.x: Cron Registration & Startup

**Remaining Work**:
- [ ] Create cron index with all job registrations
- [ ] Integrate into server startup
- [ ] Add graceful shutdown handling

**Files to Create**:
```
apps/server/src/crons/index.ts
```

**Estimated Effort**: Small (1-2 hours)

---

## Database Schema Gaps

### Missing Models (from plan)

Based on cron job references, these may be needed:

- [ ] `TokenUsageHourly` - Aggregated hourly token metrics
- [ ] `CircuitBreaker` - Circuit breaker state tracking
- [ ] `Draft` model with `status: 'pending_approval'` (may need enum update)

**Files to Modify**:
```
apps/server/prisma/schema.prisma
```

**Estimated Effort**: Small (2-3 hours including migration)

---

## Priority Ranking

### High Priority (Core Functionality)

1. **Remaining Agent Implementations** - 5 agents need personality prompts
2. **Phase 4: Temporal Infrastructure** - Critical for durable workflows
3. **CronManager Service** - Required for autonomous operation

### Medium Priority (Enhanced Features)

4. **CEO/Worker Cron Jobs** - Enables autonomous behavior
5. **System Cron Jobs** - Health and maintenance
6. **Component Extraction** - AgentPanel, TaskQueue as standalone

### Low Priority (Polish)

7. **Tool Handler Completion** - Additional MCP tools
8. **Database Schema Additions** - Supporting models

---

## Recommended Implementation Order

```
Phase 1: Complete Agents (1-2 days)
├── Implement miranda-agent.ts
├── Implement helen-agent.ts
├── Implement walter-agent.ts
├── Implement frankie-agent.ts
└── Implement kenji-agent.ts

Phase 2: Temporal Foundation (3-4 days)
├── Update docker-compose.yml with Temporal
├── Install Temporal SDK
├── Create connection and client modules
├── Create agentTaskWorkflow and activities
├── Create Temporal worker
└── Migrate task execution from BullMQ

Phase 3: Autonomous Operations (2-3 days)
├── Create CronManager service
├── Implement CEO cron jobs
├── Implement worker cron jobs
├── Implement system cron jobs
└── Integrate crons into startup

Phase 4: Polish (1-2 days)
├── Extract standalone components
├── Add missing database models
└── Complete tool handlers
```

---

## Acceptance Criteria (Overall)

- [ ] All 10 agents have implementations
- [ ] Temporal server runs in Docker (if Option A chosen)
- [ ] Tasks execute via Temporal workflows (if Option A chosen)
- [ ] Workflows can be cancelled/paused/resumed
- [ ] CEO runs daily/weekly/monthly autonomous routines
- [ ] Workers automatically pick up tasks
- [ ] System health is monitored
- [ ] All frontend components match plan structure

---

## Critical Questions Requiring Clarification

### Architecture Decisions

| Question | Impact | Default Assumption |
|----------|--------|-------------------|
| Temporal vs. BullMQ? | Blocks Phase 4 | Implement Temporal for durability |
| Migration strategy from BullMQ? | Data loss risk | Run parallel during migration |
| Agent tier hierarchy? | Reports-to chain unclear | Add `tier` enum and `reportsToId` FK |
| What happens on missed cron? | Server downtime behavior | Execute immediately with max staleness |

### Schema Additions Needed

| Model/Field | Purpose | Current State |
|-------------|---------|---------------|
| `TokenUsageHourly` | Aggregate metrics | Missing |
| `CircuitBreaker` | Failure tracking | Missing |
| `Agent.tier` | CEO/lead/worker | Missing |
| `Agent.reportsToId` | Hierarchy | Missing |
| `Agent.lastHeartbeat` | Stale detection | Missing |

### Agent Hierarchy (Recommended)

```
Marcus (CEO)
├── Sable (Principal Eng) - leads tech
│   ├── DeVonte (Full-Stack)
│   ├── Yuki (SRE)
│   ├── Gray (Data)
│   └── Kenji (Designer - if tech)
├── Helen (Exec Asst) - direct report
└── Miranda (VP Marketing)
    ├── Walter (Finance)
    └── Frankie (Sales)
```

---

## References

- `/home/nkillgore/generic-corp/docs/PROJECT_PLAN_DETAILED.md` - Source plan
- `/home/nkillgore/generic-corp/apps/server/src/agents/` - Existing agent implementations
- `/home/nkillgore/generic-corp/apps/server/src/services/agent-scheduler.ts` - Current scheduler
- `/home/nkillgore/generic-corp/packages/shared/src/constants.ts` - Agent configurations
