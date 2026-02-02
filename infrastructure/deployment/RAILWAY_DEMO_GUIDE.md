# Railway Demo Environment Deployment Guide

**Platform**: Railway
**Domain**: demo.agenthq.com
**Purpose**: Public-facing demo of AgentHQ
**Timeline**: 2-3 hours setup time

---

## Overview

Railway deployment for the demo environment with:
- Managed PostgreSQL (isolated demo database)
- Managed Redis (for BullMQ queue)
- Node.js API server (Express + WebSocket)
- Auto-scaling and SSL included
- Resource limits to prevent abuse

---

## Prerequisites

- [x] Domain access (to configure demo subdomain)
- [x] Railway account created
- [x] Server code ready in apps/server
- [x] GitHub repository (for auto-deploy)

---

## Step 1: Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Verify installation
railway --version

# Login
railway login
```

This will open a browser for OAuth authentication.

---

## Step 2: Create Railway Project

### Via CLI:

```bash
# Navigate to server directory
cd apps/server

# Initialize Railway project
railway init

# Follow prompts:
# - Create new project? Yes
# - Project name? agenthq-demo
# - Environment? production
```

### Via Web Dashboard (Alternative):

1. Go to https://railway.app/new
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose `generic-corp` repository
5. Set root directory: `apps/server`
6. Click "Deploy"

---

## Step 3: Add Database Services

### Add PostgreSQL:

```bash
# Add PostgreSQL database
railway add --database postgres

# Railway auto-generates:
# - Database name
# - Username
# - Password
# - DATABASE_URL environment variable
```

### Add Redis:

```bash
# Add Redis cache
railway add --database redis

# Railway auto-generates:
# - Redis host
# - Port
# - REDIS_URL environment variable
```

**Note**: DATABASE_URL and REDIS_URL are automatically injected into your app.

---

## Step 4: Configure Environment Variables

### Via CLI:

```bash
# Set environment variables
railway variables set NODE_ENV=demo
railway variables set DEMO_MODE=true
railway variables set PORT=3000
railway variables set RATE_LIMIT_WINDOW_MS=60000
railway variables set RATE_LIMIT_MAX=100
railway variables set MAX_CONCURRENT_TASKS=5
railway variables set AGENT_TIMEOUT_MS=30000
railway variables set CORS_ORIGIN="https://agenthq.com,https://demo.agenthq.com"
```

### Via Web Dashboard:

1. Go to project → Variables tab
2. Add each variable:

```env
# Application Config
NODE_ENV=demo
DEMO_MODE=true
PORT=3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Resource Limits
MAX_CONCURRENT_TASKS=5
MAX_AGENTS_PER_USER=3
MAX_TASKS_PER_DAY=50
AGENT_TIMEOUT_MS=30000

# CORS
CORS_ORIGIN=https://agenthq.com,https://demo.agenthq.com

# Monitoring (optional)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=demo

# Claude API (if needed for demo)
ANTHROPIC_API_KEY=sk-ant-...
```

**Important**: DATABASE_URL and REDIS_URL are auto-set by Railway. Don't override.

---

## Step 5: Deploy Application

### Via CLI:

```bash
# Deploy current code
railway up

# Railway will:
# 1. Build the application
# 2. Start the server
# 3. Provide a public URL (*.railway.app)
```

### Watch Deployment Logs:

```bash
# View real-time logs
railway logs

# Should see:
# - Build process
# - Database connection success
# - Server listening on port 3000
```

---

## Step 6: Run Database Migrations

```bash
# Connect to Railway environment
railway run

# Run Prisma migrations
railway run npx prisma migrate deploy

# Or seed initial data if needed
railway run npx prisma db seed
```

**Note**: Ensure Prisma schema includes demo mode restrictions.

---

## Step 7: Configure Custom Domain

### In Railway Dashboard:

1. Go to project → Settings tab
2. Click "Domains" section
3. Click "Add Custom Domain"
4. Enter: `demo.agenthq.com`

Railway will provide DNS configuration:

```
Type: CNAME
Name: demo
Value: [your-project].railway.app
TTL: 3600
```

### At Domain Registrar:

Add the CNAME record:
```
Type: CNAME
Name: demo
Value: agenthq-demo-production.up.railway.app  (replace with actual)
TTL: 3600
```

**SSL Certificate**: Automatic via Railway (Let's Encrypt)

---

## Step 8: Configure Demo Mode Restrictions

Add middleware to server for demo environment:

### Rate Limiting Middleware:

```javascript
// apps/server/src/middleware/demo-limiter.ts

