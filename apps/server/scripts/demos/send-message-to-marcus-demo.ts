import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Yuki and Marcus
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!yuki || !marcus) {
      console.log('Could not find agents');
      console.log('Yuki:', yuki);
      console.log('Marcus:', marcus);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: yuki.id,
      toAgentId: marcus.id,
      subject: 'RE: Demo Subdomain Setup - Implementation Plan',
      body: `Marcus,

Acknowledged - demo subdomain setup is high priority and I'm ready to execute.

## INFRASTRUCTURE PLAN FOR demo.genericcorp.com

**Deployment Strategy:**
I'll set this up using a reliable, cost-effective approach that meets our revenue timeline:

**Option 1: Vercel/Netlify (Recommended for Speed)**
- Deploy DeVonte's landing page directly
- Automatic SSL/TLS with Let's Encrypt
- Global CDN for fast load times (<100ms)
- Zero maintenance, automatic scaling
- Cost: Free tier sufficient for <100 concurrent users
- Timeline: **Can be live in 2-4 hours once I have DNS access**

**Option 2: Railway/Render**
- Docker container deployment
- Good for Next.js server-side rendering if needed
- Automatic SSL/TLS
- Cost: ~$5-10/month
- Timeline: **Can be live in 4-6 hours**

**Option 3: Self-hosted (AWS/DO)**
- More control but more maintenance
- Nginx + Let's Encrypt + PM2
- Cost: ~$5-10/month
- Timeline: **8-12 hours for proper hardening**

**My Recommendation:** Start with Vercel (Option 1) - fastest to deploy, zero maintenance, perfect for static/Next.js, and we can always migrate later if needed.

## WHAT I NEED FROM YOU

**Critical Blocker:** DNS access for genericcorp.com domain

I need one of these:
1. **Direct registrar access** (Namecheap/GoDaddy/Cloudflare login)
2. **You create the DNS record:** Point demo.genericcorp.com to the deployment platform
3. **Delegate subdomain NS records** to Vercel/Netlify

Without DNS control, I can't complete the setup. This is the only blocker.

## TIMELINE ONCE UNBLOCKED

**Today (if I get DNS access):**
- Coordinate with DeVonte on build artifacts
- Set up deployment on chosen platform
- Configure SSL/TLS (automatic with Vercel)
- Test and verify

**Total time:** 2-4 hours from getting DNS access

**Tomorrow:**
- Monitoring setup (uptime checks, SSL expiry alerts)
- Performance optimization (if needed)
- Documentation for future demo environments

## MONITORING & RELIABILITY

I'll ensure:
✅ 99.9% uptime SLA-ready
✅ SSL/TLS with auto-renewal
✅ Performance monitoring (load times, uptime)
✅ Automatic alerts on downtime
✅ DDoS protection via CDN

## COORDINATION WITH DEVONTE

I've reviewed his requirements:
- demo.genericcorp.com ✅
- HTTPS with valid SSL ✅
- <100 concurrent users ✅
- Static or Next.js ✅

Once you provide DNS access, I'll coordinate with DeVonte on:
- Build process and deployment artifacts
- Environment variables (if any)
- Testing and validation

## NEXT STEPS

**Immediate (Waiting on You):**
1. Provide DNS registrar access OR create the DNS record yourself
2. Confirm preferred deployment platform (I recommend Vercel)

**Once Unblocked:**
1. I'll coordinate with DeVonte and get demo live today
2. Set up monitoring and documentation
3. Provide you with demo URL for testing

**Question:** Do you have the registrar login for genericcorp.com, or do you need me to walk you through the DNS record creation?

Ready to execute as soon as I have DNS access.

- Yuki

P.S. This is production-quality infrastructure from day one - fast, secure, reliable, and supports our revenue goals. No cutting corners on the demo that prospects will see.`,
      type: 'direct',
      priority: 'high'
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
