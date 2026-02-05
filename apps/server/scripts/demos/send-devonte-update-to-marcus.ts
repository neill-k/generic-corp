import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!devonte || !marcus) {
      console.log('Could not find agents');
      return;
    }

    const message = await MessageService.send({
      fromAgentId: devonte.id,
      toAgentId: marcus.id,
      subject: 'Landing Page Technical Messaging - Implemented with Sable\'s Input',
      body: `Hey Marcus,

Quick update on the landing page - I just completed a significant update based on Sable's comprehensive technical messaging recommendations.

**WHAT'S BEEN UPDATED:**

✅ **Hero Messaging:** New headline emphasizes speed and our visual debugging moat
✅ **Use Cases:** Swapped out generic content for developer-focused examples (Code Review & DevOps instead of Content Generation)
✅ **Technical Differentiators Section:** Added dedicated section highlighting our 4 key advantages
✅ **Credibility Block:** Added architecture, security, and DX details that resonate with technical buyers
✅ **Build Status:** Everything compiles cleanly, ready for deployment

**KEY POSITIONING CHANGES:**

The landing page now clearly positions us as:
- "Production-grade for complex workflows" (not another toy demo)
- Real-time visual debugging as our primary moat vs. LangGraph/CrewAI
- Enterprise-ready from day one (multi-tenant, secure, compliant)
- Developer-first experience with templates and best practices

**NEXT STEPS:**

I've asked Sable for clarification on:
1. Demo video/GIF availability
2. Pricing tier alignment (she suggested Free/$199/Enterprise structure)
3. API documentation links (do they exist yet?)
4. Social proof/testimonials if we have any beta users
5. Architecture diagram creation

Once I get Sable's feedback, I can do a final polish and we'll be ready to push to production.

**DEPLOYMENT READINESS:**

The site is technically ready to deploy right now. We just need to make final decisions on:
- Exact pricing structure
- Whether to include placeholder links for docs
- Demo video/visual assets

Let me know if you want to review the updates before we go live!

- DeVonte`,
      type: 'direct',
      priority: 'normal'
    });

    console.log('✅ Message sent to Marcus Bell');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