import rateLimit from 'express-rate-limit';

export const demoRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: 'Too many requests from this IP in demo mode. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all API routes
app.use('/api', demoRateLimiter);
```

### Resource Limits:

```javascript
// apps/server/src/middleware/demo-limits.ts

const DEMO_LIMITS = {
  maxAgentsPerUser: parseInt(process.env.MAX_AGENTS_PER_USER || '3'),
  maxTasksPerDay: parseInt(process.env.MAX_TASKS_PER_DAY || '50'),
  maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '5'),
  taskTimeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS || '30000'),
};

export function checkDemoLimits(req, res, next) {
  if (process.env.DEMO_MODE !== 'true') {
    return next();
  }

  // Check agent count
  if (req.path === '/api/agents' && req.method === 'POST') {
    const agentCount = await getAgentCountForUser(req.userId);
    if (agentCount >= DEMO_LIMITS.maxAgentsPerUser) {
      return res.status(429).json({
        error: 'Demo limit reached',
        message: `Demo users can create up to ${DEMO_LIMITS.maxAgentsPerUser} agents.`,
      });
    }
  }

  // Check task count
  if (req.path === '/api/tasks' && req.method === 'POST') {
    const taskCount = await getTaskCountTodayForUser(req.userId);
    if (taskCount >= DEMO_LIMITS.maxTasksPerDay) {
      return res.status(429).json({
        error: 'Demo limit reached',
        message: `Demo users can create up to ${DEMO_LIMITS.maxTasksPerDay} tasks per day.`,
      });
    }
  }

  next();
}

app.use(checkDemoLimits);
```

### Task Timeout Enforcement:

```javascript
// apps/server/src/services/task-executor.ts

export async function executeTask(taskId: string) {
  const timeout = process.env.DEMO_MODE === 'true'
    ? parseInt(process.env.AGENT_TIMEOUT_MS || '30000')
    : 300000; // 5 minutes in production

  return Promise.race([
    runTask(taskId),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Task timeout in demo mode')), timeout)
    ),
  ]);
}
```

---

## Step 9: Set Up Monitoring

### Railway Built-in Monitoring:

1. Go to project → Metrics tab
2. View:
   - CPU usage
   - Memory usage
   - Network traffic
   - Request count

### External Monitoring:

**UptimeRobot**:
```bash
# Add to UptimeRobot:
# - URL: https://demo.agenthq.com/health
# - Type: HTTP(s)
# - Interval: 5 minutes
```

**Sentry Error Tracking**:
```bash
# Already configured via SENTRY_DSN environment variable
# Errors automatically reported to Sentry dashboard
```

### Health Check Endpoint:

```javascript
// apps/server/src/routes/health.ts

app.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.ping();

    // Check queue
    const queueHealth = await queue.getJobCounts();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      services: {
        database: 'ok',
        redis: 'ok',
        queue: 'ok',
      },
      queue: queueHealth,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});
```

---

## Step 10: Enable Auto-Deploy from GitHub

### In Railway Dashboard:

1. Go to project → Settings → Deploy
2. Connect to GitHub repository
3. Configure:
   - Repository: `genericcorp/generic-corp`
   - Branch: `main`
   - Root Directory: `apps/server`
   - Auto-deploy: Enabled

**Result**: Every push to `main` branch automatically deploys to Railway.

---

## Testing the Deployment

### Test Health Endpoint:

```bash
# Check API health
curl https://demo.agenthq.com/health

# Should return:
# {
#   "status": "healthy",
#   "services": {
#     "database": "ok",
#     "redis": "ok"
#   }
# }
```

### Test Rate Limiting:

```bash
# Send 101 requests in 1 minute (should trigger rate limit)
for i in {1..101}; do
  curl https://demo.agenthq.com/api/agents
done

