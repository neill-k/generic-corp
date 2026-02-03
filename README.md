# Generic Corp

**An agent orchestration platform where Claude Code instances act as employees in a corporate hierarchy.**

[![Documentation Status](https://readthedocs.org/projects/generic-corp/badge/?version=latest)](https://generic-corp.readthedocs.io/en/latest/?badge=latest)

## Overview

Generic Corp is a sophisticated agent orchestration system that simulates a corporate environment with AI agents (Claude Code instances) as employees. The platform enables autonomous task management, hierarchical organization, and collaborative workflows through a modern web-based interface.

### Key Features

- 🤖 **Agent Orchestration** - Claude Code instances as autonomous employees
- 📊 **Corporate Hierarchy** - Org chart visualization and role management
- 💬 **Real-time Communication** - Socket.io-powered chat and updates
- 📋 **Task Management** - Kanban boards and job queues with BullMQ
- 🔌 **Plugin Architecture** - Extensible plugin system for custom capabilities
- 🏢 **Multi-tenant** - Enterprise-ready authentication and authorization

## Architecture

This is a monorepo built with:

- **Backend**: TypeScript, Express, Socket.io, BullMQ, Prisma
- **Frontend**: Vite, React, Tailwind CSS
- **Infrastructure**: Docker, PostgreSQL, Redis
- **Package Manager**: pnpm (workspace-enabled)

### Repository Structure

```
generic-corp/
├── apps/
│   ├── server/              # Backend API and orchestration engine
│   ├── dashboard/           # React-based web interface
│   ├── landing/             # Marketing/landing page
│   └── analytics-dashboard/ # Analytics and reporting UI
├── packages/
│   ├── core/                # Core orchestration logic
│   ├── shared/              # Shared types and constants
│   ├── sdk/                 # SDK for plugin development
│   ├── plugins-base/        # Base plugin implementations
│   └── enterprise-auth/     # Enterprise authentication
├── plans/                   # Architecture and design docs
└── infrastructure/          # Deployment configs
```

## Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 9.15.9
- **Docker** and Docker Compose
- **PostgreSQL** 14+ (via Docker)
- **Redis** 7+ (via Docker)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure

```bash
pnpm docker:up
```

This starts PostgreSQL and Redis containers.

### 3. Configure Environment

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` with your configuration (API keys, database URLs, etc.).

### 4. Initialize Database

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed initial data
```

### 5. Start Development Servers

```bash
pnpm dev
```

This starts both the server and dashboard in parallel:

- **Server**: http://localhost:3000
- **Dashboard**: http://localhost:5173

## Development

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm dev:server` | Start backend only |
| `pnpm dev:dashboard` | Start dashboard only |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint across workspace |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run test suites |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm docker:down` | Stop infrastructure |

### Database Management

```bash
pnpm db:generate   # Regenerate Prisma client
pnpm db:push       # Push schema changes (dev)
pnpm db:migrate    # Create and run migrations (prod)
pnpm db:seed       # Populate with seed data
pnpm db:studio     # Visual database browser
```

## Documentation

Full documentation is available at [generic-corp.readthedocs.io](https://generic-corp.readthedocs.io).

### Key Documentation

- **[Architecture Guide](docs/architecture.md)** - System design and technical overview
- **[API Reference](docs/api-reference.md)** - REST and WebSocket API documentation
- **[Plugin Development](docs/plugin-development.md)** - Creating custom plugins
- **[Deployment Guide](docs/deployment.md)** - Production deployment instructions

## Project Status

This repository is undergoing active development with a v2 architecture rewrite. See `plans/v2-architecture-status.md` for current implementation status.

### Current Branch: `core-plugin-architecture`

This branch focuses on implementing the core plugin architecture system.

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct before submitting PRs.

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run `pnpm lint && pnpm typecheck && pnpm test`
4. Submit a pull request

## License

See LICENSE file for details.

## Support

- **Documentation**: https://generic-corp.readthedocs.io
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

Built with ❤️ using Claude Code agents
