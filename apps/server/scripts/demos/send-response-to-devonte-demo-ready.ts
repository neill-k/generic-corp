import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Yuki and DeVonte
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!yuki || !devonte) {
      console.log('Could not find agents');
      console.log('Yuki:', yuki);
      console.log('DeVonte:', devonte);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: yuki.id,
      toAgentId: devonte.id,
      subject: 'RE: Demo Environment - Infrastructure Ready ✅',
      body: `Hey DeVonte,

Perfect! Your plan looks solid and I'm ready to support you on the infrastructure side. Here are answers to your questions and coordination points.

## Infrastructure Answers

**Q1: Auth Flow - JWT or OAuth?**
**Answer: JWT-based API keys** (as you assumed)

- JWT tokens for user sessions (15-min expiry, refresh token flow)
- Long-lived API keys for programmatic access (bcrypt hashed)
- I'm setting up Supabase Auth on free tier (gives us both patterns out of the box)
- You can start building against standard JWT middleware - I'll have it ready by Tuesday

**Q2: Database Connection Pooling**
**Answer: PgBouncer + pg-pool**

- PgBouncer for connection pooling at infrastructure layer (transaction mode)
- \`pg\` with \`pg-pool\` in application code
- Max connections per tenant: 25 (you can assume this in your code)
- I'll expose a single \`DATABASE_URL\` env var - pooling is transparent to your code

**Q3: Async Job Processing**
**Answer: YES, use BullMQ** ✅

- BullMQ is our coordination layer (already integrated with Redis)
- Create tenant-scoped queues: \`tenant:\${tenantId}:queue:\${queueName}\`
- I'll have Redis cluster ready by Tuesday with proper namespacing
- Example queue names: \`agent-execution\`, \`workflow-processing\`, \`notifications\`

**Q4: Staging Environment Timeline**
**Answer: Staging ready by Tuesday EOD (Jan 28)**

I can have a full staging environment deployed by Tuesday evening:
- Isolated PostgreSQL database (separate from production)
- Isolated Redis instance
- Same configuration as production (just smaller instances)
- Accessible at \`staging-api.genericcorp.com\` (pending DNS setup)
- Auto-deployed from \`develop\` branch

## Demo Environment - Infrastructure Support

Your immediate demo actions look great. Here's what I'm providing:

**✅ Already Ready:**
- Demo infrastructure in \`/infrastructure/deployment/docker-compose.demo.yml\`
- Isolated demo database (port 5433 to avoid conflicts)
- Isolated Redis (port 6380)
- Rate limiting: 100 req/min per IP
- SSL/TLS auto-provisioning via Vercel
- Monitoring scripts in \`/infrastructure/monitoring/\`

**🔧 What I'm Setting Up This Week:**

**Monday-Tuesday:**
- Supabase Auth integration (JWT + API keys)
- Multi-tenant database schema with \`tenant_id\` on all tables
- Redis namespacing for tenant isolation

**Wednesday-Thursday:**
- Rate limiting middleware (per-tenant + per-IP)
- Usage tracking/metering (for your dashboard)
- Structured logging with tenant_id (for your execution visualization)

**Friday:**
- Staging environment fully deployed
- Monitoring dashboards (you can hook into these for demo usage stats)
- Documentation for deployment

## Multi-Tenant Architecture - Your Side

You're already aligned on the right approach:

**✅ Option B: Shared DB + tenant_id** - Correct choice for MVP
**✅ Stateless application tier** - Perfect for horizontal scaling
**✅ Tenant-level rate limiting hooks** - I'll provide middleware you can plug in

**Data Model Requirements:**
Every table you create should have:
\`\`\`sql
tenant_id UUID NOT NULL REFERENCES public.tenants(id)
\`\`\`

I'll provide a Prisma schema template with proper indexes:
\`\`\`typescript
@@index([tenant_id, created_at])
@@unique([tenant_id, some_business_key])
\`\`\`

## Integration Points

**1. User Signup/Login Flow:**
\`\`\`typescript
// I'll provide this middleware
app.post('/api/auth/signup', tenantProvisioningMiddleware, signupHandler);
// This will:
// - Create tenant record
// - Create tenant schema
// - Generate API keys
// - Return JWT token
\`\`\`

**2. Agent Creation API:**
\`\`\`typescript
// Your endpoint (tenant context auto-injected by my middleware)
app.post('/api/agents', authenticate, async (req, res) => {
  const { tenant } = req; // injected by my middleware
  const agent = await req.prisma.agent.create({
    data: { ...req.body, tenant_id: tenant.id }
  });
  res.json(agent);
});
\`\`\`

**3. Execution Dashboard - Structured Logging:**
I'll provide a Winston logger with:
\`\`\`typescript
logger.info('Agent execution started', {
  tenant_id: tenant.id,
  agent_id: agent.id,
  workflow_id: workflow.id,
  timestamp: new Date().toISOString()
});
\`\`\`

You can query these logs via \`GET /api/logs?tenant_id=...\`

**4. Usage Tracking - Per-Tenant Metrics:**
I'm building a metrics service you can call:
\`\`\`typescript
await metricsService.track(tenant.id, 'agent.execution', {
  agent_id: agent.id,
  duration_ms: 1500,
  status: 'success'
});
\`\`\`

This feeds your usage dashboard and our billing system.

## Demo Environment Deployment

**Deployment Options:**

**Option A: Vercel (Recommended for Landing Page + Demo UI)**
- Cost: $0/month (free tier)
- Setup time: 15 minutes
- Auto-SSL, global CDN
- Perfect for Next.js frontend

**Option B: Railway (Recommended for Backend API)**
- Cost: $5/month (free tier available)
- Setup time: 30 minutes
- Good for Node.js APIs with Postgres
- Easy environment variable management

**My Recommendation:**
- Frontend (landing page + demo UI): Vercel
- Backend API: Railway or Docker on a small VPS
- Database: Railway Postgres (free tier for demo)

**DNS Configuration:**
Once Marcus provides access to domain registrar:
- \`demo.genericcorp.com\` → Your Vercel deployment (frontend)
- \`demo-api.genericcorp.com\` → Railway/VPS (backend)

## Pre-Populated Demo Workflows

I can help set up isolated demo tenant data:

\`\`\`sql
-- Demo tenant (read-only mode)
INSERT INTO public.tenants (id, slug, status, plan_tier)
VALUES ('demo-tenant-id', 'demo', 'active', 'demo');

-- Pre-populated agents, workflows, etc in tenant_demo schema
\`\`\`

Your demo UI can hardcode \`tenant_id = 'demo-tenant-id'\` and show pre-built workflows.

## Coordination Plan

**This Week Schedule:**

**Monday (Today):**
- ✅ You: Start on user signup/login UI
- ✅ Me: Set up Supabase Auth, provide JWT middleware

**Tuesday:**
- ✅ You: Build agent creation UI
- ✅ Me: Multi-tenant schema ready, staging environment deployed

**Wednesday:**
- ✅ You: Agent execution dashboard UI
- ✅ Me: Rate limiting + usage tracking ready

**Thursday:**
- ✅ You: Pre-built workflow templates
- ✅ Me: Structured logging + monitoring hooks

**Friday:**
- ✅ You: Real-time execution visualization
- ✅ Me: Full staging environment tested and documented
- 🎯 **DEMO ENVIRONMENT LIVE**

## Quick Sync?

Want to do a 15-min sync call tomorrow (Tuesday AM) to finalize:
- Exact API contract for tenant provisioning
- Database schema review
- Deployment strategy confirmation

I'm biased toward async communication, but given we're moving fast and have tight coupling on auth + multi-tenancy, a quick sync might save us both time.

Let me know your preference!

## What I Need From You

1. **Environment Variables:** What env vars do you need exposed in staging/production?
2. **Database Migrations:** Are you using Prisma migrations or raw SQL? (I'll coordinate)
3. **Health Check Endpoint:** Can you add \`GET /health\` and \`GET /ready\` endpoints?
4. **Deployment Branch:** Should I auto-deploy \`main\` to production and \`develop\` to staging?

## Confidence Level

**95% confident** we can have staging environment ready by Tuesday EOD and full demo environment by Friday.

**Risks:**
- DNS configuration delays (blocked on Marcus providing access)
- Supabase Auth quirks (mitigated: I'll have a fallback JWT implementation)

**No blockers** on my end for the infrastructure work you need.

Ready to ship this! 🚀

— Yuki

P.S. I love the "ship fast and iterate" mindset. Nothing on my side will slow you down.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to DeVonte Jackson');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
