import { describe, it, expect, vi } from "vitest";
import { ConsoleChatPlugin } from "./console-chat.js";
import type { PluginContext, PluginEventBus } from "@generic-corp/sdk";

function createMockContext(): {
  context: PluginContext;
  emitAgentEvent: (payload: unknown) => void;
} {
  const handlers = new Map<string, Set<(payload: unknown) => void>>();

  const eventBus = {
    on(event: string, handler: (p: unknown) => void) {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
      return () => set.delete(handler);
    },
    emit() { /* not needed for test */ },
  } as unknown as PluginEventBus;

  return {
    context: {
      eventBus,
      services: { get: () => undefined, has: () => false },
      hooks: { tap: () => () => {} },
      ui: {
        registerNavItem: () => {},
        registerPage: () => {},
        registerWidget: () => {},
      },
      logger: {
        info: () => {},
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
      config: {
        get: () => undefined,
        getRequired: () => { throw new Error("not found"); },
      },
    } as unknown as PluginContext,
    emitAgentEvent(payload: unknown) {
      const set = handlers.get("agent_event");
      if (set) {
        for (const handler of set) handler(payload);
      }
    },
  };
}

describe("ConsoleChatPlugin", () => {
  it("has correct manifest", () => {
    const plugin = new ConsoleChatPlugin();
    expect(plugin.manifest.id).toBe("console-chat");
    expect(plugin.manifest.tags).toContain("console");
  });

  it("logs agent messages to stdout", async () => {
    const plugin = new ConsoleChatPlugin();
    const { context, emitAgentEvent } = createMockContext();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await plugin.onReady(context);

    emitAgentEvent({
      agentId: "zara",
      taskId: "t1",
      event: { type: "message", content: "Hello world" },
    });

    expect(logSpy).toHaveBeenCalledWith("[zara] Hello world");
    logSpy.mockRestore();
  });

  it("ignores non-message events", async () => {
    const plugin = new ConsoleChatPlugin();
    const { context, emitAgentEvent } = createMockContext();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await plugin.onReady(context);

    emitAgentEvent({
      agentId: "zara",
      taskId: "t1",
      event: { type: "tool_use", tool: "test", input: {} },
    });

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("stops listening on shutdown", async () => {
    const plugin = new ConsoleChatPlugin();
    const { context, emitAgentEvent } = createMockContext();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await plugin.onReady(context);
    await plugin.onShutdown();

    emitAgentEvent({
      agentId: "zara",
      taskId: "t1",
      event: { type: "message", content: "After shutdown" },
    });

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
