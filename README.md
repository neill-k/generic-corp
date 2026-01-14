# Generic Corp

An isometric management game where you oversee a team of AI agents working to save a struggling company.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL + Redis)
pnpm docker:up

# Initialize database
cd apps/server
pnpm db:generate
pnpm db:push
cd ../..

# Start development servers (both server and game)
pnpm dev
```

The game will be available at http://localhost:5173 and the API at http://localhost:3000.

## Project Structure

```
generic-corp/
├── apps/
│   ├── server/          # Express + Socket.io backend
│   │   ├── src/
│   │   │   ├── agents/  # AI agent implementations
│   │   │   ├── api/     # REST API routes
│   │   │   ├── db/      # Prisma client + seed
│   │   │   ├── queues/  # BullMQ task queue
│   │   │   ├── services/ # Event bus, utilities
│   │   │   └── websocket/ # Socket.io handlers
│   │   └── prisma/      # Database schema
│   └── game/            # Vite + React + Phaser frontend
│       ├── src/
│       │   ├── components/ # React UI components
│       │   ├── game/      # Phaser scene
│       │   ├── hooks/     # React hooks
│       │   └── store/     # Zustand state
│       └── public/        # Static assets
└── packages/
    └── shared/          # Shared types and constants
```

## Development

### Commands

```bash
# Start everything
pnpm dev

# Start only server
pnpm dev:server

# Start only game
pnpm dev:game

# Database management
cd apps/server
pnpm db:studio    # Open Prisma Studio
pnpm db:migrate   # Run migrations
```

### Environment Variables

Copy `apps/server/.env.example` to `apps/server/.env` and configure as needed.

## Architecture

- **Frontend**: Phaser 3 for isometric rendering, React for UI, Zustand for state, Socket.io for real-time
- **Backend**: Express server, BullMQ for job queue, Prisma ORM, PostgreSQL + Redis
- **AI Agents**: Claude Agent SDK for agent execution, personality-driven responses

## Phase 1 Features

- [x] Monorepo setup with pnpm workspaces
- [x] PostgreSQL + Redis via Docker
- [x] Prisma schema with all models
- [x] WebSocket server with event handling
- [x] REST API endpoints
- [x] BullMQ task queue
- [x] BaseAgent + SableAgent implementation
- [x] Phaser isometric game shell
- [x] React dashboard with agent list
- [x] Zustand state management
- [ ] Full agent task execution test
