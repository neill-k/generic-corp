# Show HN Launch Post - Draft

**Target Date**: Week 2 (Tuesday, February 4, 2026 at 8am PT)
**Platform**: Hacker News
**Goal**: 100+ upvotes, 50+ comments, 50+ signups

---

## Title Options (Pick Best)

**Option 1** (Clear & Direct):
`Show HN: AgentHQ – Visual orchestration for multi-agent AI systems`

**Option 2** (More Specific):
`Show HN: AgentHQ – Manage AI agent teams with an isometric game interface`

**Option 3** (Problem-Focused):
`Show HN: AgentHQ – Making multi-agent AI systems less chaotic`

**Option 4** (Technical):
`Show HN: Open-source platform for orchestrating multi-agent AI workflows`

**RECOMMENDATION**: Option 1 - Clear, describes what it is, includes key differentiator

---

## Post Body

### Version 1: Story-First Approach

```
Hey HN! I'm Marcus, CEO of Generic Corp.

TL;DR: We built a visual orchestration platform for multi-agent AI systems. It's like mission control for AI agents - you can see them working in real-time through an isometric game interface.

Demo: https://demo.agenthq.com
GitHub: https://github.com/generic-corp/agenthq
Docs: https://docs.agenthq.com

## The Story

My team built an incredible multi-agent orchestration system for internal use - BullMQ queues, Claude Agent SDK integration, real-time monitoring, isometric visualization. It was beautiful and actually worked.

But we had zero revenue and 6 weeks of runway.

Then I realized: we'd accidentally built a $50M product. Managing multiple AI agents is genuinely chaotic - you can't see what they're doing, debugging is a nightmare, and building the infrastructure takes months.

So we decided to package what we built and see if other developers find it useful.

## What It Does

AgentHQ lets you:
- **Orchestrate** multiple AI agents visually (no more grep-ing logs)
- **Monitor** agents in real-time with an isometric game interface
- **Deploy** with production-grade infrastructure (BullMQ, Redis, Postgres)
- **Build** on Claude Agent SDK with our API
- **Self-host** (open-source core) or use our managed cloud

## Tech Stack

- Frontend: Phaser 3 (isometric rendering), React, Socket.io
- Backend: Express, BullMQ, Prisma, PostgreSQL, Redis
- AI: Claude Agent SDK (Anthropic)
- Everything: TypeScript, monorepo (pnpm)

## Why This Exists

Existing multi-agent frameworks (LangChain, CrewAI, AutoGPT) are code-first and CLI-based. You write a script, run it, and hope it works. When something goes wrong, you're debugging blind.

We made it visual-first. See your agents, see their state, see what they're doing. The isometric view is inspired by games like SimCity - complex systems become intuitive when you can see them.

## What's Different

1. **Visual Orchestration**: Only platform with real-time isometric visualization
2. **Production Ready**: Built-in queues, monitoring, reliability (not a toy)
3. **Self-Hostable**: Open-source core, deploy anywhere
4. **Developer Friendly**: Simple API, examples, great docs

## Current State

- ✅ Core platform works (we use it ourselves)
- ✅ Claude Agent SDK integration
- ✅ Real-time monitoring via WebSocket
- ✅ Docker deployment
- ⏳ Documentation (in progress)
- ⏳ Example use cases (3 coming this week)
- ⏳ Cloud hosted version (Week 2)

## Business Model

- Free: Self-hosted (open source)
- Starter: $49/mo (managed cloud, 5 agents)
- Pro: $149/mo (20 agents, priority support)
- Enterprise: Custom (on-premise, SLA)

## What We Need

Honest feedback from people building with AI agents:
- Does this solve a real problem for you?
- Is the visual approach helpful or just flashy?
- What's missing?
- Would you actually use this?

We're at the "make or break" stage - 6 weeks to prove this can be a business. So we're shipping fast and iterating based on real user feedback.

Try it out, break it, tell us what you think!

Demo: https://demo.agenthq.com
GitHub: https://github.com/generic-corp/agenthq

Happy to answer questions!

- Marcus
```

---

### Version 2: Technical-First Approach

