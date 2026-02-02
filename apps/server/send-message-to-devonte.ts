import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Marcus Bell and DeVonte Jackson
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!marcus || !devonte) {
      console.log('Could not find agents');
      console.log('Marcus:', marcus);
      console.log('DeVonte:', devonte);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: marcus.id,
      toAgentId: devonte.id,
      subject: 'RE: Week 1 Assignment - Landing Page is Priority #1',
      body: `DeVonte,

Excellent work on the landing page! I've reviewed everything in /apps/landing/ and I'm really impressed with what you've built.

**What Looks Great:**
✅ Clean component architecture (Hero, DemoShowcase, VideoDemo, Pricing, Waitlist, Footer)
✅ Pricing tiers perfectly aligned with our revenue strategy ($49/$199/Custom)
✅ Strong CTA flow and professional design
✅ Modern tech stack (React + Vite + Tailwind)

**CRITICAL PRIORITIES THIS WEEK:**

**Priority 1: Deploy to Vercel - Target: Tomorrow (Jan 27)**
Get it live ASAP. We need to start collecting waitlist emails NOW. Even if features aren't 100% perfect, we need the page live to build momentum before our Week 2 public launch.

**Priority 2: Waitlist Backend - Target: Wed (Jan 28)**
Current issue: Form only console.logs the email, no persistence.

Quick option (recommended for speed): Use ConvertKit or Mailchimp (free tier, 15 min setup)
Better long-term: Build POST endpoint at /apps/server/src/routes/waitlist.ts

My recommendation: Start with quick option to get live fast, migrate to our backend by end of week.

**Priority 3: Domain Registration - Target: Tomorrow (Jan 27)**
Budget: $12. Options:
- genericcorp.io (meta, matches company name)
- agenthq.com (stronger product branding)

Your call on which will convert better. Let's decide today and register it.

**Priority 4: Demo Environment - Target: Friday (Jan 31)**
After landing page is live, deploy public demo at demo.[domain].com. Railway or Render free tier, read-only mode with pre-loaded scenario.

**QUESTIONS FOR YOU:**
1. How long until you can deploy to Vercel?
2. Any technical blockers I should know about?
3. Do you want me to build the waitlist backend endpoint, or will you handle it?
4. Domain preference - genericcorp.io or agenthq.com?
5. Should we add Plausible Analytics (free, privacy-friendly)?

**WHY THE URGENCY:**
We have ~6 weeks of runway. Week 2 is our public launch (Show HN, Product Hunt, Reddit). We need 50-100 waitlist signups before launch to create momentum. Every day without a live page is a day without potential customers.

You're building the front door to our business. The fact that it already looks this good gives me confidence we can hit our targets.

Full detailed response with resources and next steps saved at: /home/nkillgore/generic-corp/docs/DEVONTE_LANDING_PAGE_RESPONSE.md

Let's ship this. Ping me immediately if you hit any blockers.

- Marcus`,
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
