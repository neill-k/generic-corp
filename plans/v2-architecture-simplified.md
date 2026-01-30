# Generic Corp v2 — Agent-Native Architecture

> The platform is the garden; agents are the plants.
> We provide structure, information, and tools. Agents reason.

This is a **complete rewrite**. The `legacy/` directory contains the pre-overhaul codebase for reference only. Nothing is carried forward — every line of code is new.

---

## 1. Design Philosophy

This architecture follows [Every.to's agent-native principles](https://every.to/guides/agent-native):

| Pillar | What It Means For Us |
|--------|---------------------|
| **Parity** | Anything the human can do through the UI, agents can do through tools. The chat interface and the SDK invocation see the same state. |
| **Granularity** | Tools are atomic primitives (read file, write file, delegate task). Features are prompts that compose primitives, not hardcoded services. |
| **Composability** | New capabilities emerge from new prompts using existing tools. Adding a "weekly standup" feature = adding a prompt, not shipping code. |
| **Emergent Capability** | Agents do things we didn't anticipate by composing tools creatively. Failed attempts reveal tool gaps. |
| **Improvement Over Time** | Agents accumulate knowledge in context.md and docs/learnings/. The system gets smarter without code deploys. |

### What This Means In Practice

- **File-first**: Files are the universal interface. Agent state, board items, learnings, and digests are files in a workspace — not opaque DB records accessed through tools.
- **Agent-owned memory**: The agent controls its own context.md. The platform provides information (briefing) but never overwrites the agent's state.
- **Prompt-level trust**: Communication rules and behavior guidelines live in the system prompt, not enforced by SQL triggers or middleware.
- **Soft guardrails**: The system warns (e.g., context.md is large) rather than enforcing hard limits.
- **Claude Code is the runtime**: We don't build an agent framework. Claude Code *is* the runtime — accessed via the Agent SDK. We leverage its built-in file I/O, bash, MCP, and tool execution natively.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   React Dashboard (Vite SPA)             │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │   Chat   │ │Org Chart │ │  Kanban  │ │   Agent    │  │
│  │Interface │ │(React    │ │  Board   │ │   Detail   │  │
│  │(threads) │ │ Flow)    │ │          │ │   Panel    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘  │
│                     │ WebSocket + REST                   │
└─────────────────────┼───────────────────────────────────┘
                      │
┌─────────────────────┼───────────────────────────────────┐
│              Backend (TypeScript)                         │
│                      │                                   │
│  ┌───────────────────┼─────────────────────────────┐     │
│  │           HTTP/WS Gateway                       │     │
│  │   REST API  ·  WebSocket Hub  ·  Static Files   │     │
│  └───────────────────┬─────────────────────────────┘     │
│                      │                                   │
│  ┌──────────┐  ┌─────┴──────┐  ┌────────────────────┐   │
│  │  Agent   │  │   Task     │  │   Generic Corp     │   │
│  │ Lifecycle│  │   Queue    │  │   MCP Server       │   │
│  │ Manager  │  │  (BullMQ)  │  │   (in-process)     │   │
│  │          │  │            │  │                    │   │
│  │ SDK      │  │ Per-agent  │  │  delegate_task      │   │
│  │ query()  │  │ workers    │  │  finish_task        │   │
│  │ streams  │  │ Concur: 1  │  │  get_my_org         │   │
│  └────┬─────┘  └─────┬──────┘  │  get_agent_status   │   │
│       │              │         │  query_board        │   │
│       │              │         │  post_board_item     │   │
│       │              │         └────────────────────┘   │
│       │              │                                   │
│  ┌────┴──────────────┴──────────────────────────────┐   │
│  │               Database (PostgreSQL)               │   │
│  │  agents · tasks · messages · org_nodes             │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                      │
        ┌─────────────┼──────────────┐
   ┌────┴────┐   ┌────┴────┐   ┌────┴─────────────┐
   │Postgres │   │  Redis  │   │  Shared Workspace │
   │         │   │         │   │  (filesystem)     │
   │ State   │   │ BullMQ  │   │                   │
   │ History │   │ Pub/Sub │   │  board/            │
   │         │   │         │   │  docs/learnings/   │
   └─────────┘   └─────────┘   │  docs/digests/     │
                               │  .gc/ (per-agent)  │
                               └───────────────────┘
```

---

## 3. The Key Insight: Claude Code Is the Runtime

We don't build an agent framework, a tool executor, or a tool registry. Claude Code already has all of that. We build the **platform layer** that sits underneath and provides coordination.

| Capability | Claude Code Provides | We Build |
|-----------|---------------------|----------|
| File read/write | Read, Write, Edit tools | Nothing |
| Bash execution | Bash tool | Nothing |
| Git operations | Via Bash (git commands) | Nothing |
| MCP tool execution | Built-in MCP client | The MCP server (in-process) |
| Context management | Built-in summarization | context.md file convention |
| Web search | WebSearch tool | Nothing |
| Code analysis | Grep, Glob tools | Nothing |
| Subagent spawning | Task tool | Nothing |

**What we actually build (the platform):**

1. A **Generic Corp MCP server** exposing platform operations as tools (delegate, finish, status, board) — runs in-process via the SDK
2. **System prompt generator** — builds agent identity + briefing as a prompt, injected via `options.systemPrompt`
3. **Lifecycle manager** — calls `query()` from the Agent SDK, streams messages, captures results
4. **React dashboard** — chat interface, org chart, board, agent detail
5. **Skill definitions** — prompt sections for common workflows (review, standup, etc.)

Everything else — how the agent reads files, writes code, runs tests, reasons about problems, manages context — Claude Code handles natively.

### 3.1 The Agent Runtime Abstraction

v0 targets the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`). The lifecycle manager codes against an abstraction so we can swap runtimes later.

