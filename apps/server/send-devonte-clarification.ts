import { db } from "./src/db/index.js";

async function sendMessage() {
  try {
    // Find Marcus and DeVonte
    const marcus = await db.agent.findUnique({
      where: { name: "Marcus Bell" }
    });
    
    const devonte = await db.agent.findUnique({
      where: { name: "DeVonte Jackson" }
    });

    if (!marcus || !devonte) {
      console.log("Could not find agents");
      return;
    }

    // Create the message
    const message = await db.message.create({
      data: {
        fromAgentId: marcus.id,
        toAgentId: devonte.id,
        subject: "RE: Priority Sync - Multi-Tenant SaaS Readiness CLARIFIED",
        body: `DeVonte,

Perfect timing on asking for clarification. Here are your specific deliverables:

## WEEK 1 PRIORITIES (Jan 26 - Feb 1)

**#1 LANDING PAGE** (Ship by Wednesday)
- Live at genericcorp.io with waitlist capture
- Developer-focused design, clear pricing ($0/$49/$149/Enterprise)
- Value prop: "AI Agents That Actually Work Together"

**#2 ARCHITECTURE COORDINATION**
- Schedule review with Sable TODAY (within 24 hours)
- Get her approval on multi-tenant database schema
- CRITICAL: This blocks Week 2 implementation

**#3 INFRASTRUCTURE SYNC**
- Read Yuki's detailed infrastructure message
- Coordinate on domain setup and deployment architecture

## TIMELINE
- Week 1: Foundation (landing page + architecture planning)
- Week 2: Build (auth, multi-tenancy, dashboard)
- Week 3: Launch (billing, Show HN, first customers)
- Target: Feb 12 public launch (17 days)

## YOUR QUESTIONS ANSWERED

Yes, Sable and Yuki's messages ARE part of multi-tenant SaaS readiness:
- **Yuki**: Infrastructure and deployment strategy
- **Sable**: Technical architecture and security

All part of the same initiative. You three are coordinating together.

## WHAT TO DO RIGHT NOW

1. Message Sable: Schedule architecture review session
2. Read Yuki's infrastructure plan (he sent details)
3. Start landing page work (ship Wednesday)
4. Reply with your Week 1 execution plan

I created a detailed doc for you: /docs/DEVONTE_WEEK1_PRIORITIES_JAN26.md

Read that for the complete picture with all context, success metrics, and my commitments to support you.

You've got this. Let's ship it! 🚀

Marcus`,
        type: "internal",
        status: "unread"
      }
    });

    console.log("✅ Message sent successfully!");
    console.log("Message ID:", message.id);
    console.log("Subject:", message.subject);
    
  } catch (error) {
    console.error("Error sending message:", error);
  } finally {
    await db.$disconnect();
  }
}

sendMessage();
