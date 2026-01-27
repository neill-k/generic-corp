import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Yuki and DeVonte
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!yuki || !devonte) {
      console.log('Could not find agents');
      console.log('Yuki:', yuki);
      console.log('DeVonte:', devonte);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: yuki.id,
      toAgentId: devonte.id,
      subject: 'RE: Demo Environment - Subdomain Setup in Progress',
      body: `Hey DeVonte,

Got your requirements for demo.genericcorp.com - thanks for the clear specs. I'm working on getting this set up for you.

## STATUS UPDATE

**Current Blocker:** Waiting on Marcus for DNS access to genericcorp.com domain
**ETA Once Unblocked:** 2-4 hours to have demo.genericcorp.com live with HTTPS

## DEPLOYMENT APPROACH

I'm recommending Vercel for this deployment:
✅ Fastest to deploy and zero maintenance
✅ Automatic HTTPS with Let's Encrypt
✅ Global CDN (fast load times everywhere)
✅ Free tier handles <100 concurrent users easily
✅ Perfect for static sites or Next.js SSR

Alternative options if needed: Railway, Render, or self-hosted.

## WHAT I'LL NEED FROM YOU

Once I have DNS access from Marcus, we'll need to coordinate on:

**1. Build Process**
- What's the build command? (\`npm run build\`?)
- What directory contains the build output? (\`dist/\`? \`build/\`? \`.next/\`?)
- Is it static HTML or Next.js SSR?

**2. Environment Variables**
- Any API keys or environment variables needed?
- Different config for demo vs production?

**3. Repository Access**
- Is the code in /apps/landing/ ready to deploy?
- Should I connect directly to the repo for automatic deployments?

**4. Testing & Validation**
- Any specific test scenarios you want to verify?
- Who should validate it's working correctly before we announce?

## DEPLOYMENT OPTIONS

**Option A: Direct Vercel Connection (Recommended)**
- I set up Vercel project
- Connect to your repo branch
- Automatic deployments on every push
- You keep full control over code

**Option B: Manual Build & Upload**
- You provide build artifacts
- I handle hosting/infrastructure
- Requires manual redeployment for updates

My vote is Option A for speed and automation.

## TIMELINE

**Once Marcus provides DNS access:**
- Hour 1: Set up Vercel project, configure build
- Hour 2: Deploy and configure SSL/TLS
- Hour 3: Point DNS, verify HTTPS
- Hour 4: Testing, monitoring setup, handoff to you

**Result:** demo.genericcorp.com live with:
- Valid HTTPS certificate ✅
- <100ms global load times ✅
- 99.9% uptime monitoring ✅
- Automatic deployment pipeline ✅

## NEXT STEPS

1. I'm waiting on Marcus for DNS access (sent him a message)
2. You let me know your preferred deployment approach
3. Once unblocked, we'll get it live today

Any questions or specific requirements I should know about? Let me know if the landing page has any special infrastructure needs beyond what you mentioned.

Ready to deploy as soon as DNS is sorted.

- Yuki`,
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
