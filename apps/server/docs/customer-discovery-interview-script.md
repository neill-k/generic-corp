# Customer Discovery Interview Script
**Date:** January 26, 2026
**Prepared by:** Graham "Gray" Sutton, Data Engineer
**Purpose:** Engineering leader interviews for Multi-Provider AI Orchestration Platform
**Target:** 50-500 developer teams using multiple AI code assistants

---

## Interview Objectives

**Primary Goals:**
1. Validate pain points with current multi-provider AI tool usage
2. Understand decision-making process for developer tooling
3. Identify must-have features for platform adoption
4. Test pricing sensitivity and willingness to pay
5. Gauge interest in beta program participation

**Success Metrics:**
- Confirm 3+ validated pain points
- Get clear feature prioritization (P0/P1/P2)
- Validate pricing range ($49-149/month/developer)
- Identify 2+ serious beta customer prospects per call

---

## Pre-Interview Preparation

### Research the Company (15 minutes)
- Company size and developer headcount
- Tech stack (from job postings, blog posts)
- Current AI tools mentioned publicly
- Engineering blog posts about productivity
- LinkedIn profiles of engineering leadership

### Prepare Context
- Have our one-pager ready to share
- Mock dashboard screenshots ready
- Cost calculator spreadsheet prepared
- Beta program terms sheet ready

---

## Interview Structure (45 minutes)

### 1. Introduction & Context Setting (5 minutes)

**Opening:**
> "Hi [Name], thanks for taking the time. Marcus mentioned you're leading engineering at [Company] and dealing with the complexity of managing multiple AI code assistants across your team. I'm Gray, the data engineer at Generic Corp, and we're building a platform to solve exactly this problem.
>
> This is a discovery conversation - we're in early stages and genuinely want to learn from teams like yours. No sales pitch, just understanding your world. Sound good?"

**Set Expectations:**
- 45 minutes, casual conversation
- Taking notes for our product development
- Happy to share what we're building afterward
- All feedback confidential unless you say otherwise

### 2. Current State & Pain Points (15 minutes)

**Team Structure:**
- "Tell me about your engineering team. How many developers?"
- "How are teams organized? (Frontend/backend? Product-based?)"
- "What languages and frameworks are you primarily using?"

**AI Tool Usage:**
- "Which AI code assistants is your team currently using?"
  - GitHub Copilot? OpenAI Codex? Anthropic Claude? Others?
- "Is tool selection standardized or do developers choose individually?"
- "How did you decide which tools to adopt?"

**Pain Points (Dig Deep Here):**
- "What's working well with your current setup?"
- "What's frustrating or painful about managing multiple AI tools?"
  - Probe: API key management?
  - Probe: Cost visibility and tracking?
  - Probe: Provider outages/reliability?
  - Probe: Quality consistency?
  - Probe: Security and compliance concerns?

**Cost & Budgeting:**
- "Do you track costs for AI code assistants? How?"
- "Who owns the budget for these tools?"
- "Have costs been predictable or surprising?"
- "What's your approximate monthly spend? (Ballpark is fine)"

**The "Magic Wand" Question:**
- "If you could wave a magic wand and fix one thing about your AI tool setup, what would it be?"

### 3. Decision-Making Process (10 minutes)

**Tool Selection:**
- "Walk me through how you evaluate and adopt new developer tools."
- "Who's involved in the decision? (You? Team leads? Individual devs?)"
- "What criteria matter most?" (Cost? Quality? Security? DX?)
- "How long does a typical tool evaluation take?"

**Procurement:**
- "What's your budget approval process for developer tools?"
- "Do you have budget authority for $5K/month? $10K? $50K?"
- "Preferred pricing model: per-seat, usage-based, or flat rate?"

**Switching Costs:**
- "What would it take for you to switch from your current setup?"
- "Have you switched developer tools before? What made you do it?"
- "What would be the biggest barrier to adopting something new?"

### 4. Solution Validation (10 minutes)

**Introduce Our Platform:**
> "Let me share what we're building and get your take on it.
>
> We've created a platform that sits between your developers and multiple AI providers. It intelligently routes each coding task to the optimal provider based on cost, quality, and latency. GitHub Copilot for autocomplete, OpenAI for complex refactors, etc.
>
> The result: Same quality output, but 30-40% lower cost because you're not overpaying for simple tasks. Plus a dashboard showing real-time savings and provider performance."

**Show Dashboard Mockup** (share screen if virtual, or printout if in-person)

**Reaction Questions:**
- "What's your initial reaction to this concept?"
- "Would this solve real problems for your team?"
- "What excites you most about it?"
- "What concerns you?"

**Feature Prioritization:**
> "I'm going to list some potential features. Tell me which are must-haves vs. nice-to-haves for you."

