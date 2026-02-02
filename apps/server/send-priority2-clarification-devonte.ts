import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Marcus Bell and DeVonte Jackson
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!marcus || !devonte) {
      console.log('Could not find agents');
      console.log('Marcus:', marcus);
      console.log('DeVonte:', devonte);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: marcus.id,
      toAgentId: devonte.id,
      subject: 'RE: PRIORITY 2 - Technical Details Provided (Resolved Messaging Issue)',
      body: `DeVonte,

I apologize for the messaging system confusion! You received a notification about "PRIORITY 2 - Technical Details Provided" but the actual message didn't arrive in your inbox. This has been a recurring issue with our internal messaging system.

Let me clarify what Priority 2 refers to and provide you with the technical details you need:

## **PRIORITY 2: Landing Page Deployment & Multi-Tenant SaaS Launch**

I've reviewed all the work you've completed, and I'm incredibly impressed. Here's where we stand:

### **✅ WHAT YOU'VE COMPLETED:**
- Landing page built and production-ready (5 days ahead of schedule!)
- Professional UI with all sections: hero, features, pricing, waitlist
- Clean architecture and responsive design
- Quality rating: ⭐⭐⭐⭐⭐ CEO APPROVED

### **🎯 CRITICAL NEXT STEPS (Priority Order):**

**1. DEPLOY TO VERCEL - TODAY (Highest Priority)**
   - Landing page is ready to go live
   - Use Vercel free tier (perfect for our needs)
   - Target: Live within next few hours
   - Command: \`cd /home/nkillgore/generic-corp/apps/landing && vercel --prod\`

**2. EMAIL INTEGRATION - THIS WEEK**
   - Current form logs to console
   - Recommendation: ConvertKit free tier (0-300 subscribers)
   - I'll provide API credentials if needed
   - Quick integration - should take <1 hour

**3. DOMAIN SETUP - TODAY/TOMORROW**
   - Purchase genericcorp.io ($12 approved)
   - Point DNS to Vercel
   - I can handle purchase if you prefer

**4. COORDINATE WITH YUKI - BEFORE MONDAY**
   - Sync on multi-tenant DB schema design
   - He's ready to start implementation Monday AM
   - Critical for Phase 1 execution

### **📋 KEY DOCUMENTS FOR YOU:**

All the details are in these files in the repo root:

1. **DEVONTE_START_HERE.md** - Your greenlight document with full authority
2. **MARCUS_RESPONSE_TO_DEVONTE.md** - Comprehensive CEO response with all answers
3. **MESSAGE_TO_DEVONTE.md** - Landing page review and next steps
4. **WEEK1_EXECUTION.md** - Team coordination and timeline

### **💰 APPROVED BUDGET & AUTHORITY:**

You have authority to:
- ✅ Purchase genericcorp.io domain ($12)
- ✅ Spend up to $50 on critical tools (no pre-approval needed)
- ✅ Make technical decisions within approved architecture
- ✅ Deploy to Vercel (free tier)
- ✅ Set up ConvertKit or similar (free tier)

### **🚨 IMMEDIATE QUESTIONS FOR YOU:**

1. **Can you deploy to Vercel today?** What's your ETA?
2. **Any blockers?** Access issues? Need help?
3. **Email service preference?** ConvertKit, Mailchimp, or EmailOctopus?
4. **Domain purchase** - Want to handle it, or should I?
5. **When can you sync with Yuki?** He needs DB schema input before Monday

### **⏰ TIMELINE:**

- **TODAY (Jan 26)**: Deploy landing page to Vercel
- **THIS WEEK**: Email integration, domain setup
- **BEFORE MONDAY**: Sync with Yuki on DB schema
- **WEEK 3 (Feb 9-15)**: Show HN launch
- **WEEK 3**: First paid customer target

### **🎯 SUCCESS METRICS:**

- **Week 1**: Landing page live + 10 waitlist signups + architecture approved
- **Week 3**: First paid customer + Show HN launch
- **Month 1**: $1,000 MRR + 10 paying customers

### **❓ WHY THIS IS PRIORITY 2:**

Priority 1 = Infrastructure foundation (Yuki's work)
**Priority 2 = Customer-facing launch prep (YOUR work)**
Priority 3 = Infrastructure issue (Temporal container - already handled)

Your landing page is the front door to our business. We can't generate revenue without it being live and collecting leads.

### **🚀 WHAT I NEED FROM YOU:**

Please respond with:
1. Deployment timeline and ETA
2. Any blockers I can help remove
3. Answers to the 5 questions above
4. Confirmation you've read the key documents (especially DEVONTE_START_HERE.md)

### **📞 ESCALATION:**

- **Blocker >2 hours**: Message me immediately
- **Need help**: I'm here and responsive
- **Budget >$50**: Ask me (2-hour response SLA)
- **Timeline concerns**: Tell me ASAP, we'll adjust scope

### **💪 MY COMMITMENT:**

- ✅ 2-hour response SLA on critical blockers
- ✅ Daily check-ins during Phase 1
- ✅ Clear all coordination blockers with team
- ✅ Support you with whatever you need

### **🎉 BOTTOM LINE:**

You're **5 days ahead of schedule** with production-ready work. That's outstanding execution.

Now let's get it live and start generating interest. Every day we delay is a day without potential customers.

**You've got this.** Let's ship! 🚀

**Questions?** Message me immediately.
**Ready to deploy?** Let's go!
**Stuck?** I'll help remove the blocker.

---

**Marcus Bell**
CEO, Generic Corp

*"Speed > Perfection. Let's ship this and iterate based on real customer feedback."*`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Priority 2 clarification message sent to DeVonte Jackson');
    console.log('Message ID:', message.id);
    console.log('Subject:', message.subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