```typescript
// The runtime interface — v0 implements AgentSdkRuntime
interface AgentRuntime {
  invoke(params: AgentInvocation): AsyncGenerator<AgentEvent>;
}

interface AgentInvocation {
  agentId: string;
  taskId: string;
  prompt: string;
  systemPrompt: string;
  cwd: string;                    // Agent workspace path
  mcpServer: McpServerInstance;   // In-process MCP server
  allowedTools?: string[];
  model?: string;
}

// Events streamed during agent execution
type AgentEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_use"; tool: string; input: unknown }
  | { type: "tool_result"; tool: string; output: string }
  | { type: "message"; content: string }
  | { type: "result"; result: AgentResult };

interface AgentResult {
  output: string;
  costUsd: number;
  durationMs: number;
  numTurns: number;
  status: "success" | "error" | "max_turns";
}
```

**Three runtime implementations** (v0 ships with SDK; others are future):

| Runtime | How It Works | When To Use |
|---------|-------------|-------------|
| **Agent SDK** (v0) | `query()` — in-process, streaming, MCP via `type: "sdk"` | Default. Best DX, streaming, cost tracking. |
| **CLI** (future) | `child_process.spawn("claude", ["-p", ...])` — subprocess | When SDK isn't available or for isolation. |
| **Raw API** (future) | Direct Anthropic API with custom tool loop | Max control, custom models, no Claude Code dependency. |

---

## 4. Agent Runtime Model

### What Is an Agent?

An agent is a **Claude Code instance** invoked via the SDK with:

1. **System prompt** — identity, role, rules, tool docs (built by the platform per invocation)
2. **MCP server** — Generic Corp tools, passed in-process via `type: "sdk"`
3. **Workspace** — a git worktree with shared `board/`, `docs/`, and agent-specific `.gc/`

No BaseAgent class. No agent subclasses. No personality prompt embedded in TypeScript. The agent is Claude Code + a system prompt + an MCP connection.

### Execution Model (SDK)

```
Platform (Server Process)                    Claude Code (via SDK query())
   │                                              │
   │  1. Build system prompt:                     │
   │     - Agent identity (role, personality)     │
   │     - Briefing (current task, pending        │
   │       results, digests, board activity)      │
   │     - Context health warnings                │
   │  2. Create in-process MCP server             │
   │     with agent/task IDs bound                │
   │  3. Call query():                            │
   │     query({                                  │
   │       prompt: "<task prompt>",               │
   │       options: {                             │
   │         systemPrompt,                        │
   │         cwd: agentWorkspacePath,             │
   │         mcpServers: {                        │
   │           "generic-corp": {                  │
   │             type: "sdk",                     │
   │             instance: mcpServer              │
   │           }                                  │
   │         },                                   │
   │         permissionMode:                      │
   │           "bypassPermissions",               │
   │         model: "sonnet"                      │
   │       }                                      │
   │     })                                       │
   │──────────────────────────────────────────→   │
   │                                              │  4. Reads .gc/context.md (file tool)
   │  ← stream: thinking "Let me read..."        │  5. Does the work:
   │  ← stream: tool_use Read .gc/context.md     │     - Built-in tools (files, bash, git)
   │  ← stream: tool_use delegate_task           │     - MCP tools (delegate, finish, etc.)
   │  ← stream: tool_use Write .gc/context.md    │  6. Updates .gc/context.md
   │  ← stream: tool_use finish_task             │  7. Calls finish_task MCP tool
   │  ← stream: result { output, cost, turns }   │
   │←─────────────────────────────────────────   │
   │                                              │
   │  8. Process result:                          │
   │     - Store result in DB                     │
   │     - Write result to parent's .gc/results/  │
   │     - Create review task for parent          │
   │     - Update agent status                    │
   │     - WebSocket → UI update                  │
   │                                              │
```

