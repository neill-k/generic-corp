# Quick Testing Guide

## Current Status

Database connection issue detected. Here's how to proceed:

## Option 1: Fix Database Connection

The PostgreSQL container is running but external connections are failing. Try:

```bash
# Check if PostgreSQL is accepting connections
docker exec generic-corp-postgres pg_isready -U genericcorp

# Test connection from inside container
docker exec -it generic-corp-postgres psql -U genericcorp -d genericcorp

# If that works, the issue is with external connections
# Try using 127.0.0.1 instead of localhost in DATABASE_URL
```

## Option 2: Manual Database Setup

```bash
# Connect to database container
docker exec -it generic-corp-postgres psql -U genericcorp -d genericcorp

# Then run Prisma commands from inside or use Prisma Studio
cd apps/server
pnpm db:studio
# This will open a browser interface to manage the database
```

## Option 3: Test Without Full Setup

You can still test the code structure:

```bash
# Check TypeScript compilation
cd apps/server && pnpm typecheck
cd ../../apps/game && pnpm typecheck

# Check linting
pnpm lint

# Verify dependencies
pnpm install
```

## Once Database Works

Run the full test suite:

```bash
# 1. Initialize database
pnpm db:push

# 2. Start server (in background)
pnpm dev:server &

# 3. Run API tests
./scripts/test-api.sh

# 4. Test frontend
# Open http://localhost:5173
```

## Manual API Tests (when server is running)

```bash
# Health check
curl http://localhost:3000/health

# List agents (requires DB)
curl http://localhost:3000/api/agents | jq

# Create task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Test",
    "description": "Test task",
    "priority": "normal"
  }' | jq
```

## Next Steps

1. Fix PostgreSQL external connection (check pg_hba.conf or use docker network)
2. Or use Prisma Studio for database management
3. Once DB works, run full test suite
