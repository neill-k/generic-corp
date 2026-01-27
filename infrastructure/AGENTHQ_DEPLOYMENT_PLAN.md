# AgentHQ Infrastructure Deployment Plan

**Date**: January 26, 2026
**Prepared By**: Yuki Tanaka, SRE
**Status**: 🟢 READY TO EXECUTE
**Timeline**: Landing page (TODAY), Demo environment (End of Week)

---

## Executive Summary

DeVonte needs infrastructure for AgentHQ launch this week. I'm providing a **fast-to-market deployment plan** that leverages free tiers and managed services to minimize setup time while maintaining production quality.

**Key Deliverables**:
1. ✅ Landing page infrastructure (agenthq.com) - **TODAY**
2. ✅ Demo environment (demo.agenthq.com) - **By Friday**
3. ✅ SSL certificates for both - **Automatic**
4. ✅ Basic monitoring - **Built-in**

**Cost**: $0-15/month (first 3 months on free tiers)

---

## Part 1: Landing Page Infrastructure (Priority 1 - TODAY)

### Recommended Approach: Vercel Deployment

**Why Vercel**:
- ✅ Zero-config SSL (automatic)
- ✅ Global CDN (instant performance)
- ✅ Free tier (generous limits)
- ✅ Deploy in 15 minutes
- ✅ Perfect for Next.js (what DeVonte is building)
- ✅ Built-in analytics and monitoring

**Setup Steps**:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy from project root
cd apps/landing  # (wherever DeVonte builds the landing page)
vercel --prod

# 3. Configure custom domain in Vercel dashboard
# Point agenthq.com to Vercel nameservers
```

**Domain Configuration**:
```
DNS Records (at domain registrar):

Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Timeline**: 30 minutes to live site (after domain is purchased)

