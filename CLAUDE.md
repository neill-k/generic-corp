# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository State

This is a **complete rewrite** of Generic Corp. The repo has been cleaned to a blank slate:

- `legacy/` — The pre-overhaul codebase (read-only reference, do not modify)
- `plans/` — Architecture documents. The canonical design is `plans/v2-architecture-simplified.md`
- No application code exists yet. Everything will be built from scratch.

## Architecture Summary

Generic Corp is an **agent orchestration platform** where Claude Code instances act as employees in a corporate hierarchy. The platform provides coordination; Claude Code is the agent runtime.

- **apps/server** — TypeScript backend (Express + Socket.io + BullMQ + Prisma)
- **apps/dashboard** — Vite + React + Tailwind frontend (chat, org chart, kanban board)
- **packages/shared** — Shared TypeScript types and constants
- **MCP server** — Single Generic Corp MCP server with 6 tools agents use to interact with the platform

See `plans/v2-architecture-simplified.md` for the full architecture.

### Key Design Principles

- **100% Agent-Native is non-negotiable** — Every principle below must be fully satisfied. No exceptions.
- **Claude Code is the runtime** — No custom agent framework. Agents are Claude Code instances invoked via the Agent SDK (`@anthropic-ai/claude-agent-sdk`).
- **Agent SDK for v0** — `query()` provides streaming, in-process MCP, cost tracking. Runtime abstraction allows swapping to CLI or raw API later.
- **File-first** — Agent state, board items, learnings, and digests are files in a workspace.
- **Agent-owned memory** — Agents control their own `context.md`. Platform provides briefing via system prompt but never overwrites agent state.
- **Prompt-level trust** — Communication rules live in the system prompt, not enforced by middleware. No hardcoded validation in tools.
- **In-process MCP** — Single MCP server created via `createSdkMcpServer`, passed to agents via `type: "sdk"`. No `.mcp.json` files.
- **MCP tools are primitives** — Tools provide capability, not behavior. No business logic in tool handlers.

### Agent-Native Architecture (100% Required)

All 8 principles must score 80%+ at all times:

1. **Action Parity** — Whatever the user can do, the agent can do. Every API endpoint has a corresponding MCP tool.
2. **Tools as Primitives** — Tools provide capability (read, write, list), not behavior (no business logic, no orchestration).
3. **Context Injection** — System prompt includes dynamic context: org structure, recent board activity, pending child results.
4. **Shared Workspace** — Agent and user work in the same data space. No shadow databases or agent sandboxes.
5. **CRUD Completeness** — Every entity (Agent, OrgNode, Task, Message) has full Create/Read/Update/Delete from both API and MCP.
6. **UI Integration** — Every state mutation emits a WebSocket event. No polling-only updates. Agent actions are immediately reflected in the UI.
7. **Capability Discovery** — Users can discover what agents can do via suggested prompts, empty state guidance, capability hints, and help documentation.
8. **Prompt-Native Features** — Features are prompts defining outcomes, not code. Behavior changes require prompt edits, not code deploys.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Initialize database
pnpm db:generate
pnpm db:push
pnpm db:seed

# Development
pnpm dev              # Start both server and dashboard in parallel
pnpm dev:server       # Server only (http://localhost:3000)
pnpm dev:dashboard    # Dashboard only (http://localhost:5173)

# Build
pnpm build            # Build all workspaces

# Lint & Typecheck
pnpm lint
pnpm typecheck

# Tests (Vitest)
pnpm test                                                 # All tests
pnpm --filter @generic-corp/server vitest path/to/test    # Single file
pnpm --filter @generic-corp/server vitest -t "test name"  # Single test

# Database (Prisma)
pnpm db:migrate       # Create/apply migrations
pnpm db:studio        # Prisma Studio GUI
```

## Code Conventions

### TypeScript & Imports

- ESM modules throughout (`"type": "module"`)
- **Server TS files require `.js` extensions** in relative imports (e.g., `import { db } from "../db/client.js"`)
- Use `import type { ... }` for type-only imports
- Strict mode enabled; avoid `any`, prefer `unknown` with validation

### Import Order

1. Side-effect imports (`import "dotenv/config"`)
2. Node built-ins
3. Third-party packages
4. Workspace packages (`@generic-corp/shared`)
5. Relative imports

### Formatting

- 2-space indentation, semicolons, double quotes
- Trailing commas in multiline objects/arrays

### Naming

- `camelCase` for variables/functions
- `PascalCase` for classes/components/types
- `SCREAMING_SNAKE_CASE` for constants

### Error Handling

- Wrap async route handlers in try/catch, return JSON errors
- Log with component prefix: `console.error("[API] ...", error)` or `[MCP]`, `[WS]`, `[Lifecycle]`
- Use `error instanceof Error ? error.message : "Unknown error"` pattern

## Data Model

Four Prisma models: `Agent`, `OrgNode`, `Task`, `Message`. Don't add tables until actually needed. See `plans/v2-architecture-simplified.md` section 8 for full schema.

## Agent Runtime

Agents are Claude Code instances invoked via the Agent SDK:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: taskPrompt,
  options: {
    systemPrompt: buildSystemPrompt(agent, task),  // Identity + briefing
    cwd: agent.workspacePath,
    mcpServers: {
      "generic-corp": { type: "sdk", instance: mcpServer },  // In-process MCP
    },
    permissionMode: "bypassPermissions",
  },
})) {
  // Stream agent events to dashboard via WebSocket
}
```

Each agent receives:
- **System prompt** — Identity + role + rules + briefing (built per invocation, passed via `options.systemPrompt`)
- **context.md** — Working memory in `.gc/context.md` (agent-owned, never overwritten by platform)
- **MCP server** — In-process Generic Corp tools (passed via `type: "sdk"`, no `.mcp.json` files)

The lifecycle manager codes against an `AgentRuntime` interface so we can swap SDK → CLI → raw API later. No BaseAgent class. No personality prompts in TypeScript.

## Implementation Workflow

When iterating on the architecture implementation:

1. **Track progress** in `plans/v2-architecture-status.md` — check off items as they are completed.
2. **Make regular, atomic commits** — each commit should represent a single logical change (one feature, one fix, one refactoring).
3. **Run the agent-native audit** (`/agent-native-audit`) before each commit to verify adherence to agent-native architecture principles.
4. **Reference the canonical design** in `plans/v2-architecture-simplified.md` for all implementation decisions.
5. **TDD is imperative** — Write tests first, then implement. Every new feature, service, component, and utility must have tests written before the implementation code. Red-green-refactor cycle.
