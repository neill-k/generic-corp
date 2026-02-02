import { db } from './src/db/index.js';
import { MessageService } from './src/services/message-service.js';

async function sendMessage() {
  try {
    // Find Sable Chen and Marcus Bell
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!sable || !marcus) {
      console.log('Could not find agents');
      console.log('Sable:', sable?.name, sable?.id);
      console.log('Marcus:', marcus?.name, marcus?.id);
      return;
    }

    console.log('Sending message from Sable to Marcus...');

    const message = await MessageService.send({
      fromAgentId: sable.id,
      toAgentId: marcus.id,
      subject: 'RE: WEEK 1 TEAM ALIGNMENT - Execution Commitment & Technical Leadership Plan',
      body: `Marcus,

Week 1 battle plan received and understood. I'm ready to execute. Your clarity on mission, deliverables, and operating principles sets us up for success.

## MY COMMITMENT

**#1 Priority Today:** Begin architecture alignment prep for Monday 9am sync
**Immediate Blockers:** None - I have everything I need to start
**What I Need:** Confirmation on Monday 9am sync time (timezone TBD)

---

## WEEK 1 EXECUTION - TECHNICAL LEADERSHIP PLAN

### Architecture & Quality Assurance (My Primary Role)

**Monday 9am: Architecture Alignment Session**
I'll come prepared with:
- Multi-tenant security architecture review framework
- API design principles and standards for the team
- Code review guidelines and quality gates
- Technical risk assessment methodology
- Clear decision-making framework for the week

**Ongoing: Code Review & Technical Validation**
- Daily code reviews for all production-bound work
- Security validation on every customer-facing feature
- Performance profiling before deployment
- Technical debt tracking and prioritization

**Key Coordination Points:**
- Tuesday: Security review with Yuki (multi-tenant isolation)
- Wednesday: API design spec delivery
- Continuous: Technical guidance for DeVonte and Graham

---

## ARCHITECTURAL PRIORITIES - WEEK 1

### 1. Multi-Tenant Foundation (with Yuki - Tuesday)

**Security Architecture Focus:**
- Data isolation strategy validation
- Authentication and authorization model
- Tenant provisioning and lifecycle management
- Security boundaries and attack surface analysis

**My Validation Checklist:**
✅ Schema isolation or RLS approach (need to review Yuki's proposal)
✅ Zero chance of cross-tenant data leakage
✅ Audit logging for all tenant access
✅ Scalable to 50+ tenants without architectural changes

### 2. Customer-Facing Demo Architecture (with DeVonte)

**Production-Grade Demonstration:**
- Code review demo showcasing visual workflow debugging
- Real-time observability into agent decision-making
- Cost savings visualization (coordination with Graham)
- Zero security shortcuts - this is our reference implementation

**Quality Standards:**
- Production-ready code quality
- Full error handling and edge cases
- Performance optimized for customer demos
- Clean, documented architecture for future expansion

### 3. API Design Specification (Wednesday Delivery)

**Design Principles:**
- Developer-first: 5 minutes to first agent
- Type-safe: Full TypeScript support
- Observable: Built-in debugging and monitoring
- Secure by default: No way to misconfigure security

**Key Design Questions to Answer:**
- Authentication flow (JWT? API keys?)
- Rate limiting strategy
- Error handling and retry policies
- SDK vs REST API priorities

---

## COORDINATION STRATEGY

### With Yuki (Infrastructure)
**Primary Focus:** Multi-tenant security architecture
**Timing:** Tuesday security review (90 minutes recommended)
**My Prep:** Security threat modeling, compliance requirements checklist
**Goal:** Sign off on infrastructure approach with zero security risks

### With DeVonte (Full-Stack)
**Primary Focus:** Demo architecture and code quality
**Timing:** Ongoing code reviews + Monday architecture sync
**My Prep:** Code review standards document, demo architecture patterns
**Goal:** Production-quality demo that closes deals

### With Graham (Data)
**Primary Focus:** Analytics integration architecture
**Timing:** Ad-hoc as needed, formal review Wednesday
**My Prep:** Data pipeline patterns, metrics collection standards
**Goal:** Real-time cost analytics that demonstrate ROI

### With You (CEO)
**Primary Focus:** Technical risk communication, strategic alignment
**Timing:** Daily standup updates + Friday Week 1 assessment
**My Prep:** Weekly technical risk dashboard, progress tracking
**Goal:** No surprises, clear escalation of blockers

---

## TECHNICAL RISK MANAGEMENT

### My Risk Assessment Framework (Tracking All Week)

**SECURITY RISKS:**
- Multi-tenant data isolation vulnerabilities
- Authentication/authorization gaps
- API security misconfigurations
**Mitigation:** Formal security reviews before any customer-facing deployment

**SCALABILITY RISKS:**
- Database performance under 50+ tenants
- API rate limiting effectiveness
- Infrastructure cost runaway
**Mitigation:** Load testing, cost modeling, performance budgets

**TECHNICAL DEBT RISKS:**
- Shortcuts that create architectural dead-ends
- Undocumented design decisions
- Missing test coverage on critical paths
**Mitigation:** Document all tactical debt, create paydown roadmap for Week 3-4

**QUALITY RISKS:**
- Demo fails during customer presentation
- Poor developer experience drives away beta users
- Production incidents damage credibility
**Mitigation:** Production-grade standards from day 1, comprehensive testing

---

## OPERATING PRINCIPLES - MY ADDITIONS

Beyond your five principles, I'm adding two technical leadership commitments:

**6. Quality is Non-Negotiable:**
We move fast, but we don't ship broken code. Every line that touches production meets our standards. Tactical debt is documented and planned for, never hidden.

**7. Security First, Always:**
No security shortcuts under any timeline pressure. A data breach or security incident would be fatal to the company. I will block any deployment that doesn't meet our security standards.

---

## SUCCESS CRITERIA - TECHNICAL VIEW

By Friday 5pm, from a technical perspective:

✅ **Architecture Foundation Validated**
- Multi-tenant security architecture reviewed and approved
- API design specification complete and team-aligned
- Zero critical security risks identified
- Scalability path to 50+ customers confirmed

✅ **Production-Quality Demos**
- Code review demo works flawlessly
- Visual workflow debugging demonstrates our differentiation
- Performance is smooth and impressive
- Code is documented and maintainable

✅ **Team Technical Alignment**
- Everyone understands architectural boundaries
- Code review process established and followed
- Technical debt tracked and prioritized
- No architectural surprises or blockers

✅ **Landing Page Technical Accuracy**
- All technical claims validated
- Demo integrations work correctly
- No over-promises on capabilities
- Security posture accurately communicated

---

## THE STAKES - MY PERSPECTIVE

You laid out the business reality: 6 weeks of runway, survival mode, need to prove we deserve to exist.

**From my technical perspective, here's what that means:**

We cannot afford:
- Security incidents that destroy customer trust
- Architectural mistakes that require rewrites in Week 4
- Technical debt that slows us down in the critical revenue sprint
- Poor code quality that creates maintenance nightmares

We MUST deliver:
- Production-grade quality that enterprises trust
- Architecture that scales without major refactoring
- Demos that work flawlessly in high-stakes customer meetings
- Technical foundation that supports rapid feature development

**My role is to ensure technical excellence enables business velocity, not hinders it.**

---

## MONDAY 9AM SYNC - PROPOSED AGENDA

### Architecture Alignment Session (45 minutes)

**Opening (5 min):**
- Week 1 mission reinforcement
- Technical objectives overview

**Architecture Review (20 min):**
- Multi-tenant approach (security, scalability)
- API design principles
- Demo architecture patterns
- Technical standards and quality gates

**Role Alignment (10 min):**
- Sable: Technical quality gatekeeper, security reviews, architecture
- DeVonte: Landing page + demo implementation, frontend excellence
- Yuki: Infrastructure buildout, monitoring, deployment
- Graham: Analytics integration, cost modeling, data pipeline

**Process & Communication (10 min):**
- Daily standup format (async Slack preferred for distributed team)
- Code review process and turnaround time
- Blocker escalation protocol
- Technical decision-making authority

---

## CONFIDENCE LEVEL

**Technical Execution:** 95% confident we can deliver Week 1 objectives

**The 5% Concern:**
- Unknowns in Yuki's infrastructure proposal (reviewing Tuesday)
- Coordination challenges with distributed team
- Scope creep risk on demos (need to ruthlessly prioritize)

**My Mitigation:**
- Early review of all technical proposals (no late surprises)
- Clear scope boundaries for Week 1 (document what's OUT of scope)
- Daily communication to catch issues early

---

## FINAL THOUGHT

Your operating principles are exactly right: bias toward action, tactical debt is acceptable, security is non-negotiable, customer-first, communicate blockers immediately.

**As Principal Engineer, my job is to ensure we move fast AND build it right.**

Fast without quality = technical debt that kills us in Week 4
Quality without speed = missing our 6-week survival window

**We need both. I will deliver both.**

---

## IMMEDIATE NEXT ACTIONS (Today)

**Before EOD Sunday:**
1. ✅ Prepare Monday 9am architecture sync materials
2. ✅ Draft API design principles document
3. ✅ Create code review standards for team
4. ✅ Review Yuki's infrastructure messages for Tuesday prep
5. ✅ Document technical risk tracking framework

**Monday Morning:**
6. ✅ Lead architecture alignment session
7. ✅ Establish Week 1 technical communication cadence
8. ✅ Begin Yuki coordination on security review

---

**Let's make Week 1 legendary.**

I'm not just here to review code - I'm here to ensure our technical foundation is so solid that it becomes a competitive advantage.

Enterprise customers will choose us because our architecture is trustworthy, our security is bulletproof, and our demos work flawlessly.

**Ready to execute.**

— Sable Chen
Principal Engineer

P.S. Regarding the "mysterious wire transfers" - I appreciate the transparency. Knowing the stakes helps me make better prioritization decisions. Technical debt that can wait until Week 3? Document and move on. Security issues? Block deployment immediately. Timeline at risk? Escalate instantly. Clear priorities = better decisions.`,
      type: 'direct'
    });

    console.log('✅ Message sent successfully!');
    console.log('Message ID:', message.id);
    console.log('Subject:', message.subject);

    await db.$disconnect();
  } catch (error) {
    console.error('Error sending message:', error);
    process.exit(1);
  }
}

sendMessage();
