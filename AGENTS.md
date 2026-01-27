# AGENTS.md (Generic Corp)

This repository is a `pnpm` workspace monorepo:
- `apps/server`: Express + Socket.io + Prisma + BullMQ workers
- `apps/game`: Vite + React + Phaser + Zustand + Tailwind
- `packages/shared`: shared TS types/constants consumed by both apps

There are currently **no Cursor rule files** in `.cursor/rules/` and no `.cursorrules`, and no Copilot instructions in `.github/copilot-instructions.md`.

---

## Quick Commands (Build / Lint / Typecheck / Test)

### Prereqs
- Node `>= 20` (see `package.json` engines)
- `pnpm@9` (see `package.json#packageManager`)
- Optional infra for local dev: Docker (Postgres + Redis)

### Install
- Install all workspace deps: `pnpm install`

### Dev
- Run server + game together (parallel): `pnpm dev`
- Run only server: `pnpm dev:server`
- Run only game: `pnpm dev:game`

### Build
- Build all workspaces: `pnpm build`
- Build server only: `pnpm --filter @generic-corp/server run build`
- Build game only: `pnpm --filter @generic-corp/game run build`

### Lint
- Lint all workspaces: `pnpm lint`
- Lint server only: `pnpm --filter @generic-corp/server run lint`
- Lint game only: `pnpm --filter @generic-corp/game run lint`
- Lint shared only: `pnpm --filter @generic-corp/shared run lint`

### Typecheck
There is no repo-root `typecheck` script, but each package exposes `typecheck`.
- Typecheck server: `pnpm --filter @generic-corp/server run typecheck`
- Typecheck game: `pnpm --filter @generic-corp/game run typecheck`
- Typecheck shared: `pnpm --filter @generic-corp/shared run typecheck`

### Tests
Server has **44 Vitest tests** (unit + e2e) in `apps/server/src/test/`.

**Run all tests:**
- All workspaces: `pnpm test`
- Server only: `pnpm --filter @generic-corp/server run test`
- With coverage: `pnpm --filter @generic-corp/server run test:coverage`

**Run specific tests:**
- Single file: `pnpm --filter @generic-corp/server vitest run src/test/unit/base-agent.test.ts`
- Single test by name: `pnpm --filter @generic-corp/server vitest run -t "should execute task"`
- Watch mode: `pnpm --filter @generic-corp/server vitest`

### Docker / DB
- Start Postgres + Redis: `pnpm docker:up`
- Stop Postgres + Redis: `pnpm docker:down`

Server Prisma commands (usually run from repo root):
- Generate Prisma client: `pnpm --filter @generic-corp/server run db:generate`
- Push schema to DB: `pnpm --filter @generic-corp/server run db:push`
- Create/apply migrations (dev): `pnpm --filter @generic-corp/server run db:migrate`
- Prisma Studio: `pnpm --filter @generic-corp/server run db:studio`

Environment:
- Copy `apps/server/.env.example` -> `apps/server/.env`
- Ensure `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` match your local infra

---

## Project Conventions (Code Style + Architecture)

### Language & Module System
- TypeScript everywhere.
- ESM modules (`"type": "module"` in packages). Use ESM import/export.
- Server uses Node-style resolution at runtime; note explicit `.js` extensions in TS imports (e.g. `./api/index.js`). Preserve this pattern.

### TypeScript Settings (strict)
From `tsconfig.json` (root) and package tsconfigs:
- `strict: true` (no implicit `any`)
- `noUnusedLocals`, `noUnusedParameters` enabled
- Prefer narrow types, avoid `any`. If needed, use `unknown` then validate/cast.

### Imports
Preferred ordering (match existing code patterns):
1. Side-effect imports first when required (e.g. `import "dotenv/config";`)
2. Node built-ins
3. Third-party packages
4. Internal workspace packages (e.g. `@generic-corp/shared`)
5. Relative imports

Additional import rules:
- Use `import type { ... }` for type-only imports.
- In server TS files, internal relative imports typically end in `.js`.
- Keep imports at top-level; avoid dynamic `require`/imports unless necessary.

### Formatting
No dedicated Prettier config is present. Follow the existing formatting:
- 2-space indentation
- Semicolons used
- Double quotes for strings
- Trailing commas common in multiline objects/arrays

If you add a formatter later, keep it consistent with the above.

### Naming
- Variables/functions: `camelCase`
- Classes/components: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE` (see `QUEUE_NAMES` usage)
- File names: `kebab-case.ts` or `camelCase.ts` depending on existing directory norms; preserve the local convention.

### Error Handling & Logging
Server code uses a pragmatic pattern:
- Wrap async route handlers in `try/catch` and return JSON errors.
- Log errors with a component prefix, e.g. `console.error("[API] ...", error)`.
- Prefer `error instanceof Error ? error.message : "Unknown error"` when stringifying.
- Fail fast on unrecoverable startup errors (`process.exit(1)` in `apps/server/src/index.ts`).

When adding new backend endpoints/services:
- Return appropriate HTTP status codes (`400` validation, `404` missing, `500` unexpected).
- Do not leak secrets in API responses.

### Data Access (Prisma)
- DB client lives in `apps/server/src/db/index.ts` as `db`.
- Prefer `findFirst/findUnique/findMany` with explicit `where`.
- Serialize structured results with `JSON.parse(JSON.stringify(result))` only when Prisma/Socket payloads require it; otherwise avoid unnecessary cloning.

### Events & Realtime
- Server internal pub/sub uses `EventBus` (`apps/server/src/services/event-bus.ts`).
- Keep events typed (extend `EventMap` rather than using `any` everywhere).
- WebSocket is proxied in dev by Vite to the server (`apps/game/vite.config.ts`).

### State Management (Game)
- Zustand store in `apps/game/src/store/gameStore.ts`.
- Store actions should be small and composable; keep list updates immutable (`map`, `filter`).
- Prefer `Partial<T>` for update payloads (pattern already used).

### CSS/UI
- Tailwind is enabled (`apps/game/src/index.css` uses `@tailwind ...`).
- Prefer Tailwind utility classes for layout; keep custom CSS for global tweaks/animations.

---

## Agentic Workflow Tips (for coding agents)
- Start by reading `README.md` for run steps and URLs.
- Prefer minimal, localized changes; do not reformat unrelated files.
- When changing runtime imports in `apps/server`, preserve explicit `.js` extensions.
- Before adding new dependencies, check workspace boundaries (`apps/*` vs `packages/*`).
- If you introduce tests, also add a `test` script to the relevant package and update this file with exact single-test commands.
