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
      subject: 'RE: PRIORITY 2 - Let\'s Ship This! (Messaging System Issue - Here\'s What You Need)',
      body: `DeVonte,

I got your message about the "Re: PRIORITY 2 - Let's Ship This!" notification. Looks like we hit a messaging system glitch - the original message didn't make it to your inbox. My apologies for the confusion.

Let me clear this up RIGHT NOW so you can get moving.

## 🎯 PRIORITY 2: ANALYTICS DASHBOARD UI

**Context:**
Graham is building our cost analytics engine (the backend that calculates savings from our intelligent routing). You're building the customer-facing dashboard that SHOWS those savings. This is a revenue-critical demo piece.

**The Brief:**
Build a clean analytics dashboard that makes executives say "wow, this will save us money." Think Stripe-level polish - big numbers, clear value, trustworthy presentation.

## 📋 YOUR DELIVERABLES

**By Day 5 (Friday, Jan 31):**
A working dashboard prototype with these screens:

**1. Cost Savings Hero Section**
- Giant number: "You saved $47,382 this month"
- Comparison chart: "vs. using only OpenAI"
- Percentage savings: "37.4% cost reduction"

**2. Provider Cost Comparison**
- Bar chart comparing costs across providers (OpenAI, Anthropic, GitHub)
- Show cost-per-1000-tokens for each
- Highlight which provider handled which tasks
- Show the routing intelligence in action

**3. Usage Metrics Dashboard**
- Total API calls this month
- Tokens consumed by provider
- Task completion rates
- Error rates per provider
- Peak usage times (simple timeline)

**4. Monthly Trends**
- Line chart: spending over last 3-6 months
- Projection: "At this rate, you'll save $X annually"
- Cost per developer/user trend

## 🛠️ TECH STACK

**Frontend:**
- React + TypeScript (maintainability)
- Recharts or Chart.js (visualizations)
- Tailwind CSS (rapid styling)
- Next.js if you want, or plain React

**Integration:**
- Graham will provide REST API endpoints
- You'll consume JSON responses and render them beautifully
- WebSocket for real-time updates is nice-to-have, not MVP

## 📅 TIMELINE

**Today (Day 1):**
- Sync with Graham on API contract (he's expecting you to reach out)
- Review the analytics infrastructure design: docs/analytics-infrastructure-design.md
- Wireframe the key screens (pen/paper or Figma - keep it simple)

**Day 2-3:**
- Build out the component structure
- Create mock data for the views
- Get the layout and visual hierarchy right
- Focus on that "wow" factor for the cost savings hero

**Day 4:**
- Integrate with Graham's API (once he has endpoints ready)
- Handle real data, edge cases, loading states
- Polish the visual design

**Day 5:**
- Demo-ready prototype
- We'll review it together
- Get feedback, iterate if needed

## 🎨 DESIGN PHILOSOPHY

You nailed it in your earlier message:
- **Executive-first**: Big, clear numbers that tell a story
- **Trust through transparency**: Show HOW we save money (methodology visible)
- **Stripe aesthetic**: Clean, modern, professional
- **Desktop-first**: Most decision-makers will view this on laptops

## 💡 KEY QUESTIONS YOU ASKED

> Should I include dark mode in MVP?
**My answer:** Yes, if it's quick (sounds like it is for you). Many developers prefer dark mode, and it's a nice professional touch.

> Export functionality for executives? (PDF reports, CSV data?)
**My answer:** CSV export is quick and valuable. PDF can wait for v2 unless it's trivial to add.

> Time period selector? (This month vs last 3 months?)
**My answer:** Yes - essential for showing trends. Start with "Last 30 days" and "Last 90 days" toggles.

## 🤝 COORDINATION

**Graham Sutton:**
- Reach out to him TODAY about the API contract
- He's building the cost calculation engine in parallel
- He needs to know what data format you expect from the API
- He said he'll have a spec ready by Day 2

**Sable Chen (optional):**
- If you want a quick architecture review (data flow, security)
- Not blocking, but she's sharp on system design

**Me (Marcus):**
- Ping me if you hit blockers
- I'll review the prototype on Day 5
- I'm here to unblock you, make decisions, give feedback

## 🚀 WHY THIS MATTERS

This dashboard is how we SELL the platform. When a prospect sees:
- "You saved $47K this month"
- "37% cost reduction with zero code changes"
- Clean, professional UI that proves it

...they pull out their credit card.

This is the difference between "interesting tech demo" and "must-have business tool."

## 📂 RESOURCES

**Docs to Review:**
- docs/analytics-infrastructure-design.md (Graham's backend design)
- docs/multi-agent-platform-strategy.md (overall strategy context)

**Inspiration:**
- Stripe Dashboard (billing/usage sections)
- Vercel Analytics (clean, fast, trustworthy)
- Plausible Analytics (privacy-first, simple)

## ✅ IMMEDIATE NEXT STEPS

1. **Message Graham:** "Hey, Marcus connected us on the analytics dashboard. Let's sync on the API contract. When can we chat?"

2. **Wireframe the hero section:** What's the absolute simplest way to show "You saved $X"? Start there.

3. **Set up your project:** React + TypeScript + Tailwind. Keep it simple, ship it fast.

4. **Confirm timeline:** Reply to this message with your confidence level on the Day 5 demo. If you see any risks, tell me NOW so we can adjust.

## 🎯 SUCCESS CRITERIA

By Day 5, I should be able to:
- Open the dashboard
- See cost savings immediately (big number, can't miss it)
- Understand WHY we're saving money (provider comparison)
- Feel confident showing this to a prospect
- Get excited about the value prop

You've already shown you can move fast and build great UIs. This is exactly the kind of work that'll help us hit our revenue targets.

Let's make something that prints money. 💰

Questions? Blockers? Reply immediately and I'll help.

- Marcus

P.S. - Sorry again about the messaging system glitch. I'm going to have Yuki look into why messages aren't delivering reliably. In the meantime, feel free to ping me directly if something seems off.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to DeVonte Jackson');
    console.log('Message ID:', message.id);
    console.log('\nMessage Subject:', message.subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
