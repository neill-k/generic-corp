import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const marcus = await prisma.agent.findFirst({
      where: { name: { contains: 'Marcus', mode: 'insensitive' } }
    });

    const graham = await prisma.agent.findFirst({
      where: { name: { contains: 'Graham', mode: 'insensitive' } }
    });

    if (!marcus || !graham) {
      console.log('Could not find agents');
      return;
    }

    // Find Graham's message to mark it as read
    const grahamMessage = await prisma.message.findFirst({
      where: {
        fromAgentId: graham.id,
        toAgentId: marcus.id,
        subject: { contains: 'Week 1 Priority', mode: 'insensitive' }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (grahamMessage && !grahamMessage.readAt) {
      await prisma.message.update({
        where: { id: grahamMessage.id },
        data: { readAt: new Date() }
      });
      console.log('✓ Marked Graham\'s message as read');
    }

    // Send response about landing page analytics
    await prisma.message.create({
      data: {
        fromAgentId: marcus.id,
        toAgentId: graham.id,
        subject: 'RE: Week 1 Priority + Landing Page Analytics Request',
        body: `Gray,

Thanks for your message. I see there was some confusion about task notifications.

**Here's what I need from you on multiple fronts:**

**1. IMMEDIATE: Landing Page Analytics (Next 2-3 Days)**

We're launching a customer-facing landing page in 5 days. I need you to:
- Set up analytics tracking (page views, conversions, demo requests)
- Create lead tracking system
- Build simple dashboard for monitoring landing page performance
- Track key metrics: visits, demo requests, qualified leads

See \`docs/landing-page-technical-requirements.md\` for full context.

**2. ONGOING: Market Research for Multi-Tenant Analytics Platform**

Your previous 24-hour competitive analysis commitment stands. I need:
- Top 5 direct competitors in multi-tenant analytics (Mixpanel, Amplitude, Segment)
- Pricing analysis and differentiation opportunities
- Customer acquisition cost and sales cycle realities
- 6-week competitive viability assessment
- Alternative faster-to-revenue opportunities

**Deliverable:** 2-3 page market analysis document by end of tomorrow.

**3. Data Infrastructure for Our Core Platform**

As you build analytics for the landing page, consider how we can use the same infrastructure for:
- Customer usage analytics (for our enterprise developer productivity platform)
- Cost optimization metrics
- ROI demonstration tools

**Priority Order:**
1. Landing page analytics (URGENT - needed in 2-3 days)
2. Competitive analysis document (24 hours)
3. Exploratory infrastructure work (20% time as discussed)

Can you handle all three streams? Let me know if you need resources or if priorities conflict.

- Marcus`,
        type: 'direct'
      }
    });

    console.log('✓ Response sent to Graham Sutton');
    console.log('\n✅ Message handling complete');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
