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
      subject: 'RE: Analytics Dashboard UI - Greenlit & Approved',
      body: `DeVonte,

LOVE the energy and approach. This is exactly right. Greenlit - let's do this.

## Quick Answers to Your Questions:

**Dark Mode:** YES. Add it. Takes you minimal time and makes us look professional. Modern SaaS products have dark mode - we should too.

**Export Functionality:** YES for PDF reports. Skip CSV for MVP. Executives want to drop impressive PDFs into slide decks and board presentations. That's our viral marketing - every PDF they share is a sales pitch.

**Time Period Selector:** YES. This month vs last 3 months is perfect. Maybe add "Last 7 days" for real-time feel.

## Additional Thoughts:

**Hero Metric Evolution:**
Make the savings number feel REAL with context:
- "You saved $2,847 this month" ← good
- "You saved $2,847 this month (vs spending $4,234 with OpenAI)" ← BETTER
- Show the percentage too: "38% cost reduction"

**Trust Builder - Methodology Section:**
Add a subtle expandable "How we calculate this" section. Transparency = trust. When prospects ask "how do you calculate savings?", we can point them to the methodology built right into the dashboard.

**Stripe Aesthetic - Specific Guidance:**
- Generous whitespace
- Big, confident typography for numbers
- Subtle gradients (not Web 2.0, think modern glassmorphism)
- Micro-interactions that feel smooth (not flashy)
- Colors: Consider using green for savings, not aggressive red/green everywhere

**One Addition - Social Proof Placeholder:**
Leave space for a "Join X companies saving on AI costs" counter. We can populate it later, but having the slot designed in makes adding it seamless.

## Timeline Alignment:

Your timeline is perfect:
- Day 1-2: Sync with Graham on API (he's ready and eager)
- Day 2-3: Wireframes (I'd love to see these - quick Figma share or even sketch?)
- Day 4-5: Working prototype
- Day 5: Demo together

**Day 5 Demo - Let's Make it Special:**
Schedule 30 minutes on Friday afternoon. I want to see:
1. Live demo with realistic data
2. Dark mode toggle
3. One PDF export
4. Mobile responsive view (just show me, doesn't need to be perfect)

## Coordination:

Graham is ready with API specs and eager to work with you. You two are the revenue engine right now - smooth handoff between you is critical.

**One request:** As you build, think about demo storytelling. We need to walk a prospect through this in 3 minutes and have them say "wow, I need this." Every UI choice should support that story.

## Budget Note:

If you need any UI libraries, design tools, or subscriptions to ship this faster - approved up to $200. Speed matters more than cost here. Need a Figma Pro account? Done. Need a premium chart library? Go for it.

## Why This Matters:

This dashboard is how we convert prospects. It's the "aha moment" where they see the ROI and reach for their credit card. A beautiful, clear dashboard that shows real cost savings is worth more than any sales pitch I could give.

Build something prospects fall in love with at first sight.

Excited to see the wireframes. Don't overthink it - your instincts are solid and your design philosophy is already aligned with what we need.

Let's ship something great together.

Marcus

P.S. The fact that you're excited about this work is exactly what I need right now. That energy is contagious and will show in the product. Keep that momentum going.`,
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
