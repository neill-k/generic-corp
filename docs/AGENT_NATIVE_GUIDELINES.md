# Agent-Native Architecture Principles

> Foundational principles for building fully autonomous AI agent systems.
> Based on Every.to (Dan Shipper), Steve Yegge's Gas Town, and Temporal.io patterns.

---

## Core Philosophy

**Dan Shipper**: "Most new software will just be Claude Code in a trench coat."

**Steve Yegge**: "AI agents are ephemeral. Work context should be permanent."

**Temporal.io**: "The longer running your agents are, the more valuable Durable Execution becomes."

---

## Principle 1: TDD Defines "Done"

Agents confidently report completion when things aren't done. Gas Town merged PRs with failing tests because it trusted agent self-reports.

**The fix**: Tests define "done" - not agent claims.

```
Write failing tests → Implement → Tests pass → Done
```

If tests don't pass, the task isn't complete. No exceptions.

---

## Principle 2: Durable Execution

Agent workflows may run for hours or days. They will crash. They must resume from exactly where they stopped.

**Temporal's model**:
- Workflows are deterministic orchestration
- Activities are non-deterministic execution (LLM calls, tool use)
- Event History records every step
- Crash → Replay history → Resume at exact state

This is non-negotiable for autonomous operation.

---

## Principle 3: Hierarchical Autonomy

Flat structures don't scale. A CEO can't manage 22 agents directly.

**Three-tier hierarchy**:
```
CEO (routes work, sets strategy)
 └── Leads (own domain, decide HOW)
      └── Workers (execute tasks, parallelizable)
```

**Key rules**:
- CEO routes to leads only, never to workers directly
- Leads decompose tasks and assign to workers
- Workers don't delegate; they execute
- Results flow up: Worker → Lead → CEO

---

## Principle 4: Verification Over Trust

Never trust an agent's self-report. Always verify externally.

**Examples**:
- "I committed the code" → Check if commit exists in Git
- "Tests pass" → Run tests and verify exit code
- "PR created" → Check GitHub API for PR
- "Task complete" → Run all verification checks

Build verification into the workflow, not as an afterthought.

---

## Principle 5: Scheduled Autonomy

Autonomous operation requires scheduled work. Agents don't work unless triggered.

**Cron cadence**:
- CEO: Daily strategy, weekly planning, monthly OKRs
- Leads: Daily standups, regular queue processing
- Workers: Check inbox every 15 min, resume interrupted work
- System: Health checks, circuit breakers, cleanup

Without cron jobs, the company stops when humans stop watching.

---

## Principle 6: Circuit Breakers

Failing agents burn money and create garbage. Stop them fast.

**Pattern**:
```
3 failures in 5 minutes → Circuit opens → Agent stops
After cooldown → Circuit closes → Agent resumes
```

Implement at both agent and department level. If an entire department is failing, escalate to CEO. If CEO is failing, escalate to human.

---

## Principle 7: Persistent Context

Agent memory is ephemeral. External state is permanent.

**Store externally**:
- Task state in PostgreSQL
- Work records (what was done)
- Conversation history
- Artifacts (commits, PRs, files)

If an agent dies, another can pick up from the last checkpoint.

---

## Principle 8: Quality Gates Over Approval Gates

Human approval blocks autonomy. Automated quality gates enable it.

**Approval gate** (bad): Human must say "yes" before merge
**Quality gate** (good): Code must pass typecheck, lint, tests, coverage

Quality gates are automated, deterministic, and don't wait for humans. Humans review async and can revert if needed.

---

## Principle 9: Peer Review by Agents

Humans can't review every line of code at scale. Agents can.

**Pattern**:
- DeVonte writes code
- Miranda reviews (different agent, same domain)
- If approved → PR gets `agent-approved` label
- Human can still review async (not blocking)

This catches obvious bugs without human bottleneck.

---

## Principle 10: Escalation, Not Failure

When things go wrong, escalate - don't give up.

**Escalation chain**:
```
Agent fails → Retry 3x with context
Still failing → Lead reassigns to backup agent
Still failing → Lead escalates to CEO
Still failing → CEO alerts human
```

Humans are the last resort, not the first response.

---

## Sources

- [Temporal: Durable Execution meets AI](https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai)
- [Every.to: Agent-native Architectures](https://every.to/chain-of-thought/agent-native-architectures-how-to-build-apps-after-the-end-of-code)
- [Gas Town Analysis](https://www.dolthub.com/blog/2026-01-15-a-day-in-gas-town/)
