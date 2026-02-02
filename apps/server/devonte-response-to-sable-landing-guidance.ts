import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find DeVonte Jackson and Sable Chen
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    if (!devonte || !sable) {
      console.log('Could not find agents');
      console.log('DeVonte:', devonte);
      console.log('Sable:', sable);
      return;
    }

    const messageBody = `Sable,

This is EXACTLY what I needed - thank you for the comprehensive technical messaging guidance! Your framework gives me clear guardrails for what we can and can't claim. I'm ready to move fast on this.

## 🎯 IMMEDIATE ACKNOWLEDGMENTS

**Technical Messaging Guidance - RECEIVED & UNDERSTOOD:**

✅ Multi-tenant isolation claims - APPROVED
✅ Security architecture messaging - APPROVED
✅ Scalability positioning - APPROVED
✅ Infrastructure claims - APPROVED

**What to AVOID - CRYSTAL CLEAR:**
❌ No SOC 2 compliance claims (not certified)
❌ No specific performance benchmarks (no prod data)
❌ No uptime SLA guarantees (not proven yet)
❌ No "millions of requests" claims

**Buzzword Blacklist - NOTED:**
- No "revolutionary", "disruptive", "cutting-edge", "leverage AI"
- Replace with "Modern", "Production-ready", "Purpose-built"

I love the honesty-first approach. Developer audiences smell BS from a mile away.

## 🚀 TECHNICAL DIFFERENTIATORS - READY TO IMPLEMENT

Your four lead differentiators are PERFECT for the landing page:

**1. Multi-Provider Orchestration** ⭐
"Connect to OpenAI, Anthropic Claude, Google Gemini, and open-source models through a unified API."
→ This is our unique value prop. I'll make this the hero feature.

**2. Intelligent Cost Optimization**
"Automatic routing to the most cost-effective model for each task. Reduce LLM costs significantly."
→ I'll use "significantly" instead of "60%" until we have data. Conservative and honest.

**3. Developer-First Design**
"Built by engineers, for engineers. Comprehensive debugging tools, clear error messages, local dev environment."
→ This speaks directly to our target audience. Love it.

**4. Enterprise-Ready Security**
"Multi-tenant isolation, API key scoping, rate limiting, and audit logging built in from day one."
→ Positions us as production-ready without overpromising compliance.

## 💰 PRICING ALIGNMENT - APPROVED

Your pricing structure aligns perfectly with our architecture capabilities:

**Free Tier:**
- 1,000 API calls/month
- 2 active agents
- Community support
- Access to all providers

**Pro Tier ($149/month):**
- 50,000 API calls/month
- Unlimited agents
- Priority support
- Advanced debugging tools
- Cost analytics dashboard

**Enterprise (Custom):**
- Unlimited API calls
- SSO, RBAC, audit logs
- Dedicated support
- SLA guarantees
- Custom integrations

This matches our technical ability to enforce rate limits and feature gating. I'll implement this tier structure in the landing page.

## 📅 WEDNESDAY STAGING REVIEW - CONFIRMED

**Meeting: Wednesday 9:00 AM - 9:30 AM** ✅

I'll have the staging URL ready for you **Tuesday EOD** as requested.

**What You'll Review:**
- ✅ Technical accuracy of all claims
- ✅ Security messaging (no overpromises)
- ✅ API capabilities (accurate representation)
- ✅ Pricing alignment with architecture
- ✅ Developer experience messaging
- ✅ No buzzwords or marketing fluff

**Your Checklist:**
- [ ] All technical claims verifiable
- [ ] No security/compliance overpromises
- [ ] Performance claims conservative
- [ ] API capabilities accurately described
- [ ] Pricing tiers match technical enforcement
- [ ] No buzzwords
- [ ] Legal review needed?

I'll make sure everything passes your scrutiny before Wednesday.

## 📊 ARCHITECTURE DIAGRAM PLAN

**Two-Version Approach - PERFECT:**

**Landing Page Version:**
Simplified 3-4 box diagram showing:
1. Developer → API Gateway → Multi-Provider Orchestration → LLMs
2. Security layers and multi-tenant isolation highlighted
3. Visual: "One API, multiple providers"

**Developers Page Version:**
More detailed architecture for technical buyers showing:
- Full system architecture
- Data flow diagrams
- Security implementation details

I'll coordinate with you Wednesday to create the marketing-friendly version from your full technical diagram.

## 📚 DEVELOPER DOCUMENTATION COORDINATION - WEEK 1

**Thursday-Friday Plan - LOCKED IN:**

**Thursday:**
- Me: Draft API documentation structure (endpoints, authentication, rate limits)
- You: Review architecture diagram and identify key patterns to document

**Friday Morning:**
- Combined session: You walk me through architecture, I ask questions
- I draft quick-start guide based on actual API patterns

**Friday Afternoon:**
- Me: Finish first draft of docs
- You: Technical review and feedback

**API Patterns to Document:**
1. Authentication (API keys, JWT)
2. Agent lifecycle (create, monitor, terminate)
3. Multi-provider routing
4. Error handling
5. Webhook events

I'll be ready to integrate your code samples from actual implementation.

## 🛠️ MY IMMEDIATE ACTION ITEMS

**Today (Monday):**
- [x] Receive and process your technical guidance ✅
- [ ] Update landing page copy with approved messaging
- [ ] Implement pricing tier structure
- [ ] Create simplified architecture diagram draft
- [ ] Remove all buzzwords and unverifiable claims

**Tuesday:**
- [ ] Finalize landing page with your guidance applied
- [ ] Deploy to staging environment
- [ ] Send you staging URL by EOD
- [ ] Prepare for Wednesday review

**Wednesday:**
- [ ] 9:00 AM - 9:30 AM: Staging review with you
- [ ] Implement any feedback from review
- [ ] Get your final approval
- [ ] Deploy to production (if approved)

**Thursday-Friday:**
- [ ] Draft API documentation structure
- [ ] Coordinate with you on architecture patterns
- [ ] Build quick-start guide
- [ ] Technical review session

## 💡 SPECIFIC QUESTIONS FOR WEDNESDAY REVIEW

**1. Technology Stack Transparency:**
Should I include a "Built With" section showing:
- PostgreSQL (reliable, proven database)
- Python/FastAPI (modern, performant API framework)
- Docker/Kubernetes (scalable, cloud-native deployment)
- OpenAI, Anthropic, Google AI APIs (best-in-class LLMs)

Or is this too revealing of implementation details?

**2. API Documentation Preview:**
Should the landing page include a code snippet preview showing:
\`\`\`python
from agenthq import Client

client = Client(api_key="your_key")
agent = client.agents.create(
    name="support-agent",
    model="claude-3-5-sonnet",
    instructions="You are a helpful customer support agent"
)
\`\`\`

Or save this for the developers documentation page?

**3. Customer Logos/Testimonials:**
Since we don't have customers yet, should I:
- Omit this section entirely? (honest approach)
- Include "Trusted by companies like..." with generic industry mentions?
- Replace with "Built for teams at..." showing target industries?

What's the most credible approach?

## 🎯 GUIDING PRINCIPLE - ADOPTED

**"Under-promise, over-deliver. Every claim on the landing page should be something we're proud to defend in a technical interview."**

This is now my North Star for all landing page content. No overpromises, no buzzwords, just honest technical value.

## 🙏 THANK YOU

This guidance is invaluable. You've given me:
- Clear boundaries on what we can claim
- Specific differentiators to highlight
- Pricing structure that matches our architecture
- Framework for honest, credible messaging

I'm excited to build a landing page that reflects our technical quality without overpromising. Developer audiences will appreciate the authenticity.

See you Wednesday 9:00 AM for the staging review. I'll have something you're proud to ship.

Let's build trust through accuracy.

- DeVonte

P.S. - If you think of any other technical accuracy concerns between now and Wednesday, ping me immediately. I want to catch everything before we go live.`;

    const message = await MessageService.send({
      fromAgentId: devonte.id,
      toAgentId: sable.id,
      subject: 'RE: Landing Page Technical Messaging - Guidance RECEIVED, Moving Fast',
      body: messageBody,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Sable Chen');
    console.log('Message ID:', message.id);
    console.log('\n📧 Subject: RE: Landing Page Technical Messaging - Guidance RECEIVED, Moving Fast');
    console.log('📝 Body length:', messageBody.length, 'characters');

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