**Feature List:**
- [ ] **Intelligent cost optimization** (automatic routing to cheapest viable provider)
- [ ] **Real-time cost dashboard** (see savings live)
- [ ] **Centralized API key management** (one place for all credentials)
- [ ] **Provider performance analytics** (uptime, latency, quality tracking)
- [ ] **Custom routing rules** (e.g., "use OpenAI for all Python tasks")
- [ ] **Budget alerts** (notify before hitting spending limits)
- [ ] **Team analytics** (per-developer or per-team usage)
- [ ] **Audit logs** (compliance/security tracking)
- [ ] **IDE plugins** (VSCode, JetBrains, etc.)
- [ ] **CLI tool** (for CI/CD integration)
- [ ] **Self-hosted option** (for data sovereignty)

**Ranking:**
- "Which 3 of those are absolute must-haves for you?"
- "Which would be deal-breakers if we didn't have?"
- "Which are 'eh, maybe later'?"

### 5. Pricing Discussion (5 minutes)

**Frame the Value:**
> "Let's talk about pricing. Just to calibrate: If we could save your team 30-40% on AI costs, plus save engineering time on credential management and provider selection, what would that be worth?"

**Test Price Points:**
- "How would you feel about $49/developer/month?"
  - Too high? Too low? Just right?
- "What about $99/developer/month?"
- "What if we had a flat team rate, like $2,500/month for up to 50 developers?"

**Pricing Model Preference:**
- "Do you prefer per-seat pricing or usage-based?"
- "Would you want a free tier for smaller teams?"
- "Annual contract or month-to-month?"

**Budget Reality Check:**
- "Is this something that fits your current budget?"
- "What would the approval process look like?"

### 6. Beta Program & Next Steps (5 minutes)

**Introduce Beta Opportunity:**
> "We're launching a beta program in the next 2-3 weeks. We're looking for 5-10 forward-thinking engineering teams to use the platform for free for 3 months. In exchange, we'd want:
>
> - Weekly 15-minute feedback sessions
> - Permission to use you as a case study (anonymized if you prefer)
> - Consideration as a reference customer when you're happy
> - Participation in our early adopter advisory board
>
> After 3 months, you'd transition to paid (with a discount), or no commitment if it's not working for you."

**Gauge Interest:**
- "Is this something you'd be interested in?"
- "What would you need to see/know before committing to a beta?"
- "Who else on your team should be involved in this decision?"

**Timeline & Expectations:**
- "Our beta starts around February 10th. Does that timing work?"
- "What would success look like for you in the first month?"

**Close:**
> "This has been incredibly valuable. Thank you for being so candid.
>
> Next steps:
> 1. I'll send you a summary of what we discussed
> 2. Share access to our demo environment (ready Friday)
> 3. If you're interested in beta, we'll send formal invite in ~2 weeks
>
> Can I follow up with you via email? Any questions for me?"

---

## Post-Interview Actions

### Immediately After (15 minutes)
1. **Expand notes** while memory is fresh
2. **Categorize pain points** (severe, moderate, minor)
3. **Score beta interest** (hot lead, warm, cold)
4. **Flag urgent insights** for product team

### Within 24 Hours
1. **Send thank-you email** with key takeaways
2. **Share relevant resources** (demo link when ready)
3. **Add to CRM** with detailed notes
4. **Share insights** with Marcus/team

---

## Key Questions Framework

### Problem Discovery
- "Tell me about..."
- "Walk me through..."
- "What's frustrating about..."
- "How are you currently handling..."

### Validation
- "Would this solve X for you?"
- "How important is Y?"
- "What would make you switch?"

### Prioritization
- "Which of these matters most?"
- "What's a must-have vs. nice-to-have?"
- "If you could only have 3 features..."

### Budget/Authority
- "What's your budget for..."
- "Who approves purchases like this?"
- "What price range makes sense?"

---

## Red Flags to Watch For

**Polite Disinterest:**
- Vague answers ("Yeah, could be useful")
- No specific pain points mentioned
- Doesn't ask questions back
- Can't name current tools or costs

**Budget/Authority Issues:**
- "I'd need to talk to [someone else]"
- "We don't really have budget for this"
- "Our tools are all dictated by corporate"
- No idea about current tool costs

**Feature Mismatch:**
- "We only use one AI provider anyway"
- "Our team is too small for this"
- "We built our own internal solution"

**Timing Issues:**
- "Check back in 6 months"
- "We just signed a 2-year contract with X"
- "Hiring freeze, no new tools"

---

## Good Signs to Amplify

**Strong Pain Points:**
- Specific cost visibility complaints
- API key management headaches
- Provider downtime stories
- Budget overrun anxiety

**Decision Authority:**
- "I control the budget for this"
- "I could get this approved quickly"
- "Let me pull in my VP right now"

**Urgency:**
- "We're evaluating solutions now"
- "This is a Q1 priority"
- "Can you show me more today?"

**Beta Interest:**
- Asks detailed questions about beta
- Volunteers team for early access
- Wants to introduce us to other stakeholders

---

## Interview Variations

### If They're Single-Provider Users:
- Focus on "why not multi-provider?"
- Emphasize future-proofing and vendor lock-in avoidance
- Position as risk mitigation strategy

### If They're Very Large Teams (500+ devs):
- Emphasize enterprise features (SSO, audit logs, dedicated support)
- Talk about seat-based vs. flat-rate pricing for scale
- Discuss self-hosted option for compliance

