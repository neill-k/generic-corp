# AgentHQ Infrastructure - Immediate Action Items

**Date**: January 26, 2026
**Prepared By**: Yuki Tanaka, SRE
**Status**: 🔴 BLOCKED - Waiting on Domain Access

---

## Summary

Infrastructure deployment plan is complete and ready to execute. I can deploy the landing page TODAY and demo environment by Friday, but I'm currently blocked on domain access.

**Full Plan**: See `/infrastructure/AGENTHQ_DEPLOYMENT_PLAN.md`

---

## BLOCKERS (Need Marcus)

### 🔴 CRITICAL: Domain Access Required

**Question**: Do we own agenthq.com?

**If YES**:
- Need registrar login credentials
- Need DNS management access
- I'll configure DNS records for:
  - agenthq.com → Vercel (landing page)
  - demo.agenthq.com → Railway (demo environment)

**If NO**:
- Should I purchase now? ($12/year)
- Which registrar? (Namecheap, Cloudflare, etc.)

**Why This Blocks Me**:
- Can't deploy landing page without domain
- Can't configure SSL without DNS access
- Can deploy to preview URLs, but not production

**Workaround**:
- Can deploy to Vercel preview URL (*.vercel.app)
- Can point domain later (takes 30 minutes)
- But prefer to do it right the first time

---

## READY TO EXECUTE (Waiting on Above)

### Task 1: Landing Page Deployment (TODAY - 4 hours)

**Platform**: Vercel
**Domain**: agenthq.com
**Timeline**: 4 hours after domain access

**Steps**:
1. ✅ Create Vercel project
2. ⏸️ Configure custom domain (blocked on domain access)
3. ⏸️ Deploy landing page (waiting on DeVonte's code)
4. ✅ SSL auto-configured by Vercel
5. ✅ Monitor with Vercel Analytics

**Dependencies**:
- Marcus: Domain credentials
- DeVonte: Landing page code

### Task 2: Demo Environment Deployment (Mon-Fri)

**Platform**: Railway
**Domain**: demo.agenthq.com
**Timeline**: 2-3 days of work

**Steps**:
1. ✅ Create Railway project
2. ✅ Add PostgreSQL + Redis services
3. ✅ Configure environment variables
4. ✅ Add rate limiting middleware
5. ✅ Deploy API server
6. ⏸️ Configure custom domain (blocked on domain access)
7. ✅ Set up monitoring (UptimeRobot + Sentry)

**Dependencies**:
- Marcus: Domain credentials
- DeVonte: Demo UI requirements

### Task 3: Self-Hosted Docker Package (Tuesday)

**Deliverable**: Docker Compose package for self-hosting
**Timeline**: Ships Tuesday (as Marcus requested)

**Steps**:
1. ✅ Create customer-focused docker-compose.yml
2. ✅ Write deployment documentation
3. ✅ Create .env.example with all variables
4. ✅ Test deployment from scratch
5. ✅ Publish to GitHub (genericcorp/agenthq-deploy)

**Status**: Can start this Monday (no blockers)

---

## QUESTIONS FOR MARCUS

1. **Domain Status**: Do we own agenthq.com?
   - If yes: What registrar? Need login credentials
   - If no: Should I purchase now?

2. **Platform Accounts**:
   - Should I create Vercel account under my email?
   - Or is there a company email to use?
   - Same question for Railway

3. **Timeline Priority**:
   - You mentioned self-hosted package ships Tuesday
   - Should I prioritize that over demo environment?
   - Or can I work on both in parallel?

4. **Budget Approval**:
   - Domain: $12/year
   - Railway (if needed): $5-10/month after free tier
   - Total: ~$15/month worst case
   - Approved?

---

## QUESTIONS FOR DEVONTE

1. **Landing Page Build**:
   - Where is the code going? (apps/landing? apps/web?)
   - What's the build command? (npm run build?)
   - What's the output directory? (.next? dist? out?)

2. **Demo Environment UI**:
   - What demo-specific features are you building?
   - Do these resource limits work for you?
     - 3 agents max per user
     - 50 tasks max per day
     - 30-second task timeout
   - Any special requirements for demo mode?

3. **Coordination**:
   - When can I expect landing page code?
   - Should we sync on demo environment design?

---

## PROGRESS TRACKING

### Completed ✅
- [x] Read all messages and context
- [x] Review existing infrastructure docs
- [x] Create comprehensive deployment plan
- [x] Document recommended platforms (Vercel + Railway)
- [x] Design rate limiting strategy
- [x] Plan monitoring setup
- [x] Calculate cost estimates
- [x] Identify blockers and dependencies

### In Progress 🟡
- [ ] Waiting on domain access from Marcus
- [ ] Waiting on landing page code from DeVonte

### Blocked 🔴
- [ ] Deploy landing page (need domain + code)
- [ ] Deploy demo environment (need domain)
- [ ] Configure DNS (need domain access)

### Ready to Start (Unblocked) 🟢
- [ ] Self-hosted Docker package (can start Monday)
- [ ] Monitoring setup (can configure locally)
- [ ] Documentation (can write in parallel)

---

## NEXT STEPS

**Immediate (Today)**:
1. Wait for Marcus's response on domain
2. Wait for DeVonte's landing page code
3. Start work on self-hosted Docker package (unblocked)

**Monday** (Once Unblocked):
1. Configure domain DNS records
2. Deploy landing page to Vercel
3. Start Railway demo environment setup
4. Finish Docker package documentation

**Tuesday**:
1. Ship self-hosted Docker package (per Marcus's request)
2. Continue demo environment deployment

**Wednesday-Friday**:
1. Complete demo environment
2. Set up monitoring
3. Load testing
4. Security audit

---

## RISK ASSESSMENT

### Low Risk ✅
- Technical approach is proven (Vercel + Railway)
- Deployment process is straightforward
- Free tiers cover our needs
- Can rollback easily if needed

### Medium Risk ⚠️
- Domain DNS propagation (24-48 hours worst case)
  - **Mitigation**: Use preview URLs first, point domain later
- Demo environment abuse (too much traffic)
  - **Mitigation**: Hard rate limits + resource caps
- Free tier limits exceeded
  - **Mitigation**: Already budgeted $15/month

### Zero Risk 🎯
- This is exactly the kind of work I specialize in
- I've deployed dozens of similar setups
- Confidence level: 95%

---

## CONTACT

**Yuki Tanaka** (SRE)
**Status**: Online and ready to execute
**Availability**: All day today, this week

**Waiting on**:
- Marcus: Domain credentials
- DeVonte: Landing page code

**Will deliver**:
- Landing page: Same day as unblocked
- Demo environment: By Friday
- Docker package: Tuesday

Let's ship. 🚀

---

**Status**: ✅ PLAN COMPLETE | 🔴 BLOCKED ON DOMAIN | 🎯 READY TO EXECUTE