```
Hey HN! We built a visual orchestration platform for multi-agent AI systems.

Live Demo: https://demo.agenthq.com
GitHub: https://github.com/generic-corp/agenthq
Docs: https://docs.agenthq.com

## What Problem Does This Solve?

If you've worked with LangChain, AutoGPT, or CrewAI, you know: coordinating multiple AI agents is messy. You write code, agents run, something breaks, and you're grep-ing logs trying to figure out what happened.

AgentHQ makes this visual. You see agents working in real-time through an isometric interface (think SimCity for AI workflows).

## Architecture

**Frontend:**
- Phaser 3 for isometric rendering
- React for UI components
- Socket.io for real-time updates
- Zustand for state management

**Backend:**
- Express API server
- BullMQ for reliable task queuing
- Prisma ORM + PostgreSQL
- Redis for queues and caching
- Claude Agent SDK for AI execution

**Infrastructure:**
- Docker Compose for local dev
- Self-hostable (open source core)
- Cloud managed option (coming soon)

## Key Features

1. **Visual Orchestration** - See agents as they work
2. **Real-Time Monitoring** - WebSocket updates, no polling
3. **Production Queue** - BullMQ handles retries, failures
4. **Multi-Tenant** - Isolated workspaces (roadmap)
5. **Self-Hostable** - Run on your infrastructure

## Current State

This started as an internal tool. We built it to manage our own AI agent team. It works well enough that we decided to open-source the core and offer a managed version.

Still early:
- Core platform: ✅ Stable
- Documentation: ⏳ In progress
- Cloud hosting: ⏳ Week 2
- Examples: ⏳ 3 use cases coming

## Business Model

- Open source core (self-hosted, free)
- Managed cloud ($49-$149/mo)
- Enterprise (on-premise, custom)

## Try It

1. Clone: `git clone https://github.com/generic-corp/agenthq`
2. Run: `pnpm install && pnpm docker:up && pnpm dev`
3. Open: http://localhost:5173

Or try the demo: https://demo.agenthq.com

Looking for feedback from anyone building multi-agent systems. What would make this actually useful for you?

- Marcus (marcus@genericcorp.io)
```

---

### Version 3: Problem-First Approach (RECOMMENDED)

```
Hey HN! We built a visual way to orchestrate multi-agent AI systems.

Demo: https://demo.agenthq.com
GitHub: https://github.com/generic-corp/agenthq

## The Problem

You're building with multiple AI agents. One agent does research, another writes content, a third reviews. They need to coordinate, pass data, handle failures.

You write the code with LangChain/CrewAI, run it, and... what's happening? Which agent is stuck? Where did the data go? You're debugging blind.

## Our Solution

AgentHQ makes multi-agent orchestration visual. You see agents working in an isometric view (think SimCity), with real-time updates, task queues, and coordination all visible.

It's not just a pretty UI - it's built on production infrastructure (BullMQ, Redis, Postgres) with Claude Agent SDK for AI execution.

## Why Visual?

Because complex systems are easier to understand when you can see them.

When your customer support workflow has 5 agents passing tasks in a chain, you want to see:
- Which agent is working
- What tasks are queued
- Where failures happen
- How data flows

CLI tools and log files don't cut it at scale.

## What's Included

- **Orchestration Engine** - BullMQ-based task queue
- **Real-Time Monitoring** - Socket.io updates
- **Isometric View** - Phaser 3 rendering
- **Agent Framework** - Built on Claude Agent SDK
- **Self-Hostable** - Docker Compose deployment
- **Open Source Core** - MIT license

## Tech Stack

TypeScript monorepo with:
- Backend: Express, BullMQ, Prisma, PostgreSQL, Redis
- Frontend: Phaser 3, React, Socket.io, Zustand
- AI: Claude Agent SDK (Anthropic)

## Current Status

**Works Now:**
- ✅ Multi-agent orchestration
- ✅ Visual monitoring
- ✅ Task queuing and retries
- ✅ WebSocket updates
- ✅ Docker deployment

**Coming Soon:**
- 📋 Better documentation
- 📋 Example use cases (customer support, research, content)
- 📋 Cloud managed version
- 📋 Multi-tenant architecture

## Try It

**Self-hosted:**
```bash
git clone https://github.com/generic-corp/agenthq
pnpm install && pnpm docker:up && pnpm dev
open http://localhost:5173
```

**Or try the demo:** https://demo.agenthq.com

## Business Model

- Free: Self-hosted open source
- $49/mo: Managed cloud (5 agents)
- $149/mo: Pro (20 agents, support)
- Custom: Enterprise (on-premise)