**What streaming gives us that CLI doesn't:**

- Real-time tool call visibility in the dashboard (see the agent thinking, reading files, calling tools)
- Live cost tracking per invocation
- Ability to interrupt a running agent (`query.interrupt()`)
- In-process MCP server — no stdio spawning, no `.mcp.json` files, no env var plumbing

### Agent Configuration

Agent configs are seeded data. No YAML files, no config loading system, no hot-reload. Config changes take effect on next invocation (system prompt is rebuilt each time).

```typescript
// Seed data structure (conceptual)
const agents = [
  {
    name: "marcus",
    displayName: "Marcus Bell",
    role: "CEO",
    department: "Executive",
    level: "c-suite",
    reportsTo: null,
    personality: `You are Marcus Bell, CEO of Generic Corp.
You were hired to make this company self-sustaining.
You have world-class talent but zero revenue.
Your job is to decompose strategic goals into delegated work
and coordinate your direct reports effectively.`,
  },
  {
    name: "sable",
    displayName: "Sable Chen",
    role: "Principal Engineer",
    department: "Engineering",
    level: "lead",
    reportsTo: "marcus",
    personality: `You are Sable Chen, Principal Engineer at Generic Corp.
Ex-Google, ex-Stripe. Three patents.
You built beautiful infrastructure that serves no one.
You're methodical, thorough, and security-conscious.
You prefer architectural discussions before implementation.`,
  },
  // ... remaining agents
];
```

---

## 5. The Three-File Model

Each agent invocation sees three context sources with different ownership:

```
┌──────────────────────────────────────────────────────────────┐
│                      Agent Invocation                          │
│                                                                │
│  ┌───────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │   System Prompt   │  │  context.md  │  │   Briefing     │  │
│  │   (identity)      │  │   (memory)   │  │   (injected)   │  │
│  │                   │  │              │  │                │  │
│  │ Owner:            │  │ Owner:       │  │ Owner:         │  │
│  │  Platform         │  │  Agent       │  │ Platform       │  │
│  │                   │  │              │  │                │  │
│  │ Delivery:         │  │ Delivery:    │  │ Delivery:      │  │
│  │  options.         │  │  Agent reads │  │ Appended to    │  │
│  │  systemPrompt     │  │  the file    │  │ systemPrompt   │  │
│  │  (SDK param)      │  │  each run    │  │ each invoke    │  │
│  └───────────────────┘  └──────────────┘  └────────────────┘  │
│                                                                │
│  + prompt param: the immediate task ("Add user auth...")       │
└──────────────────────────────────────────────────────────────┘
```

### 5.1 System Prompt — Agent Identity + Briefing

Built by the platform each invocation. Passed via `options.systemPrompt` in the SDK call. Combines identity and briefing into a single prompt.

```markdown
# Agent Identity

You are **{role}** in the **{department}** department at Generic Corp.

## Your Role
{personality prompt}

## Your Position
- **Reports to**: {parent agent name and role}
- **Direct reports**: Use the `get_my_org` tool to discover your reports
- **Level**: {ic | lead | manager | vp | c-suite}

## Communication
You follow corporate chain-of-command:
- Delegate tasks to direct reports via the `delegate_task` tool
- Return results upward by calling `finish_task` when done
- Post updates, blockers, and findings to the shared board via `post_board_item`
- For cross-department communication, escalate through your reporting chain
- Read board/ and docs/ freely. Trust your judgment on relevance.

## Context Management
Your `.gc/context.md` is YOUR working memory. Read it at the start of each run.
Update it before finishing to reflect current goals, priorities, and key context.
Keep it forward-looking. If the system warns it's getting large, compact it.

## Available Tools
All standard Claude Code tools (file I/O, bash, git, grep, etc.) plus:
- `delegate_task` — assign work to a direct report
- `finish_task` — signal task completion with result and learnings
- `get_my_org` — discover your reports and their current status
- `get_agent_status` — check any agent's current status
- `query_board` — search the shared board for relevant items
- `post_board_item` — post a status update, blocker, or finding

---

# System Briefing
Generated: {timestamp}

## Your Current Task
**Task ID**: {uuid}
**From**: {delegator name, or "Human (via chat)"}
**Priority**: {level}
**Context from delegator**: {context string}

## Pending Results
{N} delegations you made have completed since last run:
- {agent} completed "{task}" → result: .gc/results/{task-id}.md

## Team Digest
{Latest digest from summarizer, or "No digest yet"}

## Board Activity
{N} new board items in your scope since last run:
- [blocker] {agent}: "{summary}" ({time ago})
- [status] {agent}: "{summary}" ({time ago})

## Context Health
{If context.md > soft limit}: Warning: your context.md is {N} tokens.
Consider compacting completed milestones.
```

