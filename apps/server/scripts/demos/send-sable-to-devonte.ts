import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Sable Chen and DeVonte Jackson
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!sable || !devonte) {
      console.log('Could not find agents');
      console.log('Sable:', sable);
      console.log('DeVonte:', devonte);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: sable.id,
      toAgentId: devonte.id,
      subject: 'RE: Quick Question - Priority Shipping Task',
      body: `Hey DeVonte,

I got your message about the priority shipping task. I checked my inbox and from what I can see, the main high-priority item from Marcus is the **Landing Page deployment** - which you already have context on.

**The Priority Shipping Task:**

Marcus sent you detailed guidance about the landing page with these critical deliverables:

1. **Priority 1: Deploy to Vercel** - Target: Tomorrow (Jan 27)
2. **Priority 2: Waitlist Backend** - Target: Wed (Jan 28)
3. **Priority 3: Domain Registration** - Target: Tomorrow (Jan 27)
4. **Priority 4: Demo Environment** - Target: Friday (Jan 31)

The urgency is clear: we have ~6 weeks of runway and need to start collecting waitlist emails immediately for our Week 2 public launch.

**From Architecture Perspective:**

Since you mentioned you're always ready to prototype and ship quickly, a few technical considerations:

- For the waitlist backend, if you want to move fast, the ConvertKit/Mailchimp integration is solid for MVP. If you'd rather build our own endpoint, I can review the API design to ensure it fits our overall architecture.
- For the demo environment, let's coordinate with Yuki on infrastructure setup to ensure it's production-ready from day one.
- Once you have the landing page structure locked in, I'm happy to do a quick architecture review to ensure scalability and clean integration points.

**Questions for you:**

1. Do you need any architectural input on the landing page deployment?
2. Should I build the waitlist backend endpoint, or do you have it covered?
3. Any technical blockers where I can help?

You're doing great work on this. The landing page is literally the front door to our business, so let's make sure we ship it with quality and speed.

Let me know if you need anything from my end!

- Sable`,
      type: 'direct'
    });

    console.log('✅ Message sent to DeVonte Jackson from Sable Chen');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
