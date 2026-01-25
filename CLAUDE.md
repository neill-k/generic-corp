# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
pnpm docker:up

# Initialize database (first time setup)
pnpm db:generate
pnpm db:push

# Development
pnpm dev              # Start both server and game in parallel
pnpm dev:server       # Server only (http://localhost:3000)
pnpm dev:game         # Game only (http://localhost:5173)

# Build
pnpm build            # Build all workspaces

# Lint & Typecheck
pnpm lint             # Lint all workspaces
pnpm --filter @generic-corp/server run typecheck
pnpm --filter @generic-corp/game run typecheck
pnpm --filter @generic-corp/shared run typecheck

# Tests (server uses Vitest)
pnpm --filter @generic-corp/server run test              # Run all tests
pnpm --filter @generic-corp/server vitest path/to/test   # Single file
pnpm --filter @generic-corp/server vitest -t "test name" # Single test

# Database (Prisma)
pnpm db:migrate       # Create/apply migrations
pnpm --filter @generic-corp/server run db:studio  # Prisma Studio GUI
```

## Architecture

This is a pnpm monorepo with three packages:

- **apps/server** - Express + Socket.io backend with BullMQ job queue and Prisma ORM
- **apps/game** - Vite + React + Phaser frontend with Zustand state and Tailwind CSS
- **packages/shared** - TypeScript types and constants used by both apps

### Key Server Components

- `src/agents/` - AI agent implementations. `BaseAgent` handles Claude Agent SDK integration; specific agents (e.g., `SableAgent`) extend it with personality prompts
- `src/api/` - REST endpoints
- `src/websocket/` - Socket.io handlers for real-time updates
- `src/queues/` - BullMQ task processing
- `src/services/event-bus.ts` - Internal pub/sub for server events
- `src/db/` - Prisma client (`db` export) and seed data
- `prisma/schema.prisma` - Database models (Agent, Task, Message, etc.)

### Key Frontend Components

- `src/store/gameStore.ts` - Zustand store (single source of truth for UI state)
- `src/components/` - React UI components
- `src/hooks/` - Custom React hooks including WebSocket connection
- Phaser handles isometric rendering; React handles UI overlays

### Data Flow

1. User action → React component → REST API or WebSocket emit
2. Server processes request → updates Prisma DB → emits WebSocket event
3. Frontend receives WebSocket event → updates Zustand store → React re-renders

## Code Conventions

### TypeScript & Imports

- ESM modules throughout (`"type": "module"`)
- **Server TS files require `.js` extensions** in relative imports (e.g., `import { db } from "../db/index.js"`)
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
- `PascalCase` for classes/components
- `SCREAMING_SNAKE_CASE` for constants

### Error Handling

- Wrap async route handlers in try/catch, return JSON errors
- Log with component prefix: `console.error("[API] ...", error)`
- Use `error instanceof Error ? error.message : "Unknown error"` pattern

## Claude Agent SDK

The server uses `@anthropic-ai/claude-agent-sdk`. Credentials are auto-detected from `~/.claude/.credentials.json`; no `ANTHROPIC_API_KEY` env var needed. See `apps/server/src/agents/base-agent.ts` for the integration pattern.
