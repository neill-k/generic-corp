import { describe, it, expect, vi } from "vitest";
import { ToolExecutionPipeline } from "./tool-pipeline.js";
import { HookRunner } from "./hook-runner.js";
import { VaultResolver } from "./vault-resolver.js";
import { VaultProvider } from "@generic-corp/sdk";

class MockVault extends VaultProvider {
  readonly providerId = "mock";
  readonly providerName = "Mock";
  async resolve(name: string) {
    if (name === "API_KEY") return "secret123";
    return undefined;
  }
}

describe("ToolExecutionPipeline", () => {
  it("executes handler with resolved args", async () => {
    const hookRunner = new HookRunner();
    const vaultResolver = new VaultResolver();
    vaultResolver.setVaultProvider(new MockVault());

    const pipeline = new ToolExecutionPipeline(hookRunner, vaultResolver, "agent1", "task1");

    const handler = vi.fn(async (args: Record<string, unknown>) => ({
      content: [{ type: "text", text: `Result: ${args["key"]}` }],
    }));

    const result = await pipeline.executeWithHandler("test_tool", { key: "{{API_KEY}}" }, handler);
    expect(handler).toHaveBeenCalledWith({ key: "secret123" });

    // Result text should have secret scrubbed
    const resultObj = result as { content: Array<{ type: string; text: string }> };
    expect(resultObj.content[0]!.text).toBe("Result: ***REDACTED***");
  });

  it("fires beforeToolExecution hooks", async () => {
    const hookRunner = new HookRunner();
    const vaultResolver = new VaultResolver();

    hookRunner.tap("beforeToolExecution", async (ctx, next) => {
      ctx.toolArgs["injected"] = "value";
      await next();
    });

    const pipeline = new ToolExecutionPipeline(hookRunner, vaultResolver, "a1", "t1");
    const handler = vi.fn(async (args: Record<string, unknown>) => args);

    await pipeline.executeWithHandler("test_tool", { original: true }, handler);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ injected: "value" }));
  });

  it("skips execution when hook sets skip=true", async () => {
    const hookRunner = new HookRunner();
    const vaultResolver = new VaultResolver();

    hookRunner.tap("beforeToolExecution", async (ctx, next) => {
      ctx.skip = true;
      await next();
    });

    const pipeline = new ToolExecutionPipeline(hookRunner, vaultResolver, "a1", "t1");
    const handler = vi.fn();

    const result = await pipeline.executeWithHandler("blocked_tool", {}, handler);
    expect(handler).not.toHaveBeenCalled();

    const resultObj = result as { content: Array<{ type: string; text: string }> };
    expect(resultObj.content[0]!.text).toContain("skipped");
  });

  it("fires afterToolExecution hooks with duration", async () => {
    const hookRunner = new HookRunner();
    const vaultResolver = new VaultResolver();
    let afterDuration = 0;

    hookRunner.tap("afterToolExecution", async (ctx, next) => {
      afterDuration = ctx.durationMs;
      await next();
    });

    const pipeline = new ToolExecutionPipeline(hookRunner, vaultResolver, "a1", "t1");
    await pipeline.executeWithHandler("test", {}, async () => "result");

    expect(afterDuration).toBeGreaterThanOrEqual(0);
  });
});
