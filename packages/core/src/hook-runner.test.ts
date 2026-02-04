import { describe, it, expect, vi } from "vitest";
import { HookRunner } from "./hook-runner.js";

describe("HookRunner", () => {
  it("runs registered hooks in priority order", async () => {
    const runner = new HookRunner();
    const order: number[] = [];

    runner.tap("onTaskCreated", async (_ctx, next) => {
      order.push(2);
      await next();
    }, 20);

    runner.tap("onTaskCreated", async (_ctx, next) => {
      order.push(1);
      await next();
    }, 10);

    await runner.run("onTaskCreated", { taskId: "t1", assigneeId: "a1", delegatorId: null });
    expect(order).toEqual([1, 2]);
  });

  it("supports short-circuit by not calling next", async () => {
    const runner = new HookRunner();
    const secondHandler = vi.fn();

    runner.tap("beforeToolExecution", async (_ctx, _next) => {
      // Don't call next()
    }, 10);

    runner.tap("beforeToolExecution", async (_ctx, next) => {
      secondHandler();
      await next();
    }, 20);

    await runner.run("beforeToolExecution", {
      agentId: "a1",
      taskId: "t1",
      toolName: "test",
      toolArgs: {},
      skip: false,
    });

    expect(secondHandler).not.toHaveBeenCalled();
  });

  it("allows context mutation (waterfall transform)", async () => {
    const runner = new HookRunner();

    runner.tap("beforeToolExecution", async (ctx, next) => {
      ctx.toolArgs["injected"] = true;
      await next();
    });

    const ctx = {
      agentId: "a1",
      taskId: "t1",
      toolName: "test",
      toolArgs: {} as Record<string, unknown>,
      skip: false,
    };
    await runner.run("beforeToolExecution", ctx);
    expect(ctx.toolArgs["injected"]).toBe(true);
  });

  it("returns unsubscribe function", async () => {
    const runner = new HookRunner();
    const handler = vi.fn(async (_ctx: unknown, next: () => Promise<void>) => { await next(); });
    const unsub = runner.tap("onTaskCompleted", handler);

    await runner.run("onTaskCompleted", { taskId: "t1", status: "completed", result: null });
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    await runner.run("onTaskCompleted", { taskId: "t1", status: "completed", result: null });
    expect(handler).toHaveBeenCalledOnce(); // Still only once
  });

  it("does nothing when no handlers registered", async () => {
    const runner = new HookRunner();
    await expect(
      runner.run("onAgentDeleted", { agentId: "a1" }),
    ).resolves.toBeUndefined();
  });

  it("hasHandlers returns correct result", () => {
    const runner = new HookRunner();
    expect(runner.hasHandlers("onTaskCreated")).toBe(false);
    runner.tap("onTaskCreated", async (_ctx, next) => { await next(); });
    expect(runner.hasHandlers("onTaskCreated")).toBe(true);
  });
});
