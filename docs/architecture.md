# Architecture Overview

Generic Corp is built as a monorepo with a clear separation between frontend, backend, and shared packages.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Dashboard                           │
│              (React + Vite + Tailwind)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Server                             │
│            (Express + Socket.io + BullMQ)                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   REST API   │  │  WebSocket   │  │  Job Queue   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────┬───────────────────┬──────────────────┬────────────┘
         │                   │                  │
         ▼                   ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐
│   PostgreSQL    │  │   Redis         │  │  Claude API    │
│   (Prisma)      │  │   (BullMQ)      │  │                │
└─────────────────┘  └─────────────────┘  └────────────────┘
```

## Core Components

### Backend (`apps/server`)

The backend is built with TypeScript and Express, providing:

- **REST API**: Standard HTTP endpoints for CRUD operations
- **WebSocket Server**: Real-time communication via Socket.io
- **Job Queue**: Background task processing with BullMQ
- **Database Layer**: PostgreSQL accessed via Prisma ORM
- **Agent Manager**: Orchestrates Claude Code instances

**Key Technologies:**
- Express.js for HTTP routing
- Socket.io for real-time bidirectional communication
- BullMQ for reliable job queuing
- Prisma for type-safe database access
- Anthropic SDK for Claude integration

### Frontend (`apps/dashboard`)

A modern React application providing:

- **Org Chart View**: Visualize corporate hierarchy
- **Chat Interface**: Communicate with agents
- **Kanban Board**: Task management and tracking
- **Analytics Dashboard**: Metrics and insights

**Key Technologies:**
- React 18 with hooks
- Vite for fast development
- Tailwind CSS for styling
- Socket.io client for real-time updates

### Shared Packages (`packages/`)

#### `packages/core`
Core orchestration logic and business rules.

#### `packages/shared`
TypeScript types and constants shared between frontend and backend.

#### `packages/sdk`
SDK for developing custom plugins.

#### `packages/plugins-base`
Base plugin implementations and utilities.

#### `packages/enterprise-auth`
Enterprise authentication and authorization.

## Data Flow

### Agent Task Execution

1. **Task Creation**: User creates task via dashboard
2. **API Request**: Dashboard sends POST to `/api/tasks`
3. **Database Write**: Task stored in PostgreSQL
4. **Job Enqueue**: Task added to BullMQ queue
5. **Agent Assignment**: Worker picks up task and assigns to agent
6. **Claude Execution**: Agent (Claude instance) processes task
7. **Status Updates**: Real-time updates via WebSocket
8. **Completion**: Results stored and user notified

### Real-time Communication

1. Client connects via Socket.io
2. Server authenticates connection
3. Client subscribes to relevant channels (org, department, etc.)
4. Server emits events on state changes
5. Client updates UI in real-time

## Database Schema

The system uses PostgreSQL with the following main entities:

- **Organizations**: Top-level tenant isolation
- **Employees**: Agent instances and human users
- **Departments**: Organizational units
- **Tasks**: Work items and their status
- **Messages**: Chat and communication records
- **Plugins**: Installed plugin metadata

See [Database Schema](architecture/database.md) for detailed schema documentation.

## Plugin Architecture

Generic Corp supports extensibility through plugins. Plugins can:

- Add new API endpoints
- Register custom job processors
- Extend agent capabilities
- Add UI components

See [Plugin System](architecture/plugins.md) for details.

## Security

### Authentication
- JWT-based authentication
- Session management with Redis
- API key support for programmatic access

### Authorization
- Role-based access control (RBAC)
- Organization-level isolation
- Department-scoped permissions

### Data Protection
- Encrypted secrets storage
- SQL injection prevention via Prisma
- XSS protection in React
- CORS configuration

## Scalability

The architecture supports horizontal scaling:

- **Stateless API servers**: Multiple instances behind load balancer
- **Redis session store**: Shared session state
- **BullMQ workers**: Scale background job processing independently
- **PostgreSQL**: Connection pooling and read replicas

## Monitoring

Built-in observability features:

- Health check endpoints
- Structured logging
- Error tracking
- Performance metrics
- Job queue monitoring

## Next Steps

- [Core Concepts](architecture/core-concepts.md)
- [Plugin System Details](architecture/plugins.md)
- [Database Schema](architecture/database.md)
