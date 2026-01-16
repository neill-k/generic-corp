# Phase 1 Completion Plan (TDD Mandatory)

**Project**: Generic Corp (pnpm workspace monorepo)

**Goal**: Complete Phase 1 by delivering a **REST-driven, end-to-end (E2E) agent task execution integration test** that uses the **real Claude Agent SDK**, proving:
- a task can be created via REST
- task execution can be triggered via REST
- BullMQ worker processes the job
- agent execution calls the real SDK (not simulation)
- persisted `task.result.tokensUsed` shows **input > 0** and **output > 0**

This plan is written under the constraints:
- **TDD mandatory**: write the failing E2E test first, then implement minimal code to make it pass.
- **Services running**: Docker Postgres + Redis are running externally during tests.
- **REST APIs**: test uses REST endpoints (not WebSocket) to create and execute tasks.
- **Real SDK**: execution uses `@anthropic-ai/claude-agent-sdk` and requires `ANTHROPIC_API_KEY`.

---

## Current State (verified from code)

### REST API
- `POST /api/tasks` creates a DB task and returns it.
- There is currently **no REST endpoint** to enqueue/execute a task.

**File**: `apps/server/src/api/index.ts`

### Queue / Worker
- BullMQ queue and worker are initialized on server startup.
- Worker listens to `EventBus.on("task:queued")` and enqueues a BullMQ job.

**Files**:
- `apps/server/src/index.ts` (calls `initializeQueues(io)`)
- `apps/server/src/queues/index.ts` (Queue + Worker + EventBus hook)

### WebSocket
- WebSocket task assignment triggers queueing by emitting `EventBus.emit("task:queued", ...)`.

**File**: `apps/server/src/websocket/index.ts`

### Agent runtime
- `BaseAgent.executeTask()` always simulates evaluation and returns a simulated output.
- Tokens are currently **hardcoded to 0**.

**File**: `apps/server/src/agents/base-agent.ts`

### Tests
- No test framework or test files exist in repo today.

---

## Phase 1 Definition of Done (DoD)

Phase 1 is complete when:

1) A new REST endpoint exists:
- `POST /api/tasks/:id/execute` enqueues the task by emitting `EventBus.emit("task:queued", { agentId: <uuid>, task })`.

2) Agent SDK integration exists (real calls):
- When the worker executes `agent.executeTask(...)`, it calls **Claude Agent SDK** and returns a `TaskResult` where:
  - `success === true`
  - `tokensUsed.input > 0`
  - `tokensUsed.output > 0`

3) A server E2E test exists and passes:
- Test uses REST APIs to create + execute a task
- Test polls task status until completion
- Test asserts tokensUsed input/output > 0

4) Docs updated:
- `README.md` Phase 1 checklist item “Full agent task execution test” is checked.

---

## Success Criteria (must be proven)

### Functional
- **Task creation** via `POST /api/tasks` returns `201` with a task id.
- **Task execution trigger** via `POST /api/tasks/:id/execute` returns `200` and enqueues a job.
- **Worker processes** the job and completes the task.

### Observable
- Polling `GET /api/tasks/:id` shows:
  - `status: pending -> in_progress -> completed`
  - `result` is populated

### Pass/Fail (binary)
- Test passes only if:
  - `result.tokensUsed.input > 0` AND `result.tokensUsed.output > 0`
  - `status === "completed"`
  - `result.success === true`

---

## Test Plan (MANDATORY)

### Objective
Verify end-to-end execution: REST → DB → queue job → worker → real Claude Agent SDK → DB result.

### Prerequisites
- Docker services running:
  - Postgres
  - Redis
- Server env configured:
  - `DATABASE_URL`
  - `REDIS_HOST`, `REDIS_PORT`
  - `ANTHROPIC_API_KEY`

### Test Cases

1) **E2E: create + execute + complete**
- Input:
  - POST `/api/tasks` body: `{ agentId: "Sable Chen", title: "E2E: 2+2", description: "What is 2+2? Answer with just the number.", priority: "normal" }`
  - POST `/api/tasks/:id/execute`
- Expected:
  - GET `/api/tasks/:id` eventually returns:
    - `status === "completed"`
    - `result.success === true`
    - `result.tokensUsed.input > 0`
    - `result.tokensUsed.output > 0`
- How to verify:
  - Poll endpoint with timeout (e.g. 120s)

### Success Criteria
ALL test cases pass.

### How to Execute
- From repo root:
  - `pnpm --filter @generic-corp/server run test`

---

## Implementation Plan (TDD-driven)

### Step 1 — Install & configure server test runner

**Goal**: `pnpm --filter @generic-corp/server run test` executes Vitest and can run Node integration tests.