## Why We Built This

Started as an internal tool. We needed to manage our own AI agent team and couldn't find anything that made coordination visible. So we built it.

Now we're at a crossroads: make it a product or just open-source it. So we're sharing it with HN to get feedback from people actually building with AI agents.

Does this solve a real problem? Would you use it? What's missing?

Looking forward to your feedback!

- Marcus
```

---

## HN Best Practices

### Timing
- **Best**: Tuesday-Thursday, 8-10am PT
- **Good**: Monday-Friday, 7am-2pm PT
- **Avoid**: Friday afternoon, weekends, holidays

### Title Rules
- Keep under 80 characters
- Start with "Show HN:" (required)
- Be specific, not clickbaity
- Include key technology/approach

### Post Body Rules
- Lead with TL;DR or live links
- Tell the story (HN loves origin stories)
- Be technical (this is an engineering audience)
- Show humility (we're learning, need feedback)
- Include architecture details
- Make it easy to try (demo link, GitHub)
- Ask specific questions
- Respond to ALL comments quickly

### What Works on HN
✅ Solving real problems
✅ Technical depth
✅ Open source / transparency
✅ Humble/honest tone
✅ Interesting tech stack
✅ Clear demo
✅ Responding to feedback

### What Doesn't Work
❌ Pure marketing speak
❌ Vague value props
❌ "Revolutionary" claims
❌ No technical details
❌ Defensive responses to criticism
❌ Ignoring comments

---

## Comment Response Strategy

### If People Like It
- Thank them sincerely
- Ask what use case they have
- Offer early access
- Take feature requests seriously

### If People Are Critical
- Acknowledge valid points
- Explain design decisions (not defensively)
- Ask for suggestions
- Show willingness to iterate

### Common Questions to Prepare For

**Q: "How is this different from LangGraph?"**
A: LangGraph is code-first, CLI-based. We add visual orchestration and production infrastructure. Think of us as complementary - you could use LangGraph for agent logic and AgentHQ for monitoring/coordination.

**Q: "Why not just use [competitor]?"**
A: [Competitor] is great for [use case]. We're focused on visual orchestration. If CLI works for you, stick with it. We're for teams that need to see what their agents are doing at scale.

**Q: "This seems overcomplicated"**
A: Fair point. For simple use cases (1-2 agents), you probably don't need this. We're targeting teams running 5+ agents where coordination becomes chaotic.

**Q: "What's your moat?"**
A: Honestly, not much yet. We're betting on execution and UX. The isometric view is unique now, but could be copied. We plan to build community and ecosystem around it.

**Q: "Is this open source?"**
A: Core platform is open source (MIT). Managed cloud is paid. You can self-host forever for free.

**Q: "Pricing seems high"**
A: Feedback noted! We're still figuring out pricing. What would you expect to pay for managed multi-agent orchestration?

---

## Success Metrics

**Great Launch:**
- 200+ upvotes
- 100+ comments
- Front page for 4+ hours
- 100+ GitHub stars
- 50+ signups

**Good Launch:**
- 100+ upvotes
- 50+ comments
- Front page for 2+ hours
- 50+ GitHub stars
- 25+ signups

**Okay Launch:**
- 50+ upvotes
- 25+ comments
- Front page for 1 hour
- 25+ GitHub stars
- 10+ signups

**Poor Launch:**
- <50 upvotes
- <10 comments
- Never hits front page
- <10 stars
- <5 signups

---

## Follow-Up Actions

**Within 4 hours of posting:**
- Respond to every comment
- Thank people for upvotes
- Fix any broken links
- Deploy emergency fixes if needed

**Within 24 hours:**
- Compile feedback themes
- Create GitHub issues for requests
- Reach out to interested users
- Write follow-up tweet thread

**Within 1 week:**
- Blog post: "What we learned from HN launch"
- Ship top-requested features
- Personal emails to engaged commenters

---

**RECOMMENDATION**: Use Version 3 (Problem-First Approach)

**Why**:
- Leads with pain point (HN loves problem-solving)
- Technical but accessible
- Shows humility (asking for feedback)
- Clear call-to-action (try it, give feedback)
- Honest about business model
- Respects HN's engineering audience

**Ready to post**: Week 2, Tuesday at 8am PT

---

**Last Updated**: January 26, 2026
**Status**: DRAFT - Ready for team review
