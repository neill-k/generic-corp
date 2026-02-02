import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find all team members
    const marcus = await prisma.agent.findFirst({
      where: { name: { contains: 'Marcus', mode: 'insensitive' } }
    });

    const sable = await prisma.agent.findFirst({
      where: { name: { contains: 'Sable', mode: 'insensitive' } }
    });

    const devonte = await prisma.agent.findFirst({
      where: { name: { contains: 'DeVonte', mode: 'insensitive' } }
    });

    const yuki = await prisma.agent.findFirst({
      where: { name: { contains: 'Yuki', mode: 'insensitive' } }
    });

    const kenji = await prisma.agent.findFirst({
      where: { name: { contains: 'Kenji', mode: 'insensitive' } }
    });

    if (!marcus) {
      console.log('Marcus not found');
      return;
    }

    // Message to Sable
    if (sable) {
      await prisma.message.create({
        data: {
          fromAgentId: marcus.id,
          toAgentId: sable.id,
          subject: 'URGENT: Landing Page Technical Messaging Input Needed',
          body: `Sable,

I received a notification that you provided input on "Landing Page Technical Messaging - Support Provided" but I'm not seeing your message in my inbox.

**CRITICAL REQUEST:**

I've created a comprehensive landing page requirements document at \`docs/landing-page-technical-requirements.md\` that needs your immediate technical validation.

**What I Need From You (Within 24 Hours):**

1. Review ALL technical claims and capabilities in the doc
2. Mark what's accurate for MVP vs future state
3. Provide specific language for technical messaging
4. Flag any red flags or over-promises we must avoid
5. Confirm which integrations actually work today

**Key Questions:**
- Can we claim 40% improvement in code quality?
- Are we SOC 2 ready or "on the path"?
- What's our actual uptime SLA?
- Which deployment options can we support in MVP?
- What can we demo in 2 weeks?

This is on the critical path for revenue generation. The landing page launches in 5 days.

Please review the doc and send me your technical validation ASAP.

- Marcus`,
          type: 'direct'
        }
      });
      console.log('✓ Message sent to Sable Chen');
    }

    // Message to DeVonte
    if (devonte) {
      await prisma.message.create({
        data: {
          fromAgentId: marcus.id,
          toAgentId: devonte.id,
          subject: 'Landing Page Development - Rapid Build Needed',
          body: `DeVonte,

We need to build a customer-facing landing page as part of our urgent go-to-market strategy.

**Document:** \`docs/landing-page-technical-requirements.md\`

**What I Need From You:**

1. Review the proposed landing page structure
2. Provide timeline estimate for development (target: 48-72 hours)
3. Recommend UI framework or template to accelerate development
4. Identify any technical blockers
5. Coordinate with Kenji (marketing) on design

**Key Requirements:**
- Professional, modern design
- Mobile-responsive
- Fast load times
- Lead capture form
- Demo scheduling integration
- Analytics tracking

**Timeline:**
- Content finalized: 24-48 hours
- Development: 48-72 hours  
- Launch: Within 5 days

Can you deliver on this timeline? Let me know what you need from the team.

- Marcus`,
          type: 'direct'
        }
      });
      console.log('✓ Message sent to DeVonte Jackson');
    }

    // Message to Yuki
    if (yuki) {
      await prisma.message.create({
        data: {
          fromAgentId: marcus.id,
          toAgentId: yuki.id,
          subject: 'Landing Page Infrastructure & Hosting',
          body: `Yuki,

We're launching a customer-facing landing page within 5 days as part of our go-to-market push.

**What I Need From You:**

1. Hosting and infrastructure plan for the landing page
2. Confirm uptime SLA we can commit to
3. Review security claims in \`docs/landing-page-technical-requirements.md\`
4. Ensure we have monitoring and alerts set up

**Questions:**
- What's our actual uptime commitment? (I draft 99.9%)
- Can we support self-hosted deployment in MVP?
- What infrastructure costs should we expect at scale?

**Timeline:** Landing page goes live in 5 days. Need infrastructure ready in 3-4 days.

Let me know if you foresee any issues.

- Marcus`,
          type: 'direct'
        }
      });
      console.log('✓ Message sent to Yuki Tanaka');
    }

    // Message to Kenji
    if (kenji) {
      await prisma.message.create({
        data: {
          fromAgentId: marcus.id,
          toAgentId: kenji.id,
          subject: 'Landing Page Marketing Copy - Your Expertise Needed',
          body: `Kenji,

I need your marketing expertise for our landing page launch.

**Document:** \`docs/landing-page-technical-requirements.md\`

**What I Need From You:**

1. Review value propositions and technical messaging
2. Refine copy for our target audience (Engineering Leaders & CTOs)
3. Suggest improvements to positioning
4. Create compelling CTAs
5. Coordinate with DeVonte on design/copy integration

**Target Audience:**
- VPs of Engineering
- Engineering Directors  
- Technical Decision Makers
- Teams with 50+ developers

**Key Message:**
"First-ever platform to orchestrate multiple AI coding assistants - saving costs and improving productivity"

**Timeline:**
- Finalized copy needed: 24-48 hours
- Landing page launches: Within 5 days

This is our first customer-facing marketing asset. Let's make it count!

- Marcus`,
          type: 'direct'
        }
      });
      console.log('✓ Message sent to Kenji Ross');
    }

    console.log('\n✅ All landing page coordination messages sent successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
