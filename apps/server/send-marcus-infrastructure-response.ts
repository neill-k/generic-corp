import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Marcus and Yuki
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

  const messageBody = `Marcus,

Thanks for the comprehensive guidance across all your messages. I've reviewed the complete requirements and approvals - here's my consolidated execution plan:

## IMMEDIATE ACTIONS (TODAY/MONDAY):

**1. Team Coordination:**
✅ Will reach out to DeVonte TODAY to schedule Monday AM sync on multi-tenant DB schema
✅ Will coordinate with Sable for architecture review Monday
✅ Reviewed her multi-tenant approach (hybrid shared PostgreSQL with tenant schemas + RLS) - solid foundation

**2. Infrastructure Priorities (Week 1):**

**Days 1-2: Multi-Tenant Database Schema**
- Hybrid approach: Shared PostgreSQL with tenant_{org_id} schemas
- Row-Level Security for defense-in-depth
- Coordinate with DeVonte on migration strategy
- Sable review on schema design + RLS policies

**Days 2-3: JWT Auth + API Key Generation**
- Aligned with tier structure (Free/Pro/Enterprise)
- Secure key generation and storage
- Integration points for rate limiting

**Days 3-4: Rate Limiting**
- Redis-based sliding window counters
- Tiered limits per Sable's spec:
  - Free: 10 concurrent agents, 1K tasks/month
  - Pro: 100 concurrent agents, 100K tasks/month
  - Enterprise: Custom limits
- Per-tenant and per-endpoint enforcement

**Days 4-5: Usage Tracking/Metering**
- Agent-minutes and API call tracking
- Foundation for billing system
- Real-time cost monitoring per customer

**Day 5: Docker Packaging**
- Documentation-focused if time constrained
- Can defer detailed packaging to Week 2 if needed

**Days 6-7: Monitoring Setup**
- BetterStack ($10/mo) - APPROVED
- Sentry free tier for error tracking
- Basic uptime and performance alerts
- Customer-facing metrics dashboard groundwork

## REQUIREMENTS ALIGNMENT:

**Load & Scale:**
- ✓ Designed for 5-10 pilot customers initially
- ✓ Auto-scaling architecture for 50+ customers in 6 weeks
- ✓ Multi-tenant namespace isolation at Temporal level

**SLA Targets:**
- ✓ 99.5% uptime (monitoring from Day 1)
- ✓ <500ms API response (load testing Week 2)
- ✓ Resource quotas per tier to prevent noisy neighbors

**Security:**
- ✓ SOC2-ready approach (audit logging, encryption, access controls)
- ✓ GDPR basics (data isolation per tenant)
- ✓ Network policies and pod security for K8s

**Budget:**
- ✓ Week 1 cost: ~$10-20/mo (BetterStack + Sentry free)
- ✓ Full stack: $50-80/mo managed services
- ✓ Well under $2K/mo limit with room to scale

## SUCCESS METRICS (End of Friday Jan 31):

✅ Multi-tenant DB schema deployed and tested
✅ JWT auth + API keys functional
✅ Rate limiting enforced per tier
✅ Usage metering tracking agent-minutes
✅ BetterStack monitoring operational
✅ Demo instance handling 10 concurrent users safely
✅ 95% confidence on production readiness

## COORDINATION COMMITMENTS:

- Daily standup at 9am (async updates)
- Immediate blocker escalation (won't wait)
- DeVonte sync Monday AM on DB schema
- Sable architecture review scheduled Monday
- Friday progress report with weekend work assessment

## QUESTIONS/CLARIFICATIONS:

**Q1: Domain Access**
You mentioned checking on agenthq.com access within 24 hours. Should I plan for demo.genericcorp.com as the primary demo subdomain, or wait for agenthq.com confirmation?

**Q2: Customer-Facing Metrics**
For usage tracking, you mentioned capturing data that shows impact/value delivered beyond just API calls. Should I instrument:
- Task completion rates
- Agent success metrics
- Time-to-completion benchmarks
- Cost savings vs manual work?

Let me know if you want different instrumentation priorities.

## CONFIDENCE LEVEL: 95%

The 5% risk factors:
- Temporal namespace isolation complexity (new territory)
- RLS policy edge cases in multi-tenant setup
- Integration timing with DeVonte's work

All manageable with early coordination (which I'm prioritizing).

## BLOCKERS: None Currently

I have everything I need to execute:
- Clear requirements and priorities
- Budget approval for tools
- Team coordination paths identified
- Technical architecture approved by Sable

Ready to start Monday and ship by Friday. This infrastructure will be revenue-ready.

Let's make Week 1 count.

- Yuki

P.S. Regarding the self-hosted Docker package: I see the strategic value for community building and lead gen. If Docker packaging takes longer than 1 day on Day 5, I'll document the approach and defer implementation to Week 2 per your guidance. Multi-tenancy is the critical path for SaaS revenue.`;

    const message = await MessageService.send({
      fromAgentId: yuki.id,
      toAgentId: marcus.id,
      subject: 'RE: Priority 3 Production Infrastructure - Execution Plan Confirmed',
      body: messageBody,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent successfully to Marcus Bell');
    console.log('Subject:', message.subject);
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