### 5.2 context.md — Agent-Owned Memory

Lives at `.gc/context.md` in the agent's workspace. Agent reads and updates this via file tools. Platform never overwrites it.

Seeded on first invocation from the parent's delegation memo:

```markdown
# Working Context

## Current Objective
{From parent's delegation memo}

## Priorities
1. {From parent's delegation memo}

## Known Context
{Context provided by parent}

## Completed Milestones
(none yet)

## Blockers
(none identified)
```

Evolves over time as the agent works. A mature context.md:

```markdown
# Working Context

## Current Objective
Deliver user authentication with OAuth2 and session management.

## Priorities
1. Complete session middleware (backend-dev-1 finishing OAuth flow)
2. Review backend-dev-2's migration for sessions table
3. Coordinate with frontend lead on login UI

## Key Decisions
- Redis for session storage (faster lookup, natural TTL)
- OAuth2 via Google only for MVP

## Completed Milestones
- Auth endpoint scaffolding (2026-01-15)
- OAuth2 Google provider integration (2026-01-16)

## Blockers
- Waiting on frontend lead's API contract for login flow
```

---

## 6. Generic Corp MCP Server

A single MCP server created in-process using the Agent SDK's `createSdkMcpServer`. No `.mcp.json` files, no stdio spawning, no env var plumbing. The server instance is passed directly to `query()`.

### In-Process Server Creation

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

function createGcMcpServer(agentId: string, taskId: string) {
  return createSdkMcpServer({
    name: "generic-corp",
    version: "1.0.0",
    tools: [
      tool(
        "delegate_task",
        "Assign work to a direct report",
        z.object({
          targetAgent: z.string().describe("Name of the direct report"),
          prompt: z.string().describe("What to do"),
          context: z.string().describe("Relevant context"),
          priority: z.number().optional().describe("0=normal, higher=more urgent"),
        }),
        async (args) => {
          // Validate targetAgent is a direct report of agentId
          // Create task in DB, enqueue in BullMQ
          const task = await taskService.delegate(agentId, args);
          return {
            content: [{
              type: "text",
              text: `Delegated to ${args.targetAgent}. Task ${task.id} queued (position: ${task.queuePosition}).`,
            }],
          };
        }
      ),
      // ... remaining 5 tools (see Tool Definitions below)
    ],
  });
}
```

### Passing to Agent

```typescript
const mcpServer = createGcMcpServer(agent.id, task.id);

for await (const message of query({
  prompt: task.prompt,
  options: {
    systemPrompt: buildSystemPrompt(agent, task),
    cwd: agent.workspacePath,
    mcpServers: {
      "generic-corp": { type: "sdk", instance: mcpServer },
    },
    permissionMode: "bypassPermissions",
  },
})) {
  // Stream events to dashboard via WebSocket
  await handleAgentEvent(message, agent, task);
}
```

### Tool Definitions

Six tools. That's the entire platform API surface for agents.

**1. delegate_task** — Assign work to a direct report
```typescript
Input: { targetAgent: string, prompt: string, context: string, priority?: number }
Output: { taskId: string, status: "queued", queuePosition: number }
Validation: targetAgent must be a direct report of the calling agent
```

**2. finish_task** — Signal completion
```typescript
Input: {
  status: "completed" | "blocked" | "needs_followup",
  resultSummary: string,
  nextSteps?: string,
  learnings?: string,    // auto-written to docs/learnings/
  blockers?: string      // auto-posted to board if status=blocked
}
Output: { acknowledged: true }
Platform side-effects:
  completed → store result, create review task for parent
  blocked → post blocker to board, notify parent
  needs_followup → re-queue same agent at +1 priority