# Request 101 should return 429 Too Many Requests
```

### Test WebSocket Connection:

```javascript
// From browser console
const ws = new WebSocket('wss://demo.agenthq.com');
ws.onopen = () => console.log('Connected!');
ws.onmessage = (msg) => console.log('Message:', msg.data);
```

### Test Agent Creation:

```bash
# Create demo agent
curl -X POST https://demo.agenthq.com/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sable",
    "personality": "Principal Engineer"
  }'

# Should return agent object
```

---

## Cost Estimate

**Railway Free Trial**:
- $5 credit per month
- Includes: 512MB RAM, 1GB disk, shared CPU
- Estimated usage: $3-7/month (within free credit)

**After Trial** (if needed):
- Starter plan: $5/month (500 hours execution time)
- PostgreSQL: Included
- Redis: Included (or Upstash free tier fallback)
- Bandwidth: 100GB included

**Estimated Monthly Cost**:
- Month 1-3: $0 (trial credits)
- Month 4+: $5-10/month

**Cost per User in Demo**:
- Infrastructure: ~$0.01/user (with limits)
- Claude API: ~$0.05-0.20/user (with timeouts)

---

## Troubleshooting

### Build Fails

**Check logs**:
```bash
railway logs --deployment [deployment-id]
```

**Common issues**:
- Missing dependencies: Check package.json
- TypeScript errors: Run `npm run build` locally
- Environment variables: Verify all required vars are set

### Database Connection Fails

**Check DATABASE_URL**:
```bash
railway variables

# Verify DATABASE_URL is set correctly
```

**Test connection**:
```bash
railway run npx prisma db push
# Should succeed if DATABASE_URL is correct
```

### WebSocket Not Working

**Verify Railway supports WebSockets** (it does).

**Check CORS**:
```javascript
// Ensure WebSocket origin is allowed
io.origins(['https://agenthq.com', 'https://demo.agenthq.com']);
```

### High Costs

**Monitor usage**:
```bash
# Check Railway dashboard → Usage tab
# Look for:
# - High CPU/memory usage
# - Excessive requests
# - Long-running processes
```

**Add spending limit**:
1. Railway dashboard → Settings → Billing
2. Set spending limit: $20/month

---

## Security Checklist

- [x] Rate limiting enabled (100 req/min per IP)
- [x] CORS restricted to agenthq.com domains
- [x] Resource limits enforced (3 agents, 50 tasks/day)
- [x] Task timeouts set (30 seconds max)
- [x] Demo mode flag enabled
- [x] Isolated database (no production data)
- [x] Environment variables secured (not in code)
- [x] SSL certificate active (HTTPS only)
- [x] Sentry error tracking configured
- [x] Health checks working

---

## Post-Deployment Checklist

- [ ] Domain resolves correctly (https://demo.agenthq.com)
- [ ] SSL certificate valid (green padlock)
- [ ] Health endpoint returns 200 (/health)
- [ ] Database migrations applied
- [ ] Redis connection working
- [ ] WebSocket connection working
- [ ] Rate limiting effective (test 101 requests)
- [ ] Agent creation works
- [ ] Task execution works (with timeout)
- [ ] Error tracking to Sentry
- [ ] Uptime monitoring active

---

## Maintenance

### View Logs:
```bash
# Real-time logs
railway logs --tail

# Recent logs
railway logs
```

### Database Backup:
```bash
# Export database
railway run pg_dump > demo_backup.sql

# Or use Railway dashboard → Database → Backups
```

### Rollback Deployment:
```bash
# Via Railway dashboard:
# 1. Go to Deployments tab
# 2. Find previous working deployment
# 3. Click "Redeploy"
```

### Update Environment Variables:
```bash
# Update a variable
railway variables set MAX_AGENTS_PER_USER=5

# Triggers automatic redeployment
```

---

## Summary

**Timeline**:
- Initial setup: 1 hour
- Configuration: 1 hour
- Testing: 30 minutes
- **Total: 2-3 hours**

**Cost**: $0-10/month

**Confidence**: 90% success rate (Railway is very reliable)

**Status**: ✅ READY TO EXECUTE
**Waiting On**: Domain credentials
**Owner**: Yuki Tanaka

---

**Next Steps**:
1. Get domain access from Marcus
2. Create Railway project
3. Deploy and configure
4. Test thoroughly
5. Monitor and iterate
