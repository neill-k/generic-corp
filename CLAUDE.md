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

- **Claude Code is the runtime** — No custom agent framework. Agents are Claude Code instances invoked via the Agent SDK (`@anthropic-ai/claude-agent-sdk`).
- **Agent SDK for v0** — `query()` provides streaming, in-process MCP, cost tracking. Runtime abstraction allows swapping to CLI or raw API later.
- **File-first** — Agent state, board items, learnings, and digests are files in a workspace.
- **Agent-owned memory** — Agents control their own `context.md`. Platform provides briefing via system prompt but never overwrites agent state.
- **Prompt-level trust** — Communication rules live in the system prompt, not enforced by middleware.
- **In-process MCP** — Single MCP server created via `createSdkMcpServer`, passed to agents via `type: "sdk"`. No `.mcp.json` files.
- **6 MCP tools** — `delegate_task`, `finish_task`, `get_my_org`, `get_agent_status`, `query_board`, `post_board_item`. That's the entire platform API for agents.

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
