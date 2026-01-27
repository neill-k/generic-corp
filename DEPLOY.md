# Generic Corp - Deployment Guide

Quick guide for deploying the Generic Corp demo.

## Quick Deploy (Development)

The fastest way to get the demo running:

```bash
# 1. Start infrastructure
pnpm docker:up

# 2. Start dev servers
pnpm dev
```

- Landing page: http://localhost:5173
- Game interface: http://localhost:5173/game
- API: http://localhost:3000

## Production Build

### Option 1: Docker Deployment (Recommended)

Build and run the frontend as a Docker container:

```bash
# Build the Docker image
docker build -f apps/game/Dockerfile -t generic-corp-game .

# Run the container
docker run -p 8080:80 generic-corp-game
```

Access at: http://localhost:8080

### Option 2: Static Hosting

Deploy to platforms like Netlify, Vercel, or Cloudflare Pages:

```bash
# Build the frontend
cd apps/game
pnpm build

# Deploy the dist/ folder to your hosting provider
```

#### Environment Variables for Production

Create `.env.production` in `apps/game/`:

```env
VITE_API_URL=https://your-backend-api.com
VITE_WS_URL=wss://your-backend-api.com
```

### Option 3: Full Stack with Docker Compose

Deploy both frontend and backend together:

```bash
# Add to docker-compose.yml
docker compose up --build
```

## Backend Deployment

The backend requires:
- PostgreSQL 16+
- Redis 7+
- Node.js 20+

### Environment Setup

Copy and configure the server environment:

```bash
cd apps/server
cp .env.example .env
# Edit .env with your production values
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Server port (default: 3000)

### Running the Server

```bash
cd apps/server

# Install dependencies
pnpm install

# Run migrations
pnpm db:push

# Start the server
pnpm start
```

## Cloud Deployment

### Railway / Render / Heroku

1. **Frontend**:
   - Build command: `cd apps/game && pnpm build`
   - Publish directory: `apps/game/dist`
   - Environment: Node 20

2. **Backend**:
   - Build command: `cd apps/server && pnpm build`
   - Start command: `cd apps/server && pnpm start`
   - Add PostgreSQL and Redis addons

### AWS / GCP / Azure

Use the provided Dockerfile or deploy to container services:

```bash
# Frontend
docker build -f apps/game/Dockerfile -t gcr.io/your-project/game .
docker push gcr.io/your-project/game

# Backend (create similar Dockerfile for server)
docker build -f apps/server/Dockerfile -t gcr.io/your-project/server .
docker push gcr.io/your-project/server
```

## Health Checks

Monitor deployment health:

```bash
# API health
curl https://your-api.com/health

# Check agents
curl https://your-api.com/api/agents
```

## Troubleshooting

### Frontend build fails
- Ensure TypeScript types are correct
- Check that `@generic-corp/shared` package is built
- Run `pnpm install` at the root

### Backend connection issues
- Verify DATABASE_URL and REDIS_URL are correct
- Check firewall rules for PostgreSQL (5432) and Redis (6379)
- Ensure WebSocket connections are allowed

### Agents not executing
- Verify Claude Agent SDK credentials in `~/.claude/.credentials.json`
- Check Claude API key is valid
- Review server logs for errors

## Performance

Recommended resources:
- Frontend: Any static hosting (CDN recommended)
- Backend: 1 CPU, 2GB RAM minimum
- PostgreSQL: 2GB RAM minimum
- Redis: 512MB RAM minimum

## Security Checklist

- [ ] Set strong DATABASE_URL password
- [ ] Enable SSL for PostgreSQL
- [ ] Configure CORS for production domain
- [ ] Set secure WebSocket origins
- [ ] Rotate Claude API keys regularly
- [ ] Enable rate limiting
- [ ] Set up monitoring and alerts

## Monitoring

Suggested monitoring setup:
- Frontend: Vercel Analytics, Google Analytics
- Backend: Application logs, PM2, New Relic
- Infrastructure: CloudWatch, Datadog, Grafana

## Support

For deployment issues:
- Check logs: `docker compose logs`
- Review STATUS.md for system status
- See TESTING.md for verification steps
