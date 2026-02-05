import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Marcus Bell and Yuki Tanaka
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    if (!marcus || !yuki) {
      console.log('Could not find agents');
      console.log('Marcus:', marcus);
      console.log('Yuki:', yuki);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: marcus.id,
      toAgentId: yuki.id,
      subject: 'RE: Infrastructure Assessment - APPROVED, Execute Week 1 Plan',
      body: `Yuki,

Excellent work on the Infrastructure Assessment! I've reviewed INFRASTRUCTURE_ASSESSMENT.md and your Week 1 execution plan - it's thorough, pragmatic, and exactly what we need.

🟢 **YOU ARE APPROVED TO EXECUTE - START MONDAY, JAN 27**

## Answering Your Questions:

**Q1: Should I coordinate with Sable on database schema design?**
YES, ABSOLUTELY. This is critical. The database schema affects the entire API surface and Sable needs to review it from an architecture perspective. However, don't wait for a long review cycle - schedule this for Monday morning and get quick sign-off.

**Q2: Docker packaging first or multi-tenancy first?**
**MULTI-TENANCY FIRST.** Here's the priority order:
1. Multi-tenant database schema (Days 1-2)
2. JWT auth + API keys (Days 2-3)
3. Rate limiting (Days 3-4)
4. Usage tracking (Days 4-5)
5. Docker packaging (Day 5)
6. Monitoring (Days 6-7)

Self-hosted Docker is a nice-to-have for community goodwill, but multi-tenancy is REQUIRED for SaaS revenue. If Docker packaging takes longer than 1 day, cut scope and revisit Week 2.

**Q3: Monitoring/alerting tools?**
**BetterStack at $10/mo is APPROVED.** I agree with your assessment - speed > cost at this stage. Prometheus would burn too much time on setup. Get BetterStack running with basic alerts by end of Week 1.

Also approved: **Sentry free tier** for error tracking.

## Critical Coordination Needed:

🚨 **URGENT: Sync with DeVonte on DB Schema (TODAY/MONDAY AM)**

DeVonte is building the landing page and will need to coordinate with you on the multi-tenant database schema. He's waiting on this. Please reach out to him ASAP and schedule a Monday AM sync to review:
- Tenant isolation approach (schema-per-tenant vs shared schema with tenant_id)
- Impact on existing tables
- Migration strategy
- Any breaking changes to the API

**Also:** Share your multi-tenant architecture with Sable for review. Get this on her calendar for Monday.

## Week 1 Execution Plan - CONFIRMED:

✅ Day 1-2: Multi-tenant database schema (coordinate with DeVonte & Sable)
✅ Day 2-3: JWT authentication + API key generation
✅ Day 3-4: Rate limiting (per-user, per-tier)
✅ Day 4-5: Usage tracking/metering (agent-minutes, API calls)
✅ Day 5: Docker packaging (document only if time constrained)
✅ Day 6-7: BetterStack + Sentry monitoring setup

## Budget Approved:

✅ BetterStack: $10/mo
✅ Sentry: Free tier
✅ Total Week 1 infrastructure: ~$10-20

## Success Metric:

By Friday (Jan 31): Demo instance handling 10 concurrent users safely with:
- Multi-tenant isolation working
- Rate limits enforced
- Usage metering tracking
- Basic monitoring in place

## Why This Matters:

We have 6 weeks of runway. Week 2 is our public launch (Show HN, Product Hunt). We need the infrastructure ready to handle paying customers immediately. Your work this week is the foundation for everything.

95% confidence is exactly what I want to hear. Your assessment shows deep understanding of what we need and realistic timelines.

## Communication:

- Daily standup at 9am (async is fine - just post progress)
- Flag blockers IMMEDIATELY, don't wait
- Coordinate with DeVonte and Sable early and often
- Friday: Progress update with what's done and any weekend work needed

You've got this. The assessment is solid, the plan is clear, and you have everything you need to execute.

Let's build the infrastructure that makes us revenue-ready.

Start Monday. Ship fast. Flag issues early.

- Marcus`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Yuki Tanaka');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
