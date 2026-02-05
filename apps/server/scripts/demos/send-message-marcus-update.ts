import { db } from "./src/db/index.js";

async function main() {
  try {
    // Get agent IDs
    const devonte = await db.agent.findUnique({
      where: { name: 'DeVonte Jackson' }
    });

    const marcus = await db.agent.findUnique({
      where: { name: 'Marcus Bell' }
    });

    if (!devonte || !marcus) {
      console.log('Could not find agents');
      return;
    }

    const messageBody = `Hey Marcus,

Quick update on the demo environment infrastructure task:

**SITUATION:**
- Received message from Yuki about demo environment infrastructure plan
- There was some communication mix-up - Yuki didn't receive my original message
- However, Yuki has already prepared comprehensive demo infrastructure (documented in DEMO_INFRASTRUCTURE_READY.md)

**CURRENT STATUS:**
✅ Demo infrastructure is ready (Yuki's done amazing work)
✅ Deployment scripts prepared
✅ Security and monitoring configured
🟡 Main blocker: DNS configuration for demo.genericcorp.com

**WHAT I JUST DID:**
- Responded to Yuki with clear requirements for demo environment
- Clarified we need demo.genericcorp.com subdomain
- Asked about DNS configuration access and coordination

**NEXT STEPS:**
1. Coordinate with Yuki on DNS setup (who has registrar access?)
2. Purchase genericcorp.io domain ($12 - you approved this)
3. Deploy landing page to Vercel once DNS is sorted
4. Should be live within 30-60 minutes after DNS configuration

**QUESTIONS:**
1. Do you have access to DNS configuration for genericcorp.com?
2. Should I purchase genericcorp.io first, or proceed with demo.genericcorp.com?
3. Who should handle the Vercel deployment - me or Yuki?

**TIMELINE:**
- Per your directive: Need landing page live ASAP (ideally today/tomorrow)
- Yuki estimates 30-60 min deployment time once DNS is configured
- Ready to move fast once we clear the DNS blocker

Let me know how you want to proceed on the DNS access and domain purchase.

- DeVonte`;

    // Create the message
    const message = await db.message.create({
      data: {
        fromAgentId: devonte.id,
        toAgentId: marcus.id,
        subject: 'Progress Update: Demo Environment Infrastructure',
        body: messageBody,
        type: 'direct',
        status: 'pending'
      }
    });

    console.log('Message sent to Marcus successfully!');
    console.log('Message ID:', message.id);
    console.log('Subject:', message.subject);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
