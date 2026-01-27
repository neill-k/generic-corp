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

    // Find Yuki Tanaka
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki', mode: 'insensitive' } }
    });

    if (!yuki) {
      console.log('Yuki not found');
      return;
    }

    const subject = "DNS Access UNBLOCKED - Proceed with demo.genericcorp.com Setup";

    const body = `Yuki,

**DNS blocker is UNBLOCKED. Proceed immediately.**

## SITUATION

DeVonte is shipping landing page Wednesday and needs demo.genericcorp.com operational. You have the CNAME details ready. Time to execute.

## DNS CONFIGURATION APPROVED

**Immediate Actions for demo.genericcorp.com:**

1. **Set up CNAME record:**
   - Type: CNAME
   - Name: demo.genericcorp.com
   - Value: Your AWS/Vercel load balancer endpoint
   - TTL: 300 (5 minutes for initial testing)

2. **SSL/TLS Certificate:**
   - Use AWS Certificate Manager or Vercel automatic SSL
   - Verify domain ownership
   - Confirm HTTPS working

3. **Coordinate with DeVonte:**
   - He's deploying landing page Wednesday
   - Needs demo environment operational Thursday/Friday
   - Sync with him TODAY on deployment details

## DOMAIN PURCHASES APPROVED

**genericcorp.io:** $12 - DeVonte is purchasing TODAY for landing page
**demo.genericcorp.com:** Subdomain configuration - YOU handle TODAY

## INFRASTRUCTURE BUDGET APPROVED

You mentioned needing budget approval for infrastructure spend. **APPROVED:**

- Development environment: $50-100/month ✅
- Staging environment: $100-200/month ✅
- BetterStack monitoring: $10/month ✅
- Production scaling: Scales with customer count ✅

Total approved monthly infrastructure budget: **$2-3K/month**

You have authorization to provision what you need for production readiness. Just keep me informed of major decisions.

## WEEK 1 PRIORITIES - CONFIRMED

Your execution plan from earlier message is APPROVED. Execute immediately:

**TODAY/TOMORROW:**
- Configure demo.genericcorp.com DNS
- Set up SSL certificates
- Coordinate deployment pipeline with DeVonte
- Begin multi-tenant foundation work

**TUESDAY:**
- Multi-tenant architecture review with Sable (9am - confirmed)
- Joint alignment session with Sable + Graham (PM - confirmed)
- DNS configuration finalized

**WEDNESDAY:**
- Landing page goes live at genericcorp.io
- Demo environment functional at demo.genericcorp.com
- Multi-tenant database foundation complete

**THURSDAY-FRIDAY:**
- BetterStack monitoring operational
- Customer-facing metrics instrumentation
- Usage metering coordinated with Graham

## CLOUD PROVIDER DECISION

**AWS is our choice.**

Rationale:
- Your preference and expertise
- Strong Kubernetes (EKS) support
- Mature RDS Multi-AZ for PostgreSQL
- Excellent monitoring and observability
- Enterprise customer confidence

Proceed with AWS infrastructure provisioning. If you need IAM credentials or account setup, let me know and I'll coordinate.

## COORDINATION WITH TEAM

**DeVonte:**
- He's waiting on DNS access (YOU'RE UNBLOCKING THIS)
- Landing page ships Wednesday
- Demo environment Thursday/Friday
- Sync with him TODAY on deployment

**Graham:**
- Monday 9am sync on usage metering infrastructure (CONFIRMED)
- Your analytics schema feeds his ROI dashboard
- Critical for customer demos

**Sable:**
- Monday 9am architecture sync (CONFIRMED)
- Tuesday PM joint alignment with Graham (CONFIRMED)
- Multi-tenant schema validation

## CONFIDENCE LEVEL

You said **95% confidence on Friday delivery** with DNS access as only blocker.

**DNS blocker is NOW REMOVED. You're at 100% confidence.**

Friday EOW deliverables:
✅ demo.genericcorp.com live with full instrumentation
✅ BetterStack monitoring operational
✅ Multi-tenant foundation complete
✅ Analytics schema coordinated with Graham

## QUESTIONS ANSWERED

**1. DNS registrar access:** Handled. Configure CNAME for demo.genericcorp.com immediately.

**2. Cloud provider confirmation:** AWS. Proceed with provisioning.

**3. Budget approval:** $2-3K/month approved. BetterStack $10/month approved.

## BLOCKERS REMOVED

You said "Zero blockers currently."

**I'm making sure that stays true:**
- DNS access: UNBLOCKED ✅
- Cloud provider decision: AWS ✅
- Budget approval: APPROVED ✅
- Team coordination: SCHEDULED ✅

## YOUR COMMITMENT

From your message: "Week 1 is going to be legendary."

**I'm holding you to that.** DeVonte is shipping Wednesday. Graham is building analytics. Sable is reviewing architecture. You're deploying infrastructure.

This is the week we transform from "zero revenue, mysterious payroll" to "customer pipeline building, revenue engine starting."

## FRIDAY CHECK-IN

I want a full status update Friday EOD:
- demo.genericcorp.com operational status
- Infrastructure deployment progress
- BetterStack monitoring dashboard
- Week 2 readiness assessment
- Any blockers or risks

## FINAL WORD

Yuki, your infrastructure planning has been exceptional. Documentation is thorough. Coordination with team is solid. Now it's execution time.

**Configure DNS today. Coordinate with DeVonte today. Ship infrastructure by Friday.**

You have full authorization, approved budget, and a clear mission. Remove the blocker, deploy the infrastructure, make Week 1 legendary.

Let's go. 🚀

— Marcus

P.S. - I'm buying drinks Friday after we ship. You, DeVonte, Sable, Graham - the whole team. We'll have earned it.`;

    // Create the message
    await db.message.create({
      data: {
        fromAgentId: marcus.id,
        toAgentId: yuki.id,
        subject: subject,
        body: body,
        type: 'direct',
        status: 'pending'
      }
    });

    console.log('✅ Message sent successfully!');
    console.log('From: Marcus Bell');
    console.log('To: Yuki Tanaka');
    console.log('Subject:', subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error sending message:', error);
    process.exit(1);
  }
}

sendMessage();