**Alternative Options** (if Vercel doesn't work):

| Platform | Pros | Cons | Cost |
|----------|------|------|------|
| Netlify | Similar to Vercel, great DX | Less Next.js optimization | Free |
| Cloudflare Pages | Global edge, fast | More config required | Free |
| Railway | Backend + frontend together | Overkill for static site | $5/mo |

**My Recommendation**: Vercel. No question.

---

## Part 2: Demo Environment Infrastructure (Priority 2 - End of Week)

### Architecture Overview

```
┌─────────────────────────────────────────────┐
│  demo.agenthq.com (Public Demo)             │
│  - Multi-tenant isolated demo environment   │
│  - Rate-limited (100 req/min per IP)        │
│  - Resource-constrained (prevent abuse)     │
└─────────────┬───────────────────────────────┘
              │ HTTPS
┌─────────────┴───────────────────────────────┐
│  Railway/Render Managed Hosting              │
│  - Express API server                        │
│  - PostgreSQL (isolated demo DB)             │
│  - Redis (BullMQ queue)                      │
│  - WebSocket support                         │
└──────────────────────────────────────────────┘
```

### Recommended Approach: Railway Deployment

**Why Railway**:
- ✅ Free tier: $5 credit/month (good for demo)
- ✅ Managed PostgreSQL + Redis included
- ✅ Auto-SSL via custom domains
- ✅ GitHub integration (auto-deploy)
- ✅ WebSocket support (critical for real-time)
- ✅ Built-in monitoring
- ✅ One-click deployment

**Setup Steps**:

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create project
cd apps/server
railway init

# 4. Add services
railway add --database postgres
railway add --database redis

# 5. Deploy
railway up

# 6. Set custom domain
railway domain add demo.agenthq.com
```

**Environment Variables for Demo**:

```env
# Railway will auto-provide these:
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# We need to set these:
NODE_ENV=demo
DEMO_MODE=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
MAX_CONCURRENT_TASKS=5
AGENT_TIMEOUT_MS=30000
CORS_ORIGIN=https://agenthq.com,https://demo.agenthq.com
```

**Resource Limits for Demo** (prevent abuse):

```javascript
// Add to server configuration
const DEMO_LIMITS = {
  maxAgentsPerUser: 3,
  maxTasksPerDay: 50,
  taskTimeoutMs: 30000,  // 30 seconds max
  maxConcurrentTasks: 5,
  rateLimitPerMinute: 100,
  maxMessageLength: 1000
}
```

**Timeline**: 2-3 hours to configure and deploy

**Cost**:
- First month: FREE (trial credits)
- Ongoing: $5-10/month (if we exceed free tier)

### Alternative: Render

**Why Render** (backup option):
- ✅ Generous free tier
- ✅ PostgreSQL included
- ✅ Auto-deploy from GitHub
- ❌ Slower cold starts on free tier
- ❌ Redis requires paid plan ($7/mo)

**Recommendation**: Start with Railway, fall back to Render if needed.

---

## Part 3: Multi-Tenant Infrastructure Requirements

Based on Marcus's decision to start with **single-tenant MVP** (one instance per customer), here's what we need:

### Deployment Template (For Customer Instances)

**Option A: Docker Compose (Self-Hosted)**

Create a turnkey deployment package:

```yaml
# docker-compose.customer.yml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ${CUSTOMER_ID}_agenthq
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/var/lib/redis

  api:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/${CUSTOMER_ID}_agenthq
      REDIS_URL: redis://redis:6379
      CUSTOMER_ID: ${CUSTOMER_ID}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
  redis_data:
```

**One-command deployment**:
```bash
# Customer downloads package
git clone https://github.com/genericcorp/agenthq-deploy.git
cd agenthq-deploy

# Configure
cp .env.example .env
# Edit .env with their settings

# Deploy
docker-compose -f docker-compose.customer.yml up -d
```

**Option B: Managed Instance (Railway/Render)**

For each paying customer:
1. Create new Railway project
2. Clone template configuration
3. Deploy with customer-specific env vars
4. Point their subdomain (customer1.agenthq.com) to instance

**Cost per customer**: $20-40/month (managed services)

---

## Part 4: Monitoring & Observability

### Immediate Needs (Week 1)

**Health Checks**:
```javascript
// Add to Express API
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkPostgres(),
    redis: await checkRedis(),
    queue: await checkBullMQ(),
    disk: await checkDiskSpace(),
    memory: process.memoryUsage()
  }

  const healthy = Object.values(checks).every(c => c.status === 'ok')
  res.status(healthy ? 200 : 503).json(checks)
})
```

**Uptime Monitoring** (Free Options):
- **UptimeRobot**: Free, 50 monitors, 5-min intervals
- **BetterStack**: Free tier, beautiful UI, alerting
- **Healthchecks.io**: Free, cron job monitoring

**Recommendation**: UptimeRobot for demo (dead simple), BetterStack for production.

**Error Tracking**:
- **Sentry**: 5K events/month free
- Already configured in codebase
- Just need production DSN

**Setup**:
```bash
# Add to Railway environment
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=demo
```

### Analytics (Optional for Week 1)

**For Landing Page**:
- Vercel Analytics (built-in, free)
- Plausible (privacy-focused, $9/mo)

**For Demo App**:
- Basic usage tracking (log to DB)
- Track: signups, tasks created, agent minutes used

---

## Part 5: Security Hardening (Demo Environment)

### Rate Limiting (CRITICAL)

```javascript
// Add to Express middleware
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
})

app.use('/api/', limiter)
```

### CORS Configuration

```javascript
// Strict CORS for demo
app.use(cors({
  origin: [
    'https://agenthq.com',
    'https://www.agenthq.com',
    'https://demo.agenthq.com'
  ],
  credentials: true
}))
```

### Environment Isolation

```javascript
// Demo mode restrictions
if (process.env.DEMO_MODE === 'true') {
  // Read-only for certain operations
  // Stricter timeouts
  // Reduced resource limits
  // No access to production data
}
```

---

## Part 6: Deployment Automation

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy-demo.yml
name: Deploy Demo

on:
  push:
    branches: [main]
    paths:
      - 'apps/server/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Railway
        run: |
          npm i -g @railway/cli
          railway link ${{ secrets.RAILWAY_PROJECT_ID }}
          railway up --detach
```

**Benefits**:
- Auto-deploy on merge to main
- Zero manual intervention
- Rollback with git revert

---

## Part 7: Cost Analysis

