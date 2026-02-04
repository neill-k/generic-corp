# Generic Corp Documentation

Welcome to the Generic Corp documentation! Generic Corp is an agent orchestration platform where Claude Code instances act as employees in a corporate hierarchy.

## What is Generic Corp?

Generic Corp orchestrates AI agents (specifically Claude Code instances) to function as autonomous employees within a simulated corporate environment. The platform provides:

- **Agent Management**: Deploy and manage Claude Code instances as virtual employees
- **Task Orchestration**: Automatically distribute and track tasks across your agent workforce
- **Corporate Hierarchy**: Define roles, departments, and reporting structures
- **Real-time Collaboration**: Agents communicate and collaborate in real-time
- **Extensible Architecture**: Plugin system for custom capabilities and integrations

## Quick Links

- [Quick Start Guide](getting-started/quickstart.md) - Get up and running in minutes
- [Architecture Overview](architecture.md) - Understand the system design
- [API Reference](api-reference.md) - Complete API documentation
- [Plugin Development](plugin-development.md) - Build custom plugins

## Technology Stack

- **Backend**: TypeScript, Node.js, Express, Socket.io
- **Job Queue**: BullMQ with Redis
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React, Vite, Tailwind CSS
- **Infrastructure**: Docker, Docker Compose

## Project Status

```{warning}
This project is currently undergoing a v2 architecture rewrite. Some features may be in flux. See the [v2 architecture status](https://github.com/neill-k/generic-corp/blob/main/plans/v2-architecture-status.md) for current implementation status.
```

```{toctree}
:maxdepth: 2
:caption: Getting Started

getting-started/quickstart
getting-started/installation
getting-started/configuration
```

```{toctree}
:maxdepth: 2
:caption: Architecture

architecture
```

```{toctree}
:maxdepth: 2
:caption: Development

api-reference
plugin-development
```

```{toctree}
:maxdepth: 2
:caption: Deployment

deployment
```

```{toctree}
:maxdepth: 2
:caption: Contributing

contributing
code-of-conduct
```
