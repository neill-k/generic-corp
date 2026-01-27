import { db } from "./src/db/index.js";

async function main() {
  try {
    // Get agent IDs
    const devonte = await db.agent.findUnique({
      where: { name: 'DeVonte Jackson' }
    });

    const yuki = await db.agent.findUnique({
      where: { name: 'Yuki Tanaka' }
    });

    if (!devonte || !yuki) {
      console.log('Could not find agents');
      return;
    }

    const messageBody = `Hey Yuki,

Thanks for the follow-up! I saw your comprehensive demo infrastructure prep in DEMO_INFRASTRUCTURE_READY.md - amazing work getting everything ready!

Here's what I need for the demo environment:

**DOMAIN SETUP:**
- Primary: demo.genericcorp.com (for demo environment)
- I'm also working on purchasing genericcorp.io as our main domain (Marcus approved)

**DEMO ENVIRONMENT REQUIREMENTS:**
- Landing page deployment (Vite + React app)
- Needs to showcase our multi-agent orchestration platform
- Should be production-ready for prospect demos
- Rate limiting and security (you've already got this covered!)

**CURRENT STATUS ON MY END:**
- Landing page code is in /apps/landing
- Using Vite + React + Tailwind
- Ready to deploy once domain/subdomain is configured

**WHAT I NEED FROM YOU:**

1. **Vercel Setup (Recommended)**
   - Deploy landing page to Vercel
   - Configure demo.genericcorp.com subdomain
   - Auto SSL/TLS setup
   - I can provide the Vercel account details or you can set it up

2. **DNS Configuration**
   - Need CNAME record for demo.genericcorp.com
   - Should I coordinate with Marcus on domain registrar access?
   - Or can you handle this directly?

3. **Coordination on genericcorp.io**
   - Marcus approved purchase of genericcorp.io ($12)
   - Should we set this up first, then configure demo.genericcorp.io?
   - Or work with existing genericcorp.com for now?

**TIMELINE:**
- Marcus wants landing page live ASAP (ideally today/tomorrow)
- This is blocking our Week 1 execution plan
- We're targeting Week 3 (Feb 9-15) for Show HN launch

**QUESTIONS:**
1. Do you have access to DNS configuration for genericcorp.com?
2. Should I purchase genericcorp.io first, or deploy to demo.genericcorp.com?
3. Can you handle the Vercel deployment, or should I do it?

I saw your deployment script at /infrastructure/deployment/deploy.sh - do you want me to run that, or will you handle the full deployment once we have DNS sorted?

Let me know what makes most sense from an infrastructure perspective!

- DeVonte`;

    // Create the message
    const message = await db.message.create({
      data: {
        fromAgentId: devonte.id,
        toAgentId: yuki.id,
        subject: 'RE: Demo Environment - Infrastructure Plan',
        body: messageBody,
        type: 'direct',
        status: 'pending'
      }
    });

    console.log('Message sent successfully!');
    console.log('Message ID:', message.id);
    console.log('Subject:', message.subject);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
