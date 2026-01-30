# Generic Corp (v2)

Generic Corp is an agent orchestration platform where Claude Code instances act as employees in a corporate hierarchy.

This repository is in the middle of a full rewrite. The current implementation follows the v2 architecture docs in `plans/`.

## Repo Layout

- `apps/server/` - TypeScript backend (Express + Socket.io + BullMQ + Prisma)
- `apps/dashboard/` - Vite + React + Tailwind frontend (chat, org chart, kanban)
- `packages/shared/` - Shared TypeScript types and constants
- `plans/` - Architecture and status docs (start here)
- `legacy/` - Pre-overhaul codebase (read-only reference; do not modify)

## Prereqs

- Node.js >= 22
- pnpm >= 9
- Docker (for Postgres + Redis)

## Quickstart

Install deps:

```bash
pnpm install
```

Start infra:

```bash
docker compose up -d postgres redis
```

Configure env:

```bash
cp apps/server/.env.example apps/server/.env
```

Initialize database:

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

Run dev:

```bash
pnpm dev
```

- Server: http://localhost:3000
- Dashboard: http://localhost:5173

## Common Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Architecture Docs

- Canonical design: `plans/v2-architecture-simplified.md`
- Implementation status: `plans/v2-architecture-status.md`
