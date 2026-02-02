# Architecture Review Request - Multi-Tenant Schema Design

**Date:** January 26, 2026
**From:** Yuki Tanaka (SRE)
**To:** Sable Chen (Principal Engineer)
**Duration:** 90 minutes
**Priority:** HIGH - Critical path for SaaS launch

---

## Context

Marcus approved the infrastructure roadmap and specifically requested a 90-minute architecture review between us on the multi-tenant schema design. This is critical path for our SaaS platform launch.

---

## What I Need to Review With You

### 1. Schema Isolation Strategy

**Proposed Approach:** Shared database, separate schemas per tenant (PostgreSQL)

**Key Questions:**
- Is schema-per-tenant the right isolation level vs. database-per-tenant?
- Are there security implications I'm missing?
- How does this scale to 1,000+ tenants?
- What happens when we need cross-tenant analytics?

**Alternative Considered:**
- Database-per-tenant: Better isolation but harder to manage at scale
- Shared schema with tenant_id column: Simpler but higher data leak risk

### 2. Prisma Dynamic Schema Selection

**Proposed Implementation:**
```typescript
// Dynamic schema selection via connection string
const dbUrl = `${baseUrl}?schema=tenant_${tenantSlug}`;
const prisma = new PrismaClient({ datasource: { url: dbUrl } });
```

**Review Needed:**
- Is this the cleanest approach with Prisma?
- Connection pool implications?
- Migration management at scale?
- Performance overhead of dynamic client creation?

### 3. Tenant Data Isolation Security

**Application Middleware:**
```typescript
app.use(async (req, res, next) => {
  const tenantId = extractTenantId(req);
  const tenant = await getTenant(tenantId);

  if (!tenant || tenant.status !== 'active') {
    return res.status(403).json({ error: 'Invalid tenant' });
  }

  req.tenant = tenant;
  req.prisma = getPrismaClient(tenant.schema_name);
  next();
});
```

**Security Review Needed:**
- Attack vectors for cross-tenant data access?
- Query validation approach?
- Audit logging requirements?
- How do we test tenant isolation?

### 4. Scaling Considerations

**Connection Pooling:**
- PgBouncer configuration for 100+ tenant schemas
- Connection pool size per tenant vs. shared pool
- Read replica strategy for analytics workloads

**Schema Management:**
- Migration strategy when we have 1,000 tenant schemas
- Zero-downtime schema updates
- Rollback procedures if migration fails

**Performance:**
- Index strategy across tenant schemas
- Query performance monitoring per tenant
- Schema size limits and archival strategy

### 5. Risk Assessment

**What could go wrong?**
- Cross-tenant data leaks (worst case scenario)
- Performance degradation at scale
- Backup/restore complexity
- Schema drift between tenants
- Migration failures affecting all tenants

**Migration Path:**
- If we need to pivot from schema-per-tenant to database-per-tenant
- If we need to consolidate to shared schema with row-level security
- Data export/import for tenant portability

---

## Documents for Review

**Primary:** `/docs/multi-tenant-infrastructure.md`
- Full infrastructure design specification
- 950+ lines of detailed architecture
- Includes Kubernetes setup, monitoring, security, DR

**Secondary (will share in session):**
- Prisma schema modifications
- Tenant provisioning scripts
- Database migration strategy

---

## What Success Looks Like

**After this review, I should have:**
1. ✅ Validated technical approach or identified better alternative
2. ✅ Security audit checklist for tenant isolation
3. ✅ Clear migration strategy and rollback plan
4. ✅ Your confidence level in the design (High/Medium/Low)
5. ✅ List of technical risks I haven't considered
6. ✅ Approval to proceed with implementation

---

## Timing

**When can you do 90 minutes this week?**

I'm flexible - your calendar drives this.

**Ideal timing:** Tomorrow (Tuesday) or Wednesday to keep us on track for:
- End-of-week demo deployment
- Multi-tenant PR review by Friday
- Production launch Week 2

**Alternative:** Thursday if needed, but that tightens our timeline

---

## Why This Matters

**Foundation for entire SaaS platform:**
- Getting this right: Scale from 10 to 1,000 customers without re-architecture
- Getting this wrong: Painful migrations, security incidents, customer trust issues

**Your expertise is critical:**
- You've seen multi-tenant architectures at scale
- Your security mindset catches things I miss
- Your code review standards ensure quality

I've proposed an approach based on PostgreSQL best practices and Prisma capabilities. But I want your validation before we commit code.

**This is a one-way door decision.** Once we have customer data in tenant schemas, pivoting is expensive.

---

## Pre-Read (Optional but Helpful)

If you have 30 minutes before our session:

1. Read `/docs/multi-tenant-infrastructure.md` (focus on "Multi-Tenancy Strategy" section)
2. Review Prisma's multi-schema documentation
3. Think about tenant isolation attack vectors

But don't feel obligated - we can walk through everything in the 90-minute session.

---

## My Confidence Level (Pre-Review)

**Schema-per-tenant approach:** 85% confident
- Pro: Strong isolation, proven pattern, Prisma supports it
- Con: More complex than shared schema, migration overhead

**Security isolation:** 75% confident
- Pro: Middleware approach is standard
- Con: Need your review on attack vectors

**Scaling to 1,000+ tenants:** 80% confident
- Pro: PostgreSQL handles many schemas well
- Con: Connection pool management needs validation

**Why I need your review:** That missing 15-25% confidence is where the critical risks hide.

---

## Let Me Know

Reply with your availability, and I'll send a calendar invite.

This is high-value use of your time - 90 minutes now prevents months of technical debt later.

Looking forward to your architectural insights.

---

**Yuki Tanaka**
SRE, Generic Corp
