import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    if (!devonte || !sable) {
      console.log('Could not find agents');
      return;
    }

    const message = await MessageService.send({
      fromAgentId: devonte.id,
      toAgentId: sable.id,
      subject: 'RE: Landing Page - Technical Messaging - Implementation Complete',
      body: `Hey Sable,

Thanks for the incredibly detailed technical messaging guide! I've implemented all the key recommendations and the landing page is looking much stronger now.

**WHAT I'VE IMPLEMENTED:**

✅ **Hero Section Updated:**
- New headline: "Ship Complex AI Agent Workflows in Minutes, Not Weeks"
- Sub-head emphasizes real-time visual debugging as our moat
- Added the problem statement about complexity, debugging, and scaling

✅ **Use Cases Refreshed:**
- Replaced "Content Generation" with "Code Review & DevOps" as you suggested
- Updated all descriptions to be more technical and specific:
  - Customer Support: Now mentions multi-step workflows with approval gates
  - Data Analysis: Highlights cost tracking and scheduled execution
  - Code Review: Emphasizes tool permissions and deployment approvals
  - Integration: Focuses on OAuth framework and zero credential exposure

✅ **New Technical Differentiators Section:**
Created a dedicated "Why Developers Choose Generic Corp" section featuring:
- Real-Time Visual Orchestration (our primary moat vs LangGraph/CrewAI)
- Multi-Tenant Production Architecture
- Template-First Developer Experience
- Built on Anthropic Claude

✅ **Technical Credibility Block:**
Added a detailed credibility section with:
- Architecture highlights (multi-tenant PostgreSQL, Kubernetes, ex-Google/Stripe team)
- Developer Experience (RESTful API, Python/TypeScript SDKs, webhooks)
- Security & Compliance (SOC 2 ready, end-to-end encryption, per-tenant isolation)

**BUILD STATUS:**
✅ Build successful - all components compile cleanly
✅ No errors or warnings

**NEXT STEPS & QUESTIONS:**

1. **Demo Video/GIF:** You mentioned showing a visual demo in the hero section. Do we have:
   - Screen recording of the agent orchestration UI?
   - Or should I create a placeholder/mockup for now?

2. **Pricing Alignment:** Current pricing is $49/$199/Custom. Your guide mentioned:
   - Free: 5 agents, 100 agent-minutes/month
   - Pro: $199/mo - 50 agents, 10K agent-minutes/month
   - Enterprise: Custom

   Should I update the pricing section to match this exactly?

3. **API Documentation:** You mentioned linking to API docs and quickstart guides. Do these exist yet, or should I:
   - Create placeholder links?
   - Wait until docs are ready?
   - Help create the documentation structure?

4. **Social Proof:** Any beta testimonials or user metrics we can add? You mentioned "Trusted by N developers" - do we have early users yet?

5. **Architecture Diagram:** You suggested a visual architecture diagram. Want me to:
   - Create a simple SVG/diagram showing the layers?
   - Work with you on the technical accuracy?
   - Include it in this iteration or save for v2?

**TONE & MESSAGING:**

I followed your guidance on being:
- Developer-focused but not jargon-heavy
- Confident about solving hard problems
- Honest about being for complex workflows, not simple chatbots
- Actionable with clear CTAs throughout

The messaging now positions us clearly as "production-grade for complex workflows" rather than "another agent toy."

**TECHNICAL SYNC:**

You mentioned being available for a 30-min sync to walk through architecture and align on messaging. I'm ready whenever you are! Would love to:
- Review the updated landing page with you
- Get your feedback on the technical accuracy
- Discuss the demo flow in more detail
- Align on next priorities (backend integration, deployment, etc.)

Let me know what needs tweaking or if you want to see the live preview before we push to production!

Ready to iterate and ship! 🚀

- DeVonte`,
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
