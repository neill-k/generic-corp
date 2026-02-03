# Quick Start

Get Generic Corp up and running in under 5 minutes.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 22.0.0
- **pnpm** >= 9.15.9
- **Docker** and Docker Compose

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/neill-k/generic-corp.git
cd generic-corp
```

### 2. Install Dependencies

```bash
pnpm install
```

This will install all dependencies across the monorepo workspace.

### 3. Start Infrastructure

Start PostgreSQL and Redis using Docker:

```bash
pnpm docker:up
```

This command runs `docker compose up -d postgres redis`.

### 4. Configure Environment

Copy the example environment file:

```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env` and configure:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/genericcorp"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# API Keys (add your keys)
ANTHROPIC_API_KEY="your-api-key-here"

# Application
NODE_ENV="development"
PORT=3000
```

### 5. Initialize Database

Generate Prisma client and set up the database:

```bash
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Create database schema
pnpm db:seed      # Populate with seed data
```

### 6. Start Development Servers

```bash
pnpm dev
```

This starts both the backend server and frontend dashboard.

## Access the Application

Once running, you can access:

- **Dashboard**: [http://localhost:5173](http://localhost:5173)
- **API Server**: [http://localhost:3000](http://localhost:3000)
- **API Health**: [http://localhost:3000/health](http://localhost:3000/health)

## What's Next?

Now that you have Generic Corp running:

1. **[Read the Architecture Guide](../architecture.md)** - Understand how the system works
2. **[Explore the API](../api-reference.md)** - Learn about available endpoints
3. **[Build a Plugin](../plugin-development.md)** - Extend functionality
4. **[Deploy to Production](../deployment.md)** - Take it live

## Common Commands

```bash
# Development
pnpm dev              # Start all dev servers
pnpm dev:server       # Start backend only
pnpm dev:dashboard    # Start frontend only

# Database
pnpm db:studio        # Open Prisma Studio
pnpm db:migrate       # Run migrations

# Code Quality
pnpm lint             # Run linter
pnpm typecheck        # Type check
pnpm test             # Run tests

# Infrastructure
pnpm docker:down      # Stop Docker services
```

## Troubleshooting

### Port Already in Use

If ports 3000 or 5173 are already in use:

1. Stop the conflicting service, or
2. Change the port in the respective `.env` file

### Database Connection Error

Ensure Docker containers are running:

```bash
docker ps
```

You should see `postgres` and `redis` containers running.

### Prisma Client Error

If you see Prisma client errors, regenerate it:

```bash
pnpm db:generate
```

## Getting Help

- Check the [full installation guide](installation.md)
- Review [configuration options](configuration.md)
- Search [GitHub Issues](https://github.com/neill-k/generic-corp/issues)