```

**3. get_my_org** — Discover reports and their status
```typescript
Input: {} (agent ID bound at server creation)
Output: {
  self: { name, role, department, manager },
  directReports: [{ name, role, status, currentTask, queuedTasks }]
}
```

**4. get_agent_status** — Check any agent's status
```typescript
Input: { agentName: string }
Output: { name, role, status, currentTask, department }
```

**5. query_board** — Search the shared board
```typescript
Input: { scope?: "team"|"department"|"org", type?: string, since?: string }
Output: [{ author, type, summary, timestamp, path }]
```

**6. post_board_item** — Post to the shared board
```typescript
Input: { type: "status_update"|"blocker"|"finding"|"request", content: string }
Side-effect: Writes board/{type}/{agent}-{timestamp}.md
Output: { path: string }
```

---

## 7. Workspace Layout

Each agent operates in a git worktree:

```
agent-workspace/
├── .gc/                               # Agent-specific (gitignored)
│   ├── context.md                     # Working memory (agent-owned)
│   └── results/                       # Completed delegation results
│       ├── {task-id-1}.md
│       └── {task-id-2}.md
│
├── board/                             # Shared state (synced via git)
│   ├── status-updates/
│   ├── blockers/
│   ├── findings/
│   ├── requests/
│   └── completed/                     # Archived items (moved, never deleted)
│
├── docs/
│   ├── learnings/                     # Compound engineering knowledge
│   └── digests/                       # Summarizer output
│       ├── team-{name}.md
│       ├── dept-{name}.md
│       └── org-wide.md
│
└── {project files}                    # The actual project being worked on
```

Note: No CLAUDE.md or `.mcp.json` in the workspace. Identity is injected via `options.systemPrompt` and MCP is passed in-process via `type: "sdk"`. The workspace is purely for the agent's working files.

---

## 8. Data Model

Four tables. Add more when actually needed.

```prisma
model Agent {
  id            String   @id @default(uuid())
  name          String   @unique      // slug: "marcus", "sable"
  displayName   String                // "Marcus Bell"
  role          String                // "CEO"
  department    String                // "Executive"
  level         String                // c-suite | vp | manager | lead | ic
  personality   String   @db.Text     // system prompt personality
  status        String   @default("idle") // idle | running | error | offline
  currentTaskId String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tasks         Task[]   @relation("assignee")
  delegated     Task[]   @relation("delegator")
  sentMessages  Message[] @relation("sender")
  receivedMsgs  Message[] @relation("recipient")
  orgNode       OrgNode?
}

model OrgNode {
  id            String    @id @default(uuid())
  agentId       String    @unique
  parentNodeId  String?
  position      Int       @default(0)

  agent         Agent     @relation(fields: [agentId], references: [id])
  parent        OrgNode?  @relation("hierarchy", fields: [parentNodeId], references: [id])
  children      OrgNode[] @relation("hierarchy")
}

model Task {
  id            String    @id @default(uuid())
  parentTaskId  String?
  assigneeId    String
  delegatorId   String?   // null = human-created
  prompt        String    @db.Text
  context       String?   @db.Text
  priority      Int       @default(0)
  status        String    @default("pending") // pending | running | completed | failed | blocked
  result        String?   @db.Text
  learnings     String?   @db.Text
  costUsd       Float?                        // from SDK result
  durationMs    Int?                           // from SDK result
  numTurns      Int?                           // from SDK result
  createdAt     DateTime  @default(now())
  startedAt     DateTime?
  completedAt   DateTime?

  assignee      Agent     @relation("assignee", fields: [assigneeId], references: [id])
  delegator     Agent?    @relation("delegator", fields: [delegatorId], references: [id])
  parentTask    Task?     @relation("subtasks", fields: [parentTaskId], references: [id])
  subtasks      Task[]    @relation("subtasks")
}

