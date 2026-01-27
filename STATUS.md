# GENERIC CORP - Project Status

**Last Updated**: January 27, 2026
**Phase**: 4 (Complete through Temporal, Phase 6 Autonomous Ops)
**Status**: Production-Ready Core

---

## Overview

GENERIC CORP is an isometric management game that serves as an interface for real AI agents using a configurable CLI-based runtime. Players act as Marcus Bell, CEO of a company with world-class talent but zero revenue.

---

## Phase Completion

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | ✅ Complete | 100% |
| Phase 2: Core Game Interface | ✅ Complete | 100% |
| Phase 3: Agent SDK Integration | ✅ Complete | 100% |
| Phase 4: Temporal Migration | ✅ Complete | 100% |
| Phase 5: Full Company Expansion | 🔄 Partial | 10/22 agents |
| Phase 6: Autonomous Operations | ✅ Complete | 100% |

### Completed Components

| Component | Status | Notes |
|-----------|--------|-------|
| Monorepo Setup | ✅ Done | pnpm workspaces with apps/game, apps/server, packages/shared |
| Docker Infrastructure | ✅ Done | PostgreSQL 16 + Redis 7 |
| Database Schema | ✅ Done | Prisma ORM with all models |
| Agent Seeding | ✅ Done | 10 agents with personality prompts |
| REST API | ✅ Done | Full CRUD for agents, tasks, messages, drafts, activity, game-state |
| WebSocket Server | ✅ Done | Socket.io on port 3000 with all event handlers |
| BullMQ Task Queue | ✅ Done | Worker with retries and backoff |
| Event Bus | ✅ Done | Internal pub/sub system |
| BaseAgent Class | ✅ Done | CLI runner integration via CliRunner |
| All 10 Agents | ✅ Done | Marcus, Sable, DeVonte, Yuki, Gray, Miranda, Helen, Walter, Frankie, Kenji |
| Shared Types | ✅ Done | TypeScript types package |
| Agent Sprites | ✅ Done | 10 pixel art sprites |
| Game Frontend | ✅ Done | Vite + React + Phaser + Zustand + Tailwind |
| Dashboard UI | ✅ Done | Agent panels, task queue, activity feed, message center |
| Phaser Isometric Scene | ✅ Done | Full office with 10 agent positions, animations, tooltips |
| MCP Tools Server | ✅ Done | 9 tools: filesystem, bash, git, messaging, external_draft |
| Temporal Infrastructure | ✅ Done | Workflows, activities, workers, client |
| CronManager | ✅ Done | CEO, worker, and system cron jobs |
| Provider Integrations | ✅ Done | GitHub Copilot, Google Code Assist, OpenAI Codex |
| Test Suite | ✅ Done | Vitest test suite (unit + e2e) |

### In Progress / Remaining

| Component | Status | Priority |
|-----------|--------|----------|
| Additional Agents (12 more) | Not Started | Low - 10 agents sufficient for MVP |
| Agent Hierarchy (tier, reportsTo) | Not Started | Low - Schema extension |
| Additional Test Coverage | Partial | Low - Core covered, edge cases remain |
| TDD Workflow | Not Started | Low - Test-driven development process |
| Peer Review Workflow | Not Started | Low - Code review automation |

---

## Technical Stack

- **Frontend**: React 18, Phaser 3, Zustand, TailwindCSS, Vite
- **Backend**: Express, Socket.io, BullMQ, Prisma
- **Database**: PostgreSQL 16, Redis 7
- **Agent Runtime**: CLI runner (TypeScript)
- **Build**: pnpm monorepo, TypeScript 5.x

---

## Running the Project

```bash
# Start infrastructure
docker compose up -d

# Install dependencies
pnpm install

# Sync database
cd apps/server && pnpm prisma db push

# Start dev servers
pnpm dev
```

- Game: http://localhost:5173
- API: http://localhost:3000
- Health: http://localhost:3000/health

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents |
| `/api/agents/:id` | GET | Get agent by ID |
| `/api/tasks` | GET | List tasks (filterable) |
| `/api/tasks/:id` | GET | Get task by ID |
| `/api/tasks` | POST | Create new task |
| `/api/messages` | GET | List messages |
| `/api/activity` | GET | Activity log |
| `/api/game-state` | GET | Current game state |
| `/health` | GET | Server health check |

---

## Agents

| Name | Role | Status | File |
|------|------|--------|------|
| Marcus Bell | CEO/Supervisor | Implemented | `marcus-agent.ts` |
| Sable Chen | Principal Engineer | Implemented | `sable-agent.ts` |
| DeVonte Jackson | Full-Stack Developer | Implemented | `devonte-agent.ts` |
| Yuki Tanaka | SRE | Implemented | `yuki-agent.ts` |
| Graham "Gray" Sutton | Data Engineer | Implemented | `gray-agent.ts` |
| Miranda Okonkwo | Software Engineer | Implemented | `miranda-agent.ts` |
| Helen Marsh | Executive Assistant | Implemented | `helen-agent.ts` |
| Walter Huang | CFO | Implemented | `walter-agent.ts` |
| Frankie Deluca | VP Sales | Implemented | `frankie-agent.ts` |
| Kenji Ross | Marketing Lead | Implemented | `kenji-agent.ts` |

---

## Next Steps (Optional Enhancements)

The core system is complete. Remaining work is optional:

1. **Additional Agents** - 12 more agents for full 22-agent roster (Phase 5)
2. **Agent Hierarchy** - Add `tier` and `reportsToId` fields to schema
3. **TDD Workflow** - Test-driven development process automation
4. **Peer Review Workflow** - Automated code review routing
5. **Additional Test Coverage** - Edge cases and integration tests

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    GAME FRONTEND                         │
│  React Dashboard + Phaser Isometric View + Zustand      │
└─────────────────────┬───────────────────────────────────┘
                      │ WebSocket
┌─────────────────────┴───────────────────────────────────┐
│                    SERVER                                │
│  Express + Socket.io + BullMQ Workers + Event Bus       │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────────┐
│                    DATA LAYER                            │
│  PostgreSQL (Prisma) + Redis (Cache/Queues)             │
└─────────────────────────────────────────────────────────┘
```

---

## Repository

- **Branch**: `feat/generic-corp-foundation`
- **Commits**: Foundation setup, TypeScript fixes