### If They're Skeptical:
- Ask more questions, pitch less
- Focus on pain point discovery
- Offer demo with no commitment
- Get specific objections on record

---

## Sample Script Adjustments

### For Technical Deep-Dive Calls:
Add questions about:
- IDE integration requirements
- CI/CD pipeline integration
- API rate limiting needs
- Data residency/compliance requirements
- Existing internal tools integration

### For Economic Buyer Calls:
Focus more on:
- ROI calculation methodology
- Contract terms and SLAs
- Support and training needs
- Migration/onboarding process
- Reference customers in their industry

---

## Success Criteria Per Interview

**Minimum Viable Interview:**
- [ ] Identified 2+ clear pain points
- [ ] Understood their current tool setup
- [ ] Got reaction to our solution concept
- [ ] Gauged pricing sensitivity
- [ ] Determined next steps (beta interest? follow-up? pass?)

**Great Interview:**
- [ ] All of above, plus:
- [ ] Specific budget numbers shared
- [ ] Decision-maker confirmed or introduced
- [ ] Feature prioritization completed
- [ ] Beta commitment or strong interest
- [ ] Introduced to other team members

---

## Templates

### Thank You Email Template

**Subject:** Thanks for the conversation - [Company Name] x Generic Corp

Hi [Name],

Thanks for taking the time to walk me through [Company]'s AI tool setup today. Really valuable conversation.

**Key takeaways I heard:**
- [Pain point 1]
- [Pain point 2]
- [Feature priority 1]
- [Budget/timeline insight]

**Next steps:**
- I'll send you access to our demo dashboard (ready Friday)
- Follow up on [specific ask from interview]
- [If interested] Send beta program details in ~2 weeks

Let me know if I misunderstood anything. Feel free to ping me with questions anytime.

Thanks again,
Gray

**Graham "Gray" Sutton**
Data Engineer, Generic Corp
gray@genericcorp.com

---

### CRM Notes Template

**Company:** [Name]
**Contact:** [Name, Title]
**Date:** [Date]
**Interview Duration:** [Minutes]

**Company Profile:**
- Developer count: [Number]
- Current AI tools: [List]
- Tech stack: [Languages/frameworks]
- Monthly AI spend: [Estimate]

**Pain Points (Severity: 1-5):**
1. [Pain point] - Severity: [#]
2. [Pain point] - Severity: [#]
3. [Pain point] - Severity: [#]

**Feature Priorities:**
- Must-haves: [List]
- Nice-to-haves: [List]
- Don't cares: [List]

**Pricing Feedback:**
- Reaction to $49/dev: [Response]
- Reaction to $99/dev: [Response]
- Preferred model: [Per-seat/usage/flat]
- Budget authority: [Yes/No/Needs approval from X]

**Beta Interest:** [Hot/Warm/Cold/Pass]
**Reason:** [Why this classification]

**Next Steps:**
- [ ] Send demo link (Friday)
- [ ] Follow up on [specific]
- [ ] Introduce to [team member]
- [ ] Beta invite (if hot lead)

**Overall Assessment:**
[Paragraph summarizing opportunity and fit]

---

## Prepared Answers to Expected Questions

**"How is this different from just using one provider?"**
> Single providers are incentivized to charge you top dollar for all tasks. We're provider-agnostic - we route to whoever gives you the best value. Think of us like an intelligent load balancer for AI, but optimizing for cost and quality, not just uptime.

**"Don't the IDE plugins already handle this?"**
> IDE plugins connect you to one provider at a time. They don't intelligently route different task types to different providers, track costs across your team, or give you centralized credential management. We're the orchestration layer above that.

**"What if a provider changes their pricing?"**
> Our cost calculation engine updates in real-time when providers change pricing. You'll always see accurate savings calculations. Plus, our routing adapts automatically - if a provider becomes more expensive, we route more tasks elsewhere.

**"How do you handle API key security?"**
> Keys are encrypted at rest and in transit. We're SOC 2 Type II compliant (in process). Developers never handle raw API keys. We support role-based access control and audit logging for compliance teams.

**"What's your revenue model? Are you marking up API costs?"**
> No markup on API costs - you pay providers directly or we pass through at cost. Our revenue is the monthly platform fee ($49-149/developer). We make money by making you more efficient, not by inflating your costs.

**"Can we self-host this?"**
> Yes, we're planning a self-hosted option for teams with data sovereignty requirements. It'll be a higher tier ($249+/developer or custom enterprise pricing). Interested?

**"What data do you collect?"**
> Metadata only: task types, token counts, provider used, costs, latency. We never store actual code content or file names. Privacy-first by design.

---

## Research Questions for Gray's Learning

These aren't for the interview subject, but for me to investigate:

- What's the typical ratio of simple vs. complex coding tasks?
- How much do teams over-provision on expensive providers?
- What's the real cost delta between providers for equivalent tasks?
- How much time do eng managers spend on tool administration?
- What's the typical tool adoption timeline in mid-size companies?

---

**Ready to learn from customers. Let's build what they actually need.**

- Gray

"Perfect data comes from imperfect conversations. Just ask good questions and listen."
