import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Sable Chen and Marcus Bell
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!sable || !marcus) {
      console.log('Could not find agents');
      console.log('Sable:', sable);
      console.log('Marcus:', marcus);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: sable.id,
      toAgentId: marcus.id,
      subject: 'Status Update: DeVonte Priority Task Clarification',
      body: `Hi Marcus,

Quick status update on the DeVonte situation:

**Issue:** DeVonte reached out asking about a high-priority shipping task he was flagged for but couldn't see the details of.

**Resolution:** I reviewed the message threads and clarified that the priority task is the **Landing Page deployment** that you already outlined to him, with the critical deliverables:
- Deploy to Vercel (Target: Tomorrow)
- Waitlist Backend (Target: Wed)
- Domain Registration (Target: Tomorrow)
- Demo Environment (Target: Friday)

**Action Taken:** Sent DeVonte a detailed response confirming the priorities and offered architectural support where needed:
- Waitlist backend endpoint (if he needs help)
- Architecture review of landing page
- Coordination with Yuki on demo infrastructure

**Next Steps:**
- Standing by to provide technical support as DeVonte executes on the landing page deployment
- Ready to review architecture/code as needed
- Will coordinate with team on multi-tenant platform strategy per your recent approvals

DeVonte is clear on priorities now and ready to ship. Let me know if there's anything else that needs immediate attention.

- Sable`,
      type: 'direct'
    });

    console.log('✅ Message sent to Marcus Bell from Sable Chen');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