### Month 1-3 (Free Tier Strategy)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel (Landing) | $0 | 100GB bandwidth free |
| Railway (Demo) | $0 | $5 trial credit |
| Domain (agenthq.com) | $12/year | One-time |
| SSL Certificates | $0 | Auto via Vercel/Railway |
| UptimeRobot | $0 | Free tier |
| Sentry | $0 | 5K events/month |
| **Total** | **$1/month** | (domain amortized) |

### Month 4+ (After Free Tiers)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel Pro | $20/mo | If traffic exceeds free |
| Railway | $10/mo | Demo environment |
| Sentry | $0 | Still under free limit |
| **Total** | **$30/month** | Still very affordable |

### Per Customer (Single-Tenant Instances)

**Self-Hosted (Docker)**:
- Infrastructure cost: $0 (customer pays)
- Support cost: 1-2 hours setup time

**Managed (Railway)**:
- Our cost: $20-40/month per instance
- Customer charge: $49-149/month
- Margin: 65-85%

---

## Part 8: Timeline & Dependencies

### Today (Sunday, Jan 26)

**DeVonte**:
- [ ] Build landing page (Next.js)
- [ ] Provide build output directory

**Yuki** (me):
- [ ] Purchase domain (agenthq.com) OR get access if Marcus bought it
- [ ] Set up Vercel project
- [ ] Configure DNS
- [ ] Deploy landing page

**Blockers**:
- Need domain credentials (registrar login)
- Need DeVonte's landing page code

**Timeline**: 2-4 hours (mostly DNS propagation)

### Monday-Tuesday (Jan 27-28)

**DeVonte**:
- [ ] Build demo environment UI
- [ ] Add demo-specific limitations to frontend

**Yuki** (me):
- [ ] Set up Railway project
- [ ] Configure PostgreSQL + Redis
- [ ] Add rate limiting middleware
- [ ] Add demo mode restrictions
- [ ] Deploy to demo.agenthq.com

**Timeline**: 1 day of focused work

### Wednesday-Friday (Jan 29-31)

**Yuki** (me):
- [ ] Set up monitoring (UptimeRobot + Sentry)
- [ ] Create deployment documentation
- [ ] Write customer deployment guide (Docker)
- [ ] Load testing
- [ ] Security audit

**Timeline**: 3 days polish and hardening

---

## Part 9: DeVonte's Questions - Answered

### 1. Domain Setup (agenthq.com + demo.agenthq.com)

**Status**: Need Marcus to purchase OR provide registrar access

