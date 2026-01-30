import { describe, expect, it } from "vitest";

import type { Agent, Task } from "@prisma/client";

import { buildSystemPrompt } from "./prompt-builder.js";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "a1",
    name: "marcus",
    displayName: "Marcus Bell",
    role: "CEO",
    department: "Executive",
    level: "c-suite",
    personality: "You are Marcus.",
    status: "idle",
    currentTaskId: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date("2026-01-01T00:00:00.000Z");
  return {
    id: "t1",
    parentTaskId: null,
    assigneeId: "a1",
    delegatorId: null,
    prompt: "Do the thing",
    context: "Some context",
    priority: 2,
    status: "pending",
    result: null,
    learnings: null,
    costUsd: null,
    durationMs: null,
    numTurns: null,
    createdAt: now,
    startedAt: null,
    completedAt: null,
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes identity, tools, and task briefing", () => {
    const text = buildSystemPrompt({
      agent: makeAgent(),
      task: makeTask(),
      delegatorDisplayName: "Human (via chat)",
      generatedAt: new Date("2026-01-02T03:04:05.000Z"),
    });

    expect(text).toContain("# Agent Identity");
    expect(text).toContain("Marcus Bell");
    expect(text).toContain("You are Marcus.");

    expect(text).toContain("`delegate_task`");
    expect(text).toContain("`finish_task`");
    expect(text).toContain("`query_board`");

    expect(text).toContain("# System Briefing");
    expect(text).toContain("Task ID**: t1");
    expect(text).toContain("Prompt**: Do the thing");
    expect(text).toContain("Some context");
  });

  it("includes pending results section when provided", () => {
    const text = buildSystemPrompt({
      agent: makeAgent(),
      task: makeTask(),
      pendingResults: [
        { childTaskId: "child-1", result: "Revenue report complete" },
        { childTaskId: "child-2", result: "Security audit passed" },
      ],
    });

    expect(text).toContain("Pending Results from Delegated Work");
    expect(text).toContain("Child Task child-1");
    expect(text).toContain("Revenue report complete");
    expect(text).toContain("Child Task child-2");
    expect(text).toContain("Security audit passed");
  });

  it("omits pending results section when empty", () => {
    const text = buildSystemPrompt({
      agent: makeAgent(),
      task: makeTask(),
      pendingResults: [],
    });

    expect(text).not.toContain("Pending Results");
  });
});
