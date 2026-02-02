import { describe, it, expect } from "vitest";
import { SystemPromptAssembler, buildSystemPrompt } from "./prompt-assembler.js";
import type { BuildSystemPromptParams } from "./prompt-assembler.js";
import { HookRunner } from "./hook-runner.js";

const baseParams: BuildSystemPromptParams = {
  agent: {
    role: "Lead Engineer",
    department: "Engineering",
    personality: "Focused and methodical",
    displayName: "Zara Chen",
    name: "zara",
    level: "lead",
  },
  task: {
    id: "task-1",
    prompt: "Review the deployment",
    priority: 1,
    context: "Production deploy needed",
    delegatorId: null,
    parentTaskId: null,
  },
  generatedAt: new Date("2025-01-01T00:00:00Z"),
};

describe("buildSystemPrompt", () => {
  it("includes agent identity", () => {
    const result = buildSystemPrompt(baseParams);
    expect(result).toContain("Lead Engineer");
    expect(result).toContain("Engineering");
    expect(result).toContain("Zara Chen");
  });

  it("includes task info", () => {
    const result = buildSystemPrompt(baseParams);
    expect(result).toContain("task-1");
    expect(result).toContain("Review the deployment");
    expect(result).toContain("Production deploy needed");
  });

  it("includes manager when provided", () => {
    const result = buildSystemPrompt({
      ...baseParams,
      manager: { name: "Marcus", role: "VP", status: "idle" },
    });
    expect(result).toContain("Marcus");
    expect(result).toContain("VP");
  });

  it("includes org reports when provided", () => {
    const result = buildSystemPrompt({
      ...baseParams,
      orgReports: [
        { name: "kai", role: "IC", status: "running", currentTask: "coding" },
      ],
    });
    expect(result).toContain("kai");
  });

  it("includes skills when provided", () => {
    const result = buildSystemPrompt({
      ...baseParams,
      skills: ["review"],
    });
    expect(result).toContain("Code Review");
  });

  it("includes context health warning when provided", () => {
    const result = buildSystemPrompt({
      ...baseParams,
      contextHealthWarning: "Context is getting large",
    });
    expect(result).toContain("Context is getting large");
  });

  it("includes delete_thread tool", () => {
    const result = buildSystemPrompt(baseParams);
    expect(result).toContain("`delete_thread` — Delete a thread and all its messages");
  });

  it("handles empty context", () => {
    const result = buildSystemPrompt({
      ...baseParams,
      task: { ...baseParams.task, context: "" },
    });
    expect(result).toContain("(none provided)");
  });
});

describe("buildSystemPrompt (main agent)", () => {
  const mainParams: BuildSystemPromptParams = {
    agent: {
      role: "User Assistant",
      department: "System",
      personality: "You are the user's personal assistant for Generic Corp.",
      displayName: "Assistant",
      name: "main",
      level: "system",
    },
    task: {
      id: "task-main-1",
      prompt: "Review the deployment",
      priority: 1,
      context: "User asked to review deployment",
      delegatorId: null,
      parentTaskId: null,
    },
    generatedAt: new Date("2025-01-01T00:00:00Z"),
  };

  it("produces main agent identity (not corporate framing)", () => {
    const result = buildSystemPrompt(mainParams);
    expect(result).toContain("personal assistant");
    expect(result).not.toContain("Agent Identity");
    expect(result).not.toContain("Communication & Delegation Rules");
    expect(result).not.toContain("follow corporate chain-of-command");
  });

  it("includes org overview when provided", () => {
    const result = buildSystemPrompt({
      ...mainParams,
      orgOverview: [
        {
          name: "marcus",
          displayName: "Marcus Bell",
          role: "CEO",
          department: "Executive",
          level: "c-suite",
          status: "idle",
          currentTask: null,
          reportsTo: null,
        },
      ],
    });
    expect(result).toContain("Marcus Bell");
    expect(result).toContain("CEO");
  });

  it("can delegate to any agent", () => {
    const result = buildSystemPrompt(mainParams);
    expect(result).toContain("delegate to **any** agent");
  });

  it("includes tools documentation", () => {
    const result = buildSystemPrompt(mainParams);
    expect(result).toContain("delegate_task");
    expect(result).toContain("send_message");
  });
});

describe("SystemPromptAssembler", () => {
  it("builds prompt without hook runner", async () => {
    const assembler = new SystemPromptAssembler();
    const result = await assembler.build(baseParams);
    expect(result).toContain("Lead Engineer");
  });

  it("fires beforePromptBuild hook", async () => {
    const hookRunner = new HookRunner();
    hookRunner.tap("beforePromptBuild", async (ctx, next) => {
      ctx.extraSections.push("## Custom Section\nPlugin-injected content");
      await next();
    });

    const assembler = new SystemPromptAssembler(hookRunner);
    const result = await assembler.build(baseParams);
    expect(result).toContain("Plugin-injected content");
  });

  it("fires afterPromptBuild hook", async () => {
    const hookRunner = new HookRunner();
    hookRunner.tap("afterPromptBuild", async (ctx, next) => {
      ctx.systemPrompt = ctx.systemPrompt + "\n\n## Appended by hook";
      await next();
    });

    const assembler = new SystemPromptAssembler(hookRunner);
    const result = await assembler.build(baseParams);
    expect(result).toContain("Appended by hook");
  });
});