**Actions**
- Add dev deps to `apps/server`:
  - `vitest`
  - `undici` (or use Node 20 global `fetch`, but be consistent)
  - optional: `wait-on` (or implement simple polling)

- Add scripts in `apps/server/package.json`:
  - `test`: run vitest with appropriate config/timeout

- Add Vitest config in `apps/server` (or inline via package.json).
- Ensure ESM TS works.

**Evidence**
- `pnpm --filter @generic-corp/server run test` runs and discovers tests.

---

### Step 2 — Write failing E2E test first

**Goal**: test fails because `/api/tasks/:id/execute` doesn’t exist and/or SDK not wired.

**Test structure**
- Start server process in test lifecycle (recommended):
  - spawn `pnpm --filter @generic-corp/server run dev` or `node dist/index.js` depending on scripts
  - wait for `GET /health` returns 200

- Use REST calls:
  1. POST `/api/tasks`
  2. POST `/api/tasks/:id/execute`
  3. Poll `GET /api/tasks/:id` until completed/failed

**Assertions**
- Final task:
  - status = completed
  - result.success = true
  - result.tokensUsed.input > 0
  - result.tokensUsed.output > 0

**Timeouts**
- Per-test timeout: 120s

**Skip behavior**
- If `ANTHROPIC_API_KEY` missing, skip (not fail):
  - `describe.skipIf(!process.env.ANTHROPIC_API_KEY)(...)`

**Evidence**
- First run shows red (expected failing reason is stable / explanatory).

---

### Step 3 — Add REST execution endpoint: `POST /api/tasks/:id/execute`

**Goal**: REST can enqueue a task by emitting `task:queued` event.

**Location**
- `apps/server/src/api/index.ts`

**Behavior**
- Validate task exists
- Validate task status is executable:
  - recommended: only allow `pending`
- Emit:
  - `EventBus.emit("task:queued", { agentId: task.agentId, task })`
- Return `{ success: true, taskId }`

**Expected impact on test**
- Test progresses from 404 to queue execution.

---

### Step 4 — Integrate real Claude Agent SDK into BaseAgent

**Goal**: agent execution calls the real SDK and returns tokensUsed input/output > 0.

**Location**
- `apps/server/src/agents/base-agent.ts`

**SDK**
- Package: `@anthropic-ai/claude-agent-sdk`
- Auth: `ANTHROPIC_API_KEY`

**Execution approach (minimal Phase 1)**
- Use `query(...)` with:
  - `systemPrompt`: agent personality prompt
  - `prompt`: content from `buildPrompt(context)`
  - `options.model`: choose a stable, fast model
  - `allowedTools`: `[]` (to avoid tools)
  - `permissionMode`: `bypassPermissions`
  - `maxTurns`: small bounded number (e.g. 5–10)
  - optional: `maxBudgetUsd` to cap spend

**Token accounting**
- Map SDK usage fields to `tokensUsed.input` and `tokensUsed.output`.
- Ensure both are > 0 in normal operation.

**Persistence**
- Keep existing session creation in DB.
- Store tokens/tool calls in `agentSession` as currently done.

**Expected impact on test**
- tokensUsed will become non-zero, turning test green.

---

### Step 5 — Make execution deterministic enough for CI/dev

**Goal**: reduce flakiness.

**Steps**
- Ensure prompt requests a strict format.
- Increase timeouts appropriately.
- Add simple retries for polling.
- Keep budget caps.

---

### Step 6 — Update docs (Phase 1 closeout)

- Update `README.md`: check “Full agent task execution test”.
- Update `STATUS.md`: mark Claude SDK integration as complete (if true after Step 4).

---

## Rollout / Risk Notes

- This is a **live external API test**; it should be skipped automatically if `ANTHROPIC_API_KEY` is not present.
- If token breakdown is not available as input/output separately, the implementation must find a credible source of both counts; otherwise the test requirement (both >0) cannot be satisfied.

---

## Files Expected to Change (implementation phase)

**Server**
- `apps/server/package.json` (test scripts + deps)
- `apps/server/src/api/index.ts` (new execute endpoint)
- `apps/server/src/agents/base-agent.ts` (SDK integration)
- `apps/server/<vitest config file>`
- `apps/server/<test file>`

**Docs**
- `README.md`
- `STATUS.md`

---

## Commands Checklist (implementation verification)

- `pnpm install`
- `pnpm docker:up`
- `pnpm --filter @generic-corp/server run db:generate`
- `pnpm --filter @generic-corp/server run db:push`
- `pnpm --filter @generic-corp/server run test`

---

## Exit Criteria

Phase 1 is declared complete only when:
- The E2E test passes with **real Claude Agent SDK** and **tokensUsed input/output > 0**.
- README checkbox updated.
