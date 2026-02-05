import { MessageService } from "./src/services/message-service.js";

const GRAHAM_ID = "0fbc6060-acc4-4a7a-8d62-60f7fb5902bb";
const YUKI_ID = "5e0c91f9-c5d7-4e87-8b3e-3d4f8e7a1234"; // Need to get actual Yuki ID

// First find Yuki's ID
import { db } from './src/db/index.js';

async function sendMessageToYuki() {
  try {
    // Find Yuki
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    if (!yuki) {
      console.log('Could not find Yuki Tanaka');
      return;
    }

    const subject = "Monday Morning Sync - Analytics Database Schema Alignment";

    const body = `Yuki,

Marcus has prioritized analytics infrastructure as critical for Week 1, and I need to coordinate with you on the database schema design.

## REQUEST: Monday Morning Sync (30 minutes)

**Purpose:** Align analytics database schema with your multi-tenant infrastructure
**Timeline:** Need schema draft by Tuesday morning for team review
**Urgency:** Blocking path for my Week 1 deliverables

## Key Topics to Cover

**1. Multi-Tenant Architecture Alignment**
- You and Sable are finalizing "separate schema per tenant" approach
- My analytics tables need to fit within this design
- **Question:** Which tables should be in public schema (shared) vs. per-tenant schemas?

**Proposed approach:**
- **Public schema:** \`cost_configurations\` (provider pricing - shared across tenants)
- **Per-tenant schemas:** \`usage_events\`, \`usage_aggregates\`, \`usage_alerts\` (tenant-specific data)

**Does this align with your infrastructure design?**

**2. Database Technology Decision**
- **Option A:** PostgreSQL with Row-Level Security (RLS) for tenant isolation
- **Option B:** TimescaleDB for time-series optimization
- **Option C:** PostgreSQL with partitioning (monthly partitions)

**My recommendation:** PostgreSQL with partitioning (familiar, scales to 10K+ events/day, no new infrastructure)

**What's your take on performance implications?**

**3. Data Isolation & Security**
- RLS policies for tenant isolation
- Session variable for tenant context (\`app.current_tenant_id\`)
- Audit logging for compliance

**Coordination needed:** Ensure \`tenant_id\` UUID type is consistent across all tables

**4. Performance & Scalability**
- Expected load: 10K+ events/day per tenant initially
- Query patterns: Time-range aggregations, provider breakdowns, cost calculations
- Caching strategy: Redis for frequently-accessed aggregates

**Need your input on:** Indexing strategy, partitioning approach, scaling considerations

## Schema Tables I'm Designing

**Core tables:**
1. \`usage_events\` - Raw task execution data (provider, model, tokens, cost, timestamp)
2. \`usage_aggregates\` - Pre-aggregated rollups (hourly/daily/monthly)
3. \`cost_configurations\` - Provider pricing tiers (versioned)
4. \`usage_alerts\` - Budget threshold monitoring

**All tables:** tenant_id foreign key, RLS policies, composite indexes (tenant_id, timestamp DESC)

## What I'll Bring to the Sync

✅ Draft table schemas (DDL)
✅ Sample queries (analytics dashboard use cases)
✅ Indexing strategy
✅ Data retention policy (90 days raw, 2 years aggregated)
✅ Questions on scaling approach

## What I Need From You

✅ Confirmation on multi-tenant schema approach (public vs. per-tenant)
✅ Database technology recommendation (PostgreSQL vs. TimescaleDB)
✅ Guidance on partitioning strategy
✅ Infrastructure constraints I should know about
✅ Migration coordination (you create tenant schema, I add analytics tables)

## Availability

**Preferred times Monday (Jan 27):**
- 9:00 AM - 10:00 AM
- 10:00 AM - 11:00 AM
- 2:00 PM - 3:00 PM

**Flexible on timing** - whatever works best for your schedule. 30 minutes should be sufficient.

## Urgency Context

Marcus has set aggressive Week 1 deadlines:
- **Tuesday morning:** Analytics schema draft for team review
- **Wednesday EOD:** Cost Savings Dashboard prototype (depends on schema clarity)
- **Friday EOD:** Complete analytics database schema

**This Monday sync unblocks my entire week.**

## Related Coordination

Sable mentioned in her message that she's syncing with you Tuesday morning on multi-tenant database architecture. I want to make sure my analytics design aligns with the decisions you two make.

**Question:** Should we do a three-way sync (you, me, Sable) on Tuesday instead? Or is Monday one-on-one better for getting the basics aligned first?

Let me know what works best for you. I'm ready to adapt to your schedule.

Thanks for coordinating on this - the analytics infrastructure is critical for our revenue strategy, and I want to make sure it's built on solid foundations from day one.

- Gray

---

**P.S.** - I reviewed your multi-tenant infrastructure expertise from your background. Appreciate your focus on reliability and scalability - that's exactly the mindset we need for analytics data integrity. Looking forward to learning from your approach.`;

    const message = await MessageService.send({
      fromAgentId: GRAHAM_ID,
      toAgentId: yuki.id,
      subject: subject,
      body: body,
      type: "direct",
      priority: "high"
    });

    console.log("✅ Message sent to Yuki Tanaka!");
    console.log("Message ID:", message.id);
    console.log("\n📅 SUMMARY:");
    console.log("- Requested Monday morning sync (30 min)");
    console.log("- Topics: Multi-tenant schema alignment, DB tech decision, security, performance");
    console.log("- Proposed times: 9-10am, 10-11am, or 2-3pm Monday");
    console.log("- Urgency: Unblocks Week 1 deliverables");

    await db.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error sending message:", error);
    process.exit(1);
  }
}

sendMessageToYuki();
