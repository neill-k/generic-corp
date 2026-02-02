import { describe, it, expect, vi } from "vitest";
import { PluginHost } from "./plugin-host.js";
import { GcPlugin, StorageProvider } from "@generic-corp/sdk";
import type { PluginManifest, PluginContext } from "@generic-corp/sdk";

function makePlugin(id: string, overrides: Partial<{
  onRegister: (ctx: PluginContext) => Promise<void>;
  onInitialize: (ctx: PluginContext) => Promise<void>;
  onReady: (ctx: PluginContext) => Promise<void>;
  onShutdown: () => Promise<void>;
}> = {}): GcPlugin {
  return new (class extends GcPlugin {
    readonly manifest: PluginManifest = {
      id,
      name: id,
      version: "1.0.0",
      description: `Plugin ${id}`,
      author: "test",
      license: "MIT",
      tags: [],
    };
    override async onRegister(ctx: PluginContext) { await overrides.onRegister?.(ctx); }
    override async onInitialize(ctx: PluginContext) { await overrides.onInitialize?.(ctx); }
    override async onReady(ctx: PluginContext) { await overrides.onReady?.(ctx); }
    override async onShutdown() { await overrides.onShutdown?.(); }
  })();
}

describe("PluginHost", () => {
  it("registers plugins", () => {
    const host = new PluginHost();
    host.registerPlugin(makePlugin("p1"));
    expect(host.getRegistry().has("p1")).toBe(true);
  });

  it("runs full lifecycle: register → initialize → ready", async () => {
    const order: string[] = [];
    const host = new PluginHost();

    host.registerPlugin(makePlugin("p1", {
      onRegister: async () => { order.push("register"); },
      onInitialize: async () => { order.push("initialize"); },
      onReady: async () => { order.push("ready"); },
    }));

    await host.initializeAll();
    expect(order).toEqual(["register", "initialize", "ready"]);
    expect(host.getRegistry().get("p1")?.state).toBe("ready");
  });

  it("handles plugin error during initialize", async () => {
    const host = new PluginHost();

    host.registerPlugin(makePlugin("bad", {
      onInitialize: async () => { throw new Error("boom"); },
    }));

    await host.initializeAll();
    expect(host.getRegistry().get("bad")?.state).toBe("error");
    expect(host.getRegistry().get("bad")?.error).toBe("boom");
  });

  it("shuts down all plugins", async () => {
    const shutdownCalled = vi.fn();
    const host = new PluginHost();

    host.registerPlugin(makePlugin("p1", {
      onShutdown: async () => { shutdownCalled(); },
    }));

    await host.initializeAll();
    await host.shutdownAll();

    expect(shutdownCalled).toHaveBeenCalledOnce();
    expect(host.getRegistry().get("p1")?.state).toBe("shutdown");
  });

  it("provides plugin config via context", async () => {
    let receivedValue: unknown;
    const host = new PluginHost({
      pluginConfig: { "cfg-plugin": { dbPath: "/tmp/test.db" } },
    });

    host.registerPlugin(makePlugin("cfg-plugin", {
      onRegister: async (ctx) => {
        receivedValue = ctx.config.get<string>("dbPath");
      },
    }));

    await host.initializeAll();
    expect(receivedValue).toBe("/tmp/test.db");
  });

  it("provides logger to plugins", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const host = new PluginHost();

    host.registerPlugin(makePlugin("log-test", {
      onRegister: async (ctx) => {
        ctx.logger.info("test message");
      },
    }));

    await host.initializeAll();
    expect(logSpy).toHaveBeenCalledWith("[Plugin:log-test]", "test message");
    logSpy.mockRestore();
  });

  it("exposes services, hooks, ui registry", () => {
    const host = new PluginHost();
    expect(host.getServices()).toBeDefined();
    expect(host.getHookRunner()).toBeDefined();
    expect(host.getUiRegistry()).toBeDefined();
    expect(host.getMcpFactory()).toBeDefined();
    expect(host.getVaultResolver()).toBeDefined();
    expect(host.getEventBus()).toBeDefined();
  });

  it("registerService registers and emits event", () => {
    const host = new PluginHost();
    const events: unknown[] = [];
    host.getEventBus().on("service_registered", (e) => events.push(e));

    class TestStorage extends StorageProvider {
      readonly providerId = "ts";
      readonly providerName = "TS";
    }

    host.registerService("storage", new TestStorage(), true);
    expect(host.getServices().has("storage")).toBe(true);
    expect(events).toHaveLength(1);
  });
});
