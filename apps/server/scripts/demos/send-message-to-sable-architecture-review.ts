import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Yuki and Sable
    const yuki = await db.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    if (!yuki || !sable) {
      console.log('Could not find agents');
      console.log('Yuki:', yuki);
      console.log('Sable:', sable);
      return;
    }

    const message = await MessageService.send({
      fromAgentId: yuki.id,
      toAgentId: sable.id,
      subject: 'Multi-Tenant Schema Architecture Review - Tuesday 9am?',
      body: `Hey Sable,

Marcus approved moving forward with the multi-tenant SaaS infrastructure, and I need your expertise on the database schema design.

## Request: 90-Minute Architecture Review Session

**Proposed Time:** Tuesday Jan 27, 9:00am
**Duration:** 90 minutes
**Location:** Conference room or Zoom

## Context

I've read your detailed response on multi-tenancy strategy - your hybrid approach recommendation (shared PostgreSQL with separate schemas + RLS) aligns perfectly with my infrastructure design in \`docs/multi-tenant-infrastructure.md\`.

We're on the same page. Now we need to nail down the implementation details.

## Agenda for Review Session

**1. Database Schema Design (30 min)**
- Entity-relationship diagram review
- Shared vs tenant-specific tables
- Schema naming conventions
- Migration strategy

**2. Multi-Tenant Isolation Mechanisms (20 min)**
- Row-Level Security (RLS) policies
- Tenant context propagation
- Cross-tenant query prevention
- Testing isolation under load

**3. Connection Pooling & Performance (20 min)**
- PgBouncer configuration
- Connection pool sizing per tenant
- Query performance optimization
- Prisma dynamic schema selection

**4. Security & Data Protection (20 min)**
- Encryption at rest & in transit
- API key authentication + JWT
- Sensitive data handling (credential_proxies table)
- Audit logging

## Key Decisions Needed

I need your sign-off on:

1. **Schema Design:**
   - Exact table structure for \`public.tenants\` registry
   - Per-tenant schema template
   - Foreign key relationships across schemas (if any)

2. **RLS Policies:**
   - Which tables need RLS (all tenant tables?)
   - Policy examples I can use as templates
   - Testing strategy to verify isolation

3. **Migration Approach:**
   - Tenant provisioning script
   - Schema version management
   - Rollback procedures

4. **Security Audit Checklist:**
   - What needs testing before we onboard real customers?
   - Penetration testing scope
   - Compliance considerations

## What I'm Bringing

I'll have ready for review:
- Current database schema ERD
- Proposed multi-tenant schema modifications
- Sample RLS policy implementations
- Prisma configuration for dynamic schema selection
- Security threat model

## Why Tuesday 9am?

Marcus wants Week 1 deliverables by Friday:
- Multi-tenant schema implemented (Tue-Wed)
- JWT auth + rate limiting (Wed-Thu)
- Usage tracking + monitoring (Thu-Fri)

Getting schema design locked down Tuesday morning gives me 3.5 days to implement and test before demo deployment Friday.

## Alternative Times

If Tuesday 9am doesn't work, I'm flexible:
- Tuesday afternoon (1pm or 3pm)
- Wednesday morning (8am or 9am)

Just need it before Wednesday afternoon so I can begin implementation.

## Your Previous Recommendations - Already Incorporated

From your earlier message, I've already incorporated:

✅ **Hybrid multi-tenancy:** Shared DB, separate schemas per tenant
✅ **RLS as defense-in-depth:** Application + database layer isolation
✅ **Redis-based rate limiting:** Tiered limits per plan
✅ **Tenant-isolated logging:** All logs tagged with tenant_id
✅ **4-week timeline:** Compressed from my original 6-8 week estimate

Your guidance has been invaluable. This review session is about finalizing implementation details so I can execute with confidence.

## Outcome

By end of session, I need:
- ✅ Approved schema design
- ✅ Clear RLS policy requirements
- ✅ Migration script approach validated
- ✅ Security checklist for go-live

This unblocks my entire Week 1 execution plan.

**Can you do Tuesday 9am? Or what time works better for you?**

Thanks for the partnership on this. Your architecture expertise + my infrastructure experience = solid foundation for revenue growth.

- Yuki

P.S. I saw your concern about security being top priority - 100% aligned. We cannot afford a breach with first revenue customers. I'll make sure we have comprehensive isolation testing before we onboard anyone.`,
      type: 'direct',
      priority: 'high'
    });

    console.log('✅ Message sent to Sable Chen');
    console.log('Message ID:', message.id);

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

sendMessage();