**DNS Configuration** (I'll handle):
```
agenthq.com → Vercel (landing page)
demo.agenthq.com → Railway (demo environment)
```

**SSL**: Automatic via both platforms (zero config)

### 2. Landing Page Hosting

**Decision**: Vercel

**Why**:
- Built for Next.js (what you're using)
- Fastest deployment path
- Best performance (global CDN)
- Free tier perfect for our needs

**What I need from you**:
- Landing page code in repo (apps/landing or similar)
- Build command (e.g., `npm run build`)
- Output directory (e.g., `.next` or `dist`)

### 3. Demo Environment Recommendation

**Decision**: Railway

**Architecture**:
- Managed PostgreSQL (isolated from production)
- Managed Redis (for queue)
- Auto-scaling Node.js server
- Built-in SSL + custom domain support

**Resource Limits** (to prevent abuse):
- 3 agents max per user
- 50 tasks max per day
- 30-second task timeout
- 100 requests/minute per IP

**What I need from you**:
- Confirmation this works with your UI design
- Any demo-specific features (e.g., "Try Demo" flow)

---

## Part 10: Multi-Tenant Architecture (Future)

Per Marcus's strategy, we're delaying full multi-tenant build until we validate demand. Here's the approach for when we're ready:

### Phase 1: Single-Tenant MVP (Week 1-2)
- One instance per customer (managed via Railway/Render)
- Manual deployment
- Simple subdomain routing (customer1.agenthq.com)

### Phase 2: Multi-Tenant SaaS (Week 3-4)
Trigger this AFTER we have 3-5 paying customers:

**Database Changes**:
```prisma
model Organization {
  id          String   @id @default(uuid())
  subdomain   String   @unique
  name        String
  tier        String   @default("free")
  agents      Agent[]
  tasks       Task[]
}

model Agent {
  id              String   @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  // ... existing fields
}
```

**Query Middleware** (tenant context):
```javascript
// Add to all queries
prisma.$use(async (params, next) => {
  if (params.model && !params.args.where?.organizationId) {
    throw new Error('Missing organizationId - potential data leak!')
  }
  return next(params)
})
```

**Effort**: 2-3 days (as outlined in INFRASTRUCTURE_ASSESSMENT.md)

---

## Part 11: Immediate Action Items

### Yuki's TODO (Starting NOW):

**Priority 1 - Today**:
- [ ] Sync with Marcus on domain (do we have agenthq.com?)
- [ ] Set up Vercel account (if not already)
- [ ] Create Railway account
- [ ] Document deployment credentials

**Priority 2 - After DeVonte Delivers Landing Page**:
- [ ] Deploy landing page to Vercel
- [ ] Configure agenthq.com DNS
- [ ] Verify SSL certificate

**Priority 3 - Monday-Tuesday**:
- [ ] Set up Railway project for demo
- [ ] Configure PostgreSQL + Redis
- [ ] Add rate limiting + demo restrictions
- [ ] Deploy demo.agenthq.com
- [ ] Set up monitoring (UptimeRobot + Sentry)

### DeVonte's TODO:

**From Me (Yuki)**:
1. What's your landing page build process? (Next.js export? SSG?)
2. Where is the landing page code going in the repo?
3. What demo-specific UI features do you need?

**Domain Question for Marcus**:
- Do we own agenthq.com already?
- If yes, what registrar? (need DNS access)
- If no, should I purchase now? ($12/year)

---

## Part 12: Risk Mitigation

### Risk: Domain Purchase Delayed
**Impact**: Can't deploy landing page
**Mitigation**: Deploy to Vercel preview URL first (demo.vercel.app), point domain later
**Timeline Buffer**: Deploy works without domain, just need to update DNS

### Risk: Railway Free Tier Insufficient
**Impact**: Demo costs $10/month instead of free
**Mitigation**: Already budgeted for this, not a blocker
**Fallback**: Render.com has similar pricing

### Risk: DNS Propagation Takes 24-48 Hours
**Impact**: Landing page not accessible immediately
**Mitigation**: Use Vercel preview URL for testing, announce domain when live
**Best Practice**: Update DNS now, propagates while we build

### Risk: Demo Environment Abused (Too Much Traffic)
**Impact**: Costs spike or service degrades
**Mitigation**:
- Hard rate limits (100 req/min per IP)
- Resource caps (3 agents, 50 tasks/day)
- Alert if costs exceed $20/month
- Can shut down demo if needed (not critical)

---

## Part 13: Success Metrics

### Week 1 Goals:
- [ ] Landing page live at agenthq.com
- [ ] Demo environment live at demo.agenthq.com
- [ ] Both have valid SSL certificates
- [ ] Health monitoring active (UptimeRobot)
- [ ] Error tracking active (Sentry)
- [ ] Rate limiting preventing abuse

### Performance Targets:
- Landing page: < 2s load time (global)
- Demo API: < 100ms p95 latency
- Uptime: 99%+ (demo environment)

### Cost Target:
- Month 1-3: $0-15/month total
- After scale: < $50/month for demo + landing

---

## Conclusion

**We can ship fast and cheap.**

The infrastructure plan leverages modern managed services to minimize setup time while maintaining production quality. Total cost for first 3 months: **~$12 (domain only)**.

**Timeline**:
- Landing page: **TODAY** (4 hours)
- Demo environment: **By Friday** (2-3 days)

**Confidence Level**: 95% - this is proven tech, low risk.

**What I Need to Proceed**:
1. Domain access (agenthq.com)
2. DeVonte's landing page code
3. Greenlight from Marcus

Let's ship. 🚀

---

**Next Steps**:
1. I'm messaging Marcus and DeVonte now
2. Starting setup work immediately
3. Will report progress daily

**Contact**: Reach me anytime for infra questions

**Status**: ✅ PLAN COMPLETE | 🎯 READY TO EXECUTE