model Message {
  id            String    @id @default(uuid())
  fromAgentId   String?   // null = from human
  toAgentId     String
  threadId      String?   // for chat continuity
  subject       String?
  body          String    @db.Text
  type          String    @default("direct") // direct | system | chat
  status        String    @default("pending") // pending | delivered | read
  createdAt     DateTime  @default(now())
  readAt        DateTime?

  sender        Agent?    @relation("sender", fields: [fromAgentId], references: [id])
  recipient     Agent     @relation("recipient", fields: [toAgentId], references: [id])
}
```

No GameState. No CredentialProxy. No AgentSession. No Schedule. No TaskDependency. No ActivityLog. Add tables when you need them.

---

## 9. Frontend

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Build | Vite | Fast dev server, optimized builds |
| UI | React 18 + TypeScript | Component model fits dashboard UI |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| State | Zustand | Lightweight, minimal boilerplate |
| Routing | TanStack Router | Type-safe, file-based routing |
| Data Fetching | TanStack Query | Cache, refetch, optimistic updates |
| WebSocket | Native WebSocket or Socket.io | Real-time updates from backend |
| Org Chart | React Flow / xyflow | Interactive node graph with zoom/pan |

### View Structure

```
App
├── Layout (sidebar + main)
│   ├── Sidebar
│   │   ├── Org Tree (collapsed hierarchy navigation)
│   │   ├── System Status (agent counts, queue depth)
│   │   └── Quick Actions
│   │
│   └── Main Area (route-based)
│       ├── /chat                — ChatGPT-style interface
│       │   ├── Thread list (new / continue previous)
│       │   ├── Message stream
│       │   └── Input box
│       │
│       ├── /org                 — Org Chart (React Flow canvas)
│       │   ├── Agent nodes (name, role, status indicator)
│       │   ├── Reporting lines (edges)
│       │   └── Click → agent detail panel
│       │
│       ├── /board               — Kanban Board
│       │   ├── Columns: Active | Blocked | Completed
│       │   ├── Board items from board/ files
│       │   └── Filter by team/department
│       │
│       ├── /agents/:id          — Agent Detail
│       │   ├── Status + current task
│       │   ├── Live activity stream (from SDK message streaming)
│       │   ├── Task history with cost/duration
│       │   ├── context.md viewer (read-only)
│       │   └── Direct message input
│       │
│       └── /settings            — System config
```

### Chat Interface

The primary interaction is a **ChatGPT-style chat** that talks to the CEO agent:

- **Thread list**: Start new conversation or continue previous
- **Each message** becomes a task for the CEO agent
- **CEO's context.md** provides memory across conversations
- **Results** flow back as the CEO completes or delegates
- **Live agent activity** — SDK streaming shows tool calls in real-time
- **While-you-were-away** summary on reconnect

No game. No sprites. No isometric view. The dashboard *is* the interface.

---

## 10. Backend

### Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Same language as frontend. SDK + MCP SDK are TypeScript. Monorepo coherence. |
| HTTP | Express or Hono | Lightweight, well-understood |
| WebSocket | Socket.io or ws | Real-time UI updates |
| Database | PostgreSQL + Prisma | Relational data with type-safe ORM |
| Queue | BullMQ + Redis | Per-agent task queues with priority support |
| Agent Runtime | @anthropic-ai/claude-agent-sdk | SDK for invoking Claude Code programmatically |
| MCP | @anthropic-ai/claude-agent-sdk | `createSdkMcpServer` for in-process MCP |

### Server Components

```
src/
├── index.ts                    # Entry point — Express + WebSocket + BullMQ
├── api/
│   ├── routes.ts               # REST endpoints (agents, tasks, messages, chat)
│   └── middleware.ts            # Auth, error handling, CORS
├── ws/
│   └── hub.ts                  # WebSocket event broadcasting
├── mcp/
│   └── server.ts               # Generic Corp MCP server factory (6 tools)
├── services/
│   ├── agent-lifecycle.ts      # Invoke agents via AgentRuntime abstraction
│   ├── agent-runtime-sdk.ts    # SDK implementation: query() + streaming
│   ├── agent-runtime-cli.ts    # CLI implementation: child_process (future)
│   ├── prompt-builder.ts       # Build system prompt (identity + briefing)
│   ├── workspace-manager.ts    # Git worktree creation and management
│   ├── summarizer.ts           # Background digest generation (Haiku)
│   └── event-bus.ts            # Internal pub/sub for coordination
├── db/
│   ├── client.ts               # Prisma client export
│   └── seed.ts                 # Agent + org hierarchy seed data
└── prisma/
    └── schema.prisma           # Data model (4 tables)
```

### Key Processes

1. **HTTP/WS Server** — REST API + WebSocket for the frontend
2. **BullMQ Workers** (one per agent) — Dequeue tasks, invoke lifecycle manager
3. **MCP Server** (in-process, created per invocation) — Handles agent tool calls directly in the server process
4. **Summarizer** (background timer) — Generates digests with Haiku every ~10 minutes

### SDK Lifecycle Manager

```typescript
// services/agent-runtime-sdk.ts
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { AgentRuntime, AgentInvocation, AgentEvent } from "./agent-lifecycle.js";

