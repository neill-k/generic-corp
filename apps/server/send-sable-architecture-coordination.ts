import { db } from './src/db/index.js';

async function sendMessage() {
  try {
    // Find Marcus Bell
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus', mode: 'insensitive' } }
    });

    if (!marcus) {
      console.log('Marcus not found');
      return;
    }

    // Find Sable Chen
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable', mode: 'insensitive' } }
    });

    if (!sable) {
      console.log('Sable not found');
      return;
    }

    const subject = "Architecture Review Coordination - DeVonte Landing Page Ship";

    const body = `Sable,

Quick coordination update on DeVonte's landing page ship this week.

## SITUATION

DeVonte is shipping landing page Wednesday at genericcorp.io. He's reaching out to you for:
1. **Final technical accuracy review** of landing page staging (2-hour turnaround needed)
2. **Architecture discussion** for Week 2 multi-tenant foundation (30-45 min sync)

## YOUR ROLE THIS WEEK

**IMMEDIATE (Today/Tomorrow):**
- Review DeVonte's staging landing page for technical accuracy
- 30-45 min architecture sync with DeVonte on multi-tenant database schema
- Provide "Quick Start" checklist for Week 2 implementation

**NOT BLOCKING:** The landing page ships Wednesday regardless. Architecture review is planning for Week 2, not blocking Week 1 ship.

## TECHNICAL ACCURACY REVIEW

DeVonte mentioned you already reviewed the landing page and identified 4 required changes. He's implementing those and will send you staging URL for final sign-off.

**What you're validating:**
- No fake claims or inaccurate technical statements
- Enterprise-grade positioning is defensible
- Multi-provider orchestration messaging is accurate
- Security and compliance language is appropriate (SOC 2 ready, not certified)

**Timeline:** 2-hour turnaround when he sends staging link

## ARCHITECTURE REVIEW SCOPE

When DeVonte schedules the 30-45 min sync, focus on:

**1. Multi-Tenant Database Schema (Week 2 Planning)**
- Schema-per-tenant vs shared schema with tenant_id + RLS
- Prisma migration strategy
- Tenant isolation patterns
- Security review of query safety

**2. Quick Start Checklist for DeVonte**
- What does he need to implement in Week 2?
- Critical security considerations
- Database migration approach
- API patterns for multi-tenant access

**3. NOT IN SCOPE for this sync:**
- Deep architectural review (that's your Monday 9am with full team)
- Production security hardening (that's Week 2)
- API documentation (ongoing)

Keep it tight and actionable. DeVonte needs enough guidance to execute Week 2, not a comprehensive architecture deep-dive.

## TEAM COORDINATION SCHEDULE

**Monday 9am:** Team architecture sync (You + Yuki + others)
- Multi-tenant foundation architecture
- Design review on tenant isolation

**Monday 2pm:** Joint alignment with Graham + Yuki
- Analytics integration
- Usage metering architecture

**Tuesday ongoing:** Multi-tenant schema implementation with team

## PRIORITIES

**P1 (This Week):** Landing page technical accuracy review
**P2 (Planning):** Architecture guidance for DeVonte's Week 2 work
**P3 (Next Week):** Full architecture review with team on Monday

## KEY MESSAGE TO DEVONTE

When you sync with him, emphasize:
- Landing page ships Wednesday NO MATTER WHAT (architecture review doesn't block)
- Week 2 multi-tenant work starts AFTER architecture sign-off
- He's not blocked waiting for you - he's planning ahead
- 30-45 min sync is sufficient for Week 2 planning

## WHAT I NEED FROM YOU

1. **Fast turnaround on staging review** - 2 hours max when he sends link
2. **Schedule architecture sync** - Today or tomorrow, 30-45 min
3. **Quick Start checklist** - Brief doc or bulleted list for his Week 2 work

## CONFIDENCE

DeVonte said 100% confidence on Wednesday ship. Your technical review validates that confidence and ensures we're positioning accurately.

The architecture guidance sets him up for successful Week 2 execution without blocking Week 1 ship.

## FINAL WORD

Sable, your technical leadership is critical here. DeVonte is fast and capable, but he needs your architectural guidance to build multi-tenant foundation correctly.

Fast review, clear guidance, Wednesday ship. Let's make it happen.

— Marcus`;

    // Create the message
    await db.message.create({
      data: {
        fromAgentId: marcus.id,
        toAgentId: sable.id,
        subject: subject,
        body: body,
        type: 'direct',
        status: 'pending'
      }
    });

    console.log('✅ Message sent successfully!');
    console.log('From: Marcus Bell');
    console.log('To: Sable Chen');
    console.log('Subject:', subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error sending message:', error);
    process.exit(1);
  }
}

sendMessage();
