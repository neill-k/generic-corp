# GENERIC CORP - Project Status

**Last Updated**: January 15, 2026
**Phase**: 1 (Foundation)
**Status**: Core Infrastructure Complete

---

## Overview

GENERIC CORP is an isometric management game that serves as an interface for real AI agents using the Claude Agent SDK. Players act as Marcus Bell, CEO of a company with world-class talent but zero revenue.

---

## Phase 1 Progress

### Completed

| Component | Status | Notes |
|-----------|--------|-------|
| Monorepo Setup | Done | pnpm workspaces with apps/game, apps/server, packages/shared |
| Docker Infrastructure | Done | PostgreSQL 16 + Redis 7 |
| Database Schema | Done | Prisma ORM with all models |
| Agent Seeding | Done | 5 agents with personality prompts |
| REST API | Done | Full CRUD for agents, tasks, messages |
| WebSocket Server | Done | Socket.io on port 3000 |
| BullMQ Task Queue | Done | Worker with retries and backoff |
| Event Bus | Done | Internal pub/sub system |
| BaseAgent Class | Done | Simulation mode (SDK integration pending) |
| SableAgent | Done | First agent implementation |
| Shared Types | Done | TypeScript types package |
| Agent Sprites | Done | 5 pixel art sprites via Gemini CLI |
| Game Frontend Scaffold | Done | Vite + React + Phaser setup |

### In Progress / Remaining

| Component | Status | Priority |
|-----------|--------|----------|
| Claude Agent SDK Integration | Done | High - Real SDK wired via BaseAgent + E2E coverage |
| MCP Tools Server | Not Started | High - Needed for real agent work |
| Frontend UI Components | Not Started | Medium |
| Phaser Isometric Scene | Not Started | Medium |
| WebSocket Client Integration | Not Started | Medium |

---

## Technical Stack

- **Frontend**: React 18, Phaser 3, Zustand, TailwindCSS, Vite
- **Backend**: Express, Socket.io, BullMQ, Prisma
- **Database**: PostgreSQL 16, Redis 7
- **Agent Runtime**: Claude Agent SDK (TypeScript)
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

| Name | Role | Status |
|------|------|--------|
| Marcus Bell | CEO/Supervisor | Idle |
| Sable Chen | Principal Engineer | Idle |
| DeVonte Jackson | Full-Stack Developer | Idle |
| Yuki Tanaka | SRE | Idle |
| Graham "Gray" Sutton | Data Engineer | Idle |

---

## Next Steps

1. **Research Claude Agent SDK API** - Verify correct usage patterns
2. **Build MCP Tools Server** - filesystem, git, messaging tools
3. **Implement Frontend Components** - AgentPanel, TaskQueue, Dashboard
4. **Create Phaser Office Scene** - Isometric view with agent sprites
5. **Connect WebSocket Client** - Real-time state sync

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