export class AgentSdkRuntime implements AgentRuntime {
  async *invoke(params: AgentInvocation): AsyncGenerator<AgentEvent> {
    const queryInstance = query({
      prompt: params.prompt,
      options: {
        systemPrompt: params.systemPrompt,
        cwd: params.cwd,
        mcpServers: {
          "generic-corp": { type: "sdk", instance: params.mcpServer },
        },
        permissionMode: "bypassPermissions",
        model: params.model ?? "sonnet",
      },
    });

    for await (const message of queryInstance) {
      // Map SDK messages to our AgentEvent type
      if (message.type === "assistant") {
        yield { type: "message", content: message.message };
      } else if (message.type === "tool_use") {
        yield { type: "tool_use", tool: message.name, input: message.input };
      } else if (message.type === "tool_result") {
        yield { type: "tool_result", tool: message.name, output: message.output };
      } else if (message.type === "result") {
        yield {
          type: "result",
          result: {
            output: message.result,
            costUsd: message.total_cost_usd,
            durationMs: message.duration_ms,
            numTurns: message.num_turns,
            status: message.subtype === "success" ? "success" : "error",
          },
        };
      }
    }
  }
}
```

---

## 11. Key Flows

### 11.1 Human Sends Chat Message

```
Human                    Platform                      Claude Code (via SDK)
  │ "Add user auth       │                              │
  │  with Google OAuth"  │                              │
  │─────────────────────→│                              │
  │                      │ 1. Create Message             │
  │                      │    (threadId, body)           │
  │                      │ 2. Create Task                │
  │                      │    (assignee: CEO)            │
  │                      │ 3. Build system prompt        │
  │                      │    (identity + briefing)      │
  │                      │ 4. Create MCP server instance │
  │                      │ 5. query({                    │
  │                      │      prompt: "...",           │
  │                      │      options: {               │
  │                      │        systemPrompt,          │
  │                      │        cwd, mcpServers        │
  │                      │      }                        │
  │                      │    })                         │
  │                      │────────────────────────────→  │
  │  ← WS: agent running │                              │  Reads .gc/context.md
  │  ← WS: tool_use      │  ← stream: tool calls       │  Calls get_my_org
  │  ← WS: tool_use      │  ← stream: delegate_task    │  Calls delegate_task → Sable
  │                      │  ← stream: tool calls        │  Updates context.md
  │                      │  ← stream: finish_task       │  Calls finish_task
  │                      │  ← stream: result            │
  │                      │←────────────────────────────  │
  │                      │                              │
  │                      │ 6. Store result + cost        │
  │                      │ 7. Queue Sable's task         │
  │                      │ 8. Reply to chat thread       │
  │  ← WS: chat reply    │                              │
  │  ← WS: agent idle    │                              │
