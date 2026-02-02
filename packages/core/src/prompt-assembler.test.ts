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

  it("handles empty context", () => {
    const result = buildSystemPrompt({
      ...baseParams,
      task: { ...baseParams.task, context: "" },
    });
    expect(result).toContain("(none provided)");
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
