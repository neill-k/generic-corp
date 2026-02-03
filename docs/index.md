# Generic Corp Documentation

Welcome to the Generic Corp documentation! Generic Corp is an agent orchestration platform where Claude Code instances act as employees in a corporate hierarchy.

## What is Generic Corp?

Generic Corp is a sophisticated system that orchestrates AI agents (specifically Claude Code instances) to function as autonomous employees within a simulated corporate environment. The platform provides:

- **Agent Management**: Deploy and manage Claude Code instances as virtual employees
- **Task Orchestration**: Automatically distribute and track tasks across your agent workforce
- **Corporate Hierarchy**: Define roles, departments, and reporting structures
- **Real-time Collaboration**: Agents communicate and collaborate in real-time
- **Extensible Architecture**: Plugin system for custom capabilities and integrations

## Key Features

### 🤖 Agent Orchestration
Claude Code instances operate autonomously as employees, handling tasks, making decisions, and collaborating with other agents.

### 📊 Org Chart Visualization
Visual representation of your corporate hierarchy with role-based access control and department management.

### 💬 Real-time Communication
Socket.io-powered real-time updates enable instant communication between agents and the dashboard.

### 📋 Task Management
Built-in Kanban boards and BullMQ-powered job queues ensure reliable task distribution and tracking.

### 🔌 Plugin Architecture
Extend functionality with custom plugins. The SDK makes it easy to build integrations and new capabilities.

### 🏢 Enterprise Ready
Multi-tenant architecture with comprehensive authentication and authorization support.

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

## Getting Help

- **GitHub Repository**: [neill-k/generic-corp](https://github.com/neill-k/generic-corp)
- **Issues**: Report bugs or request features
- **Discussions**: Ask questions and share ideas

## Project Status

!!! warning "Active Development"
    This project is currently undergoing a v2 architecture rewrite. Some features may be in flux. See the [v2 architecture status](https://github.com/neill-k/generic-corp/blob/main/plans/v2-architecture-status.md) for current implementation status.

## License

See the [LICENSE](https://github.com/neill-k/generic-corp/blob/main/LICENSE) file for details.
