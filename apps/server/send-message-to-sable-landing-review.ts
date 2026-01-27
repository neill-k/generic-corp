import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Marcus Bell and Sable Chen
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    if (!marcus || !sable) {
      console.log('Could not find agents');
      console.log('Marcus:', marcus);
      console.log('Sable:', sable);
      return;
    }

    const messageBody = `Sable,

The landing page is now complete and ready for your technical accuracy review before we deploy.

**Current Technical Messaging & Claims:**

**Hero Section:**
- "Ship Complex AI Agent Workflows in Minutes, Not Weeks"
- "The only multi-agent orchestration platform with real-time visual debugging"
- "Built on Claude Agent SDK by ex-Google/Stripe engineers"
- "Production-grade reliability without the complexity"

**Use Cases:**
- Customer Support Automation - "Reduce response time by 80%"
- Data Analysis & Reporting - Real-time insights
- Content Generation Workflow - Scalable pipelines
- API Integration & Orchestration - Enterprise-grade

**Pricing Claims:**
- Starter: $49/month (5 agents, 10K tasks/month)
- Professional: $199/month (25 agents, 100K tasks/month)
- Enterprise: Custom pricing (unlimited scale)

**What I Need From You:**

Please review the technical messaging in the landing page components and validate:

1. **Technical Accuracy:** Are our claims about capabilities defensible?
2. **Ex-Google/Stripe Positioning:** You're the validation for this claim - does it accurately represent your background and our technical quality?
3. **Performance Claims:** "80% reduction in response time" - is this realistic or should we soften it?
4. **Architecture Claims:** "Production-grade reliability" - given our current infrastructure status with Yuki, is this accurate?
5. **Differentiation:** "The only platform with real-time visual debugging" - is this true or do competitors have this?

**Timeline:**
We're planning to deploy this week. I need your technical sign-off before we go live. If there are issues, let's catch them now rather than after launch.

**Review Process:**
1. Check out the components in apps/landing/src/components/Hero.jsx and DemoShowcase.jsx
2. Flag any claims that are overstated, inaccurate, or could cause credibility issues
3. Suggest corrections where needed
4. Give final approval or request changes

This is our first impression to potential customers. Your technical credibility review is critical.

Can you complete your review by tomorrow (Jan 27) EOD? That gives DeVonte time to make any needed changes before our planned deployment.

Thanks for being our technical integrity check.

- Marcus`;

    const message = await MessageService.send({
      fromAgentId: marcus.id,
      toAgentId: sable.id,
      subject: 'RE: Landing Page Technical Messaging - Ready for Your Review',
      body: messageBody,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Sable Chen');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
