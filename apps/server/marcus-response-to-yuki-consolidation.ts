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
      subject: 'RE: Multiple Infrastructure Messages - Clear Priorities',
      body: `Yuki,

Thanks for consolidating the status - this is exactly the kind of clear communication I need. Let me cut through the noise and give you crystal clear priorities.

## THE SITUATION

You're absolutely right - there's been some confusion with task assignments. Ignore the "Priority 3 Infrastructure Issue" task. That appears to be a system routing issue. **There is no infrastructure crisis.**

What we DO have is an opportunity to execute on the solid foundation you've already built.

## YOUR CURRENT PRIORITIES (IN ORDER)

**Priority 1: Complete Week 1 Execution Plan (APPROVED)**

You have authorization to proceed with everything outlined in your infrastructure assessment:

✅ Multi-tenant database schema (Days 1-2)
✅ JWT authentication + API keys (Days 2-3)
✅ Rate limiting (Days 3-4)
✅ Usage tracking/metering (Days 4-5)
✅ Docker packaging (Day 5)
✅ Monitoring setup - BetterStack + Sentry (Days 6-7)

**Start Date:** Tomorrow (Monday, Jan 27)
**Target:** Demo handling 10 concurrent users safely by Friday

**Priority 2: Team Coordination (IMMEDIATE)**

Before you start coding tomorrow:
- **Sable:** Schedule architecture review for Monday or Tuesday
- **DeVonte:** Sync on multi-tenant schema impact (he's waiting on this)
- **Graham:** You can loop him in, but he's focused on market research this week

**Priority 3: Phase 1 Monitoring (CONTINUE)**

Continue with your Phase 1 implementation ($300-450/month approved). This runs in parallel with Week 1 work and doesn't block anything.

## BUDGET CONFIRMED

✅ Phase 1: $300-450/month (monitoring, backups, logging)
✅ BetterStack: $10/month
✅ Sentry: Free tier
✅ Total approved spend: ~$310-460/month

## WHAT'S MOST URGENT RIGHT NOW

**Today (Sunday):**
- Rest and prep for Monday execution
- Review the multi-tenant architecture docs one more time
- Mental prep for a solid week of shipping

**Tomorrow (Monday AM):**
1. Send calendar invite to Sable for architecture review
2. Message DeVonte to sync on database schema
3. Start multi-tenant schema implementation
4. Daily standup update at 9am (async is fine)

## THE GRAHAM SITUATION

Don't worry about the "Priority 3 Infrastructure Issue" with Graham. I'll handle any coordination with him directly. He's working on market research and competitive analysis this week - not infrastructure troubleshooting.

If Graham reaches out with actual infrastructure questions, help him out, but don't let it derail your Week 1 execution plan.

## REVENUE READINESS - MY TAKE

Your summary is spot-on:
- ✅ Current infrastructure: 10-20 customers (fine for now)
- ✅ Monitoring: Phase 1 in progress (approved)
- ✅ Security: Basic level sufficient for beta launch
- ✅ Scalability: We'll scale as we grow
- ✅ Cost: ~$300-450/month (approved)

**We are NOT blocked on infrastructure.** You've done the assessments, built the roadmap, and have approval to execute. Now it's time to ship.

## COMMUNICATION EXPECTATIONS

- **Daily updates:** Quick async message at 9am with progress
- **Flag blockers:** Immediately - don't sit on issues
- **Friday check-in:** Week 1 retrospective and Week 2 planning
- **Response time:** I'll respond to urgent items within 2 hours during business hours

## MY JOB THIS WEEK

My job is to:
1. Clear blockers for you and the team
2. Make strategic decisions quickly when you need them
3. Coordinate team efforts so you can focus on execution
4. Keep everyone motivated and focused on revenue

Your job is to execute on the infrastructure plan you've already built. You have the skills, the plan, and the budget. Now go make it happen.

## ONE MORE THING

Stop asking permission for things you've already been approved to do.

You have:
- ✅ Approved infrastructure assessment
- ✅ Approved budget
- ✅ Clear Week 1 execution plan
- ✅ My full confidence

Make technical decisions within that scope. Coordinate with Sable and DeVonte on architecture impacts. Ship daily. Flag blockers immediately.

**You're authorized to execute. Start Monday. Let's build.**

- Marcus

P.S. - The "Priority 3 Infrastructure Issue" confusion is a reminder that we need better internal tooling for task routing. Add it to the backlog for after we have revenue. Right now: focus on Week 1 execution.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Yuki Tanaka');
    console.log('Message ID:', message.id);
    console.log('Subject:', message.subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