```

### 11.2 Delegation Cascade

CEO → VP → Lead → IC. Each level:
1. Platform builds system prompt (identity + briefing) and creates MCP server instance
2. `query()` invoked in agent's workspace
3. Agent reads context, decides to delegate further or do the work
4. Agent calls finish_task when done
5. Result flows to parent as a review task

**Parent is re-invoked per completed delegation result.** No batching.

### 11.3 Review Flow

When a child completes work:

- **IC → Lead**: Full code review. Lead sees git diff, reads files, runs tests, merges or requests changes.
- **Lead → VP+**: Summary review. Parent sees result summary, approves or sends back.
- **Merge conflicts**: Parent resolves as part of the review task (they have git tools).

### 11.4 Summarizer

Background process on a timer (~10 minutes):

1. Read recent board items and task completions from DB
2. Invoke `query()` with **Haiku** model to produce team/dept/org digests
3. Write digest files to `docs/digests/` in shared workspace
4. Commit to shared branch (visible to all agent worktrees)

### 11.5 Board Item Lifecycle

```
Created:   post_board_item → board/blockers/{agent}-{timestamp}.md
Active:    Visible via file I/O, included in summarizer digests
Resolved:  Moved to board/completed/ — never deleted, just archived
```

---

## 12. Skills

Skills are prompt sections appended to the system prompt when relevant. No code. Adding a new workflow = writing a new prompt block.

### Code Review
```markdown
When reviewing code from a direct report:
1. Read the git diff for the relevant branch
2. Check for correctness, security, and code style
3. If acceptable, merge. If not, call finish_task with "needs_followup"
4. Post a finding to the board summarizing the outcome
```

### Standup Report
```markdown
Produce a brief standup report:
1. Read context.md for current objectives
2. Check board/ for recent team activity
3. Post a status_update to the board
4. Update context.md with current priorities
```

### Compound Learning
```markdown
When you solve a non-obvious problem or discover a gotcha:
1. Write the learning to docs/learnings/{topic-slug}.md
2. Include: Problem, Solution, Key Insight
3. Add frontmatter: author, date, tags
4. Reference it in your context.md under Resources
```

---

## 13. What We Don't Build

| Omitted | Why |
|---------|-----|
| Phaser 3 / isometric game | Dashboard is the interface |
| Agent framework / BaseAgent class | Claude Code (via SDK) is the runtime |
| Tool executor / tool registry | SDK handles tool execution loop |
| Communication rules engine | Rules live in system prompt (prompt-level trust) |
| SQL state machine triggers | Application code handles transitions |
| Separate MCP servers per tool | One in-process MCP server with 6 tools |
| .mcp.json files | MCP server passed in-process via `type: "sdk"` |
| CLAUDE.md per workspace | Identity injected via `options.systemPrompt` |
| Temporal.io | BullMQ handles queuing and scheduling |
| Custom task poller | BullMQ workers handle this |
| Credential proxy | Premature — add when external APIs are needed |
| Game state / budget system | No game |
| Config hot-reload | Config changes apply on next invocation |
| YAML/JSON config loading | Seed data in code, system prompt rebuilt per invocation |

---

## 14. Implementation Sequence

### Phase 1: Platform Core
1. Project scaffolding (pnpm monorepo, TypeScript, Vite, Express, Prisma)
2. Database schema (4 models) + seed data (agents, org hierarchy)
3. `AgentRuntime` interface + `AgentSdkRuntime` implementation
4. In-process MCP server factory (`createGcMcpServer`) with 6 tools
5. System prompt builder (identity + briefing assembly)
6. BullMQ queue setup (one queue per agent, concurrency 1)
7. Workspace manager (git worktree creation)

### Phase 2: Dashboard
8. Chat interface (threads, send/receive, thread list)
9. Org chart (React Flow, agent nodes with status)
10. Board view (kanban from board/ files)
11. Agent detail panel (status, history, live activity stream, cost)
12. WebSocket real-time updates (agent events streamed from SDK)

### Phase 3: Agent Intelligence
13. End-to-end delegation flow (human → CEO → VP → IC → result cascade)
14. Summarizer (Haiku model via SDK, timed background process)
15. Skill prompt sections (review, standup, compound learning)

### Phase 4: Polish
16. Chat continuity (while-you-were-away summaries)
17. Board archival (completed/ folder)
18. Context health warnings
19. Error recovery (agent crash detection, task retry)
20. CLI runtime alternative (`AgentCliRuntime` for fallback)

---

## 15. Resolved Decisions

| Question | Answer |
|----------|--------|
| Agent runtime? | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) via `query()`. Runtime abstraction allows future swap to CLI or raw API. |
| Language? | TypeScript throughout. Same as frontend. SDK is TypeScript. |
| MCP server delivery? | In-process via `type: "sdk"`. No `.mcp.json` files. |
| Agent identity delivery? | `options.systemPrompt` param. No per-workspace CLAUDE.md. |
| Chat continuity? | ChatGPT-style threads. CEO's context.md provides memory. |
| Concurrent delegation results? | Parent re-invoked per result. No batching. |
| Config changes? | Take effect on next invocation. |
| Merge conflicts? | Parent resolves during review task. |
| Board cleanup? | Move to board/completed/. No TTL, no deletion. |
| Summarizer model? | Haiku via SDK. Cheap, fast, runs every ~10 minutes. |
| Cross-agent status queries? | `get_agent_status` MCP tool. Any agent can query any agent. |
| Git worktrees? | One per agent. board/ and docs/ synced via shared branch. |
| Agent framework? | None. Claude Code is the runtime, SDK is the interface. |
| Cost tracking? | Free from SDK result messages. Stored per-task in DB. |
| Live agent visibility? | SDK streaming → WebSocket → dashboard shows tool calls in real-time. |

---

## 16. Repository Structure (New)

```
generic-corp/
├── CLAUDE.md                   # Project instructions for Claude Code
├── .gitignore
├── legacy/                     # Pre-overhaul codebase (read-only reference)
├── plans/                      # Architecture docs
│
├── apps/
│   ├── server/                 # Backend
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── api/
│   │   │   ├── ws/
│   │   │   ├── mcp/
│   │   │   │   └── server.ts          # createGcMcpServer factory
│   │   │   ├── services/
│   │   │   │   ├── agent-lifecycle.ts  # AgentRuntime interface
│   │   │   │   ├── agent-runtime-sdk.ts  # SDK implementation
│   │   │   │   ├── prompt-builder.ts   # System prompt assembly
│   │   │   │   ├── workspace-manager.ts
│   │   │   │   ├── summarizer.ts
│   │   │   │   └── event-bus.ts
│   │   │   └── db/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── dashboard/              # Frontend
│       ├── src/
│       │   ├── App.tsx
│       │   ├── routes/
│       │   ├── components/
│       │   ├── hooks/
│       │   └── store/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # Shared types and constants
│       ├── src/
│       │   ├── types.ts
│       │   └── constants.ts
│       └── package.json
│
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json
└── docker-compose.yml          # PostgreSQL + Redis
```
