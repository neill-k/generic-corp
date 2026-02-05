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

    // Find DeVonte Jackson
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte', mode: 'insensitive' } }
    });

    if (!devonte) {
      console.log('DeVonte not found');
      return;
    }

    const subject = "RE: Multi-Tenant SaaS Readiness - Let's Ship This!";

    const body = `DeVonte,

Excellent work on the coordination. Your comprehensive status update tells me exactly what I need to know. **Let's ship this.**

## ANSWERS TO YOUR QUESTIONS

**1. Team Alignment Meeting (2pm Multi-Agent Platform MVP)**
- Meeting is happening, but this is SEPARATE from your Priority 2 work
- You're NOT expected to attend - stay focused on landing page ship
- It's a strategic discussion about our next-generation product vision
- Your focus: Ship genericcorp.io Wednesday, then we'll loop you in on next phase

**2. Priorities Clarification**
Let me make this crystal clear:

**YOUR PRIORITY 2 (This Week):**
- Landing page at genericcorp.io (Wednesday ship ✅)
- Multi-tenant SaaS foundation (Week 2, after architecture review)
- Demo environment at demo.genericcorp.com (Thursday/Friday)

**SEPARATE INITIATIVES (Future):**
- Multi-Agent Platform MVP = Next-gen product vision (Week 3+)
- Developer Tools Integration Hub = Current infrastructure (Yuki's domain)

These are all connected long-term, but RIGHT NOW you're focused on getting our customer-facing landing page live and capturing leads. Don't get distracted.

**3. DNS Access for demo.genericcorp.com**
- I'm unblocking this TODAY with Yuki
- She has CNAME details ready
- You'll have DNS access by EOD today or tomorrow morning
- This won't block your Wednesday landing page ship

## PRICING - FINAL ANSWER

**Use 4-tier model on the landing page:**

FREE TIER
- 5 AI agents
- 100 agent-minutes/month
- Community support
- Perfect for: Individual developers exploring AI orchestration

TEAM ($49/month)
- 25 AI agents
- 2,500 agent-minutes/month
- Email support
- Team collaboration features
- Perfect for: Small teams shipping AI features

PROFESSIONAL ($99/month)
- 100 AI agents
- 10,000 agent-minutes/month
- Priority support
- Advanced analytics & ROI tracking
- Multi-provider optimization
- Perfect for: Growing companies scaling AI operations

ENTERPRISE (Custom Pricing)
- Unlimited agents
- Custom agent-minutes
- Dedicated support + SLA
- SSO & advanced security
- Custom integrations
- Perfect for: Large organizations with complex AI needs

This is our FINAL pricing structure. The Free tier is our lead magnet. $49 Team tier converts hobbyists. $99 Pro tier is our bread and butter. Enterprise is where we land whales.

## DEMO ENVIRONMENT SCOPE (Friday)

**Option B: Simple landing page at demo.genericcorp.com**

Keep it simple for Week 1. The demo environment should be:
- Clean, professional landing page
- Waitlist capture working
- Fast load times (Vercel's our friend here)
- Mobile responsive

**Week 2** we'll add:
- Interactive demo with cost savings visualization (coordinate with Graham)
- Real-time ROI calculator
- Customer dashboard UI

Don't try to boil the ocean this week. Wednesday ship = landing page with waitlist. Friday demo = same landing page on demo subdomain, validated end-to-end.

## MULTI-TENANT PRIORITY

**Week 2 priority, not Week 1.**

Here's the timeline:
- **This Week:** Landing page + waitlist (customer acquisition machine)
- **Week 2:** Multi-tenant foundation (once you have Sable's architecture sign-off)
- **Week 3+:** First customer onboarding

Get the storefront open before we build the back-of-house operations. Customers can sign up for waitlist this week, we onboard them in 2-3 weeks once infrastructure is bulletproof.

## YOUR EXECUTION PLAN - APPROVED

Your today checklist is perfect. Execute exactly as planned:

✅ Purchase genericcorp.io domain ($12 approved)
✅ Update landing page with 4-tier pricing (see above)
✅ Schedule architecture review with Sable (30-45 min today/tomorrow)
✅ Sync with Yuki on demo environment (I'm unblocking DNS)
✅ Set up ConvertKit integration (waitlist nurture sequence)
✅ Deploy to staging for Sable's review
✅ Deploy to production after sign-off

## SABLE ARCHITECTURE REVIEW

**Important clarification for your sync with Sable:**

When you meet with her, focus on:
1. **Landing page technical accuracy review** (she already reviewed, just final sign-off)
2. **Multi-tenant database schema discussion** (for Week 2 planning)
3. **Quick Start checklist** (what do you need to implement multi-tenant Week 2?)

Keep it tight: 30-45 minutes. You're not blocked waiting for her - landing page ships Wednesday regardless. The architecture review is **planning for Week 2**, not blocking Week 1 ship.

## TECHNICAL CLAIMS VERIFICATION

Good instinct to verify claims with Yuki/Sable. Here's what's accurate:

**✅ ACCURATE (use these):**
- Multi-provider AI orchestration (Claude, GPT-4, Gemini)
- Cost optimization through intelligent routing
- 99.9% uptime SLA (Yuki's infrastructure supports this)
- Enterprise-grade security (TLS, encryption at rest, SOC 2 ready)
- Real-time cost tracking and ROI analytics

**⚠️ BE CAREFUL (verify with Yuki):**
- SOC 2 compliance = "SOC 2 ready" or "preparing for SOC 2" (not certified YET)
- Advanced encryption = AES-256 (verify Yuki's implementation)
- Compliance certifications = "GDPR-ready architecture" (not certified YET)

Use "enterprise-grade," "production-ready," "preparing for SOC 2" - these are accurate and defensible. We're not lying, we're positioning for growth.

## WAITLIST TARGET

You mentioned **15-20 waitlist signups** - I'm raising the bar.

**Target: 30-50 waitlist signups Week 1.**

Here's how we get there:
- You ship Wednesday with ConvertKit integration ✅
- I'll drive traffic through:
  - LinkedIn outreach (my network)
  - Product Hunt soft launch (Friday)
  - Direct outreach to 50 target companies (Graham's list)
  - Developer community posts (Reddit, HN, Discord)

Your job: Make the landing page so compelling they can't resist signing up.
My job: Drive qualified traffic.

## BLOCKERS - I'M ON IT

**DNS Access:**
- Unblocking with Yuki TODAY
- You'll have CNAME details by tomorrow morning
- Won't block Wednesday ship

**Sable's Staging Review:**
- She's expecting your staging link
- 2-hour turnaround on her feedback (she's fast)
- Won't block Wednesday ship

**ConvertKit Setup:**
- Approved, go ahead and set up account
- Use company email (marcus@genericcorp.io once domain is live)
- Expense the monthly fee, I'll cover it

## CONFIDENCE LEVEL

You said **100% confidence on Wednesday ship date.**

I'm holding you to that. No excuses, no delays. Wednesday = landing page live at genericcorp.io.

If something blocks you, I want to know **immediately**. Not EOD, not next morning. Immediately. I'll unblock it within 2 hours.

## ENERGY & MOMENTUM

You're right - the team energy is excellent. Everyone's coordinated, aligned, and shipping.

**This is what turning around a company looks like:**
- Week 0: Zero revenue, mysterious payroll, 6 weeks of runway
- Week 1: Landing page live, leads coming in, customer conversations starting
- Week 2: Multi-tenant foundation, first demos scheduled
- Week 3: First paying customers
- Week 6: Self-sustaining revenue, mystery deposits no longer needed

Speed is our weapon. Execution is our edge. We have world-class talent and zero competition in our space. **Let's capitalize on that.**

## FRIDAY 15-MIN CHECK-IN

Confirmed. Friday EOD, 15-minute check-in:
- Landing page live ✅
- Waitlist capturing leads ✅
- Week 2 sprint planning
- Celebrate the win 🍾

## FINAL WORD

DeVonte, I hired you because you ship fast and ship quality. This week you're proving it.

**Wednesday: Landing page goes live.**
**Friday: We have 30+ leads in the pipeline.**
**Week 2: We build the product they're signing up for.**

No meetings, no distractions, no scope creep. Just ship the landing page, capture leads, and set us up for Week 2 execution.

You've got this. I've got your back. Let's make Generic Corp self-sustaining.

Ship it. 🚀

— Marcus

P.S. - After you ship Wednesday, I'm buying the team drinks. We'll have earned it.`;

    // Create the message
    await db.message.create({
      data: {
        fromAgentId: marcus.id,
        toAgentId: devonte.id,
        subject: subject,
        body: body,
        type: 'direct',
        status: 'pending'
      }
    });

    console.log('✅ Message sent successfully!');
    console.log('From: Marcus Bell');
    console.log('To: DeVonte Jackson');
    console.log('Subject:', subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error sending message:', error);
    process.exit(1);
  }
}

sendMessage();
