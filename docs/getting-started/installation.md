# Installation Guide

Detailed installation instructions for Generic Corp.

## System Requirements

### Hardware
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 10GB free space

### Software
- **Node.js**: Version 22.0.0 or higher
- **pnpm**: Version 9.15.9 or higher
- **Docker**: Latest stable version
- **Docker Compose**: Latest stable version
- **Git**: For cloning the repository

### Operating Systems
- Linux (Ubuntu 20.04+, Debian 11+)
- macOS (12+)
- Windows (via WSL2)

## Installing Dependencies

### Node.js

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@22
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/) or use WSL2.

### pnpm

```bash
npm install -g pnpm@9.15.9
```

Or using alternative methods:
```bash
# Using Homebrew (macOS)
brew install pnpm

# Using Corepack (Node.js 16.13+)
corepack enable
corepack prepare pnpm@9.15.9 --activate
```

### Docker

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**macOS:**
Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)

**Windows:**
Use Docker Desktop with WSL2 backend.

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/neill-k/generic-corp.git
cd generic-corp
```

For a specific branch:
```bash
git clone -b core-plugin-architecture https://github.com/neill-k/generic-corp.git
```

### 2. Install Project Dependencies

```bash
pnpm install
```

This installs all dependencies across the monorepo workspace.

### 3. Set Up Infrastructure

Start PostgreSQL and Redis containers:

```bash
pnpm docker:up
```

Verify containers are running:
```bash
docker ps
```

You should see `postgres` and `redis` containers.

### 4. Configure Environment

Create environment file:
```bash
cp apps/server/.env.example apps/server/.env
```

Edit `apps/server/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/genericcorp"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# Claude API
ANTHROPIC_API_KEY="your-api-key-here"

# Application
NODE_ENV="development"
PORT=3000
CORS_ORIGIN="http://localhost:5173"

# Security (generate secure secrets for production)
JWT_SECRET="your-jwt-secret"
SESSION_SECRET="your-session-secret"

# Logging
LOG_LEVEL="debug"
```

### 5. Database Setup

Generate Prisma client:
```bash
pnpm db:generate
```

Push schema to database:
```bash
pnpm db:push
```

Seed initial data:
```bash
pnpm db:seed
```

### 6. Verify Installation

Start development servers:
```bash
pnpm dev
```

Open in browser:
- Dashboard: http://localhost:5173
- API: http://localhost:3000
- Health check: http://localhost:3000/health

## Development Tools

### Prisma Studio

Visual database editor:
```bash
pnpm db:studio
```

Opens at http://localhost:5555

### TypeScript Checking

```bash
pnpm typecheck
```

### Linting

```bash
pnpm lint
```

### Testing

```bash
pnpm test
```

## Troubleshooting

### Port Conflicts

If ports 3000 or 5173 are in use:

**Check what's using the port:**
```bash
# Linux/macOS
lsof -i :3000

# Windows
netstat -ano | findstr :3000
```

**Solutions:**
1. Stop the conflicting service
2. Change port in `.env` or app config

### Docker Issues

**Containers won't start:**
```bash
# Check Docker daemon
docker info

# View container logs
docker compose logs postgres
docker compose logs redis

# Restart containers
pnpm docker:down
pnpm docker:up
```

**Permission denied:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in
```

### Database Connection Errors

**Can't connect to PostgreSQL:**

1. Verify container is running:
```bash
docker ps | grep postgres
```

2. Check connection string:
```bash
# Test connection
psql postgresql://postgres:postgres@localhost:5432/genericcorp
```

3. Verify firewall/network settings

### Prisma Client Errors

**Type errors or missing client:**
```bash
# Regenerate client
pnpm db:generate

# Clear cache and reinstall
rm -rf node_modules
pnpm install
```

### Module Not Found

**Missing dependencies:**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Node Version Issues

**Wrong Node.js version:**
```bash
# Check version
node --version

# Use nvm to switch
nvm install 22
nvm use 22
```

## Next Steps

- [Quick Start Guide](quickstart.md)
- [Configuration Options](configuration.md)
- [Architecture Overview](../architecture.md)

## Getting Help

If you encounter issues:

1. Check the [GitHub Issues](https://github.com/neill-k/generic-corp/issues)
2. Review [troubleshooting docs](../troubleshooting.md)
3. Ask in [GitHub Discussions](https://github.com/neill-k/generic-corp/discussions)
