import { describe, it, expect } from "vitest";
import { PluginRegistry } from "./plugin-registry.js";
import { GcPlugin } from "@generic-corp/sdk";
import type { PluginManifest } from "@generic-corp/sdk";

function makePlugin(id: string, tags: string[] = []): GcPlugin {
  return new (class extends GcPlugin {
    readonly manifest: PluginManifest = {
      id,
      name: id,
      version: "1.0.0",
      description: `Plugin ${id}`,
      author: "test",
      license: "MIT",
      tags,
    };
  })();
}

describe("PluginRegistry", () => {
  it("registers and retrieves plugins", () => {
    const reg = new PluginRegistry();
    const plugin = makePlugin("test-1");
    reg.register(plugin);
    expect(reg.has("test-1")).toBe(true);
    expect(reg.get("test-1")?.manifest.id).toBe("test-1");
  });

  it("throws on duplicate registration", () => {
    const reg = new PluginRegistry();
    reg.register(makePlugin("dup"));
    expect(() => reg.register(makePlugin("dup"))).toThrow("already registered");
  });

  it("returns undefined for unknown plugin", () => {
    const reg = new PluginRegistry();
    expect(reg.get("missing")).toBeUndefined();
    expect(reg.has("missing")).toBe(false);
  });

  it("filters by tag", () => {
    const reg = new PluginRegistry();
    reg.register(makePlugin("a", ["storage"]));
    reg.register(makePlugin("b", ["vault"]));
    reg.register(makePlugin("c", ["storage", "vault"]));
    expect(reg.getByTag("storage")).toHaveLength(2);
    expect(reg.getByTag("vault")).toHaveLength(2);
    expect(reg.getByTag("missing")).toHaveLength(0);
  });

  it("tracks state transitions", () => {
    const reg = new PluginRegistry();
    reg.register(makePlugin("s1"));
    expect(reg.get("s1")?.state).toBe("registered");
    reg.setState("s1", "initialized");
    expect(reg.get("s1")?.state).toBe("initialized");
    reg.setState("s1", "ready");
    expect(reg.get("s1")?.state).toBe("ready");
  });

  it("throws when setting state for unknown plugin", () => {
    const reg = new PluginRegistry();
    expect(() => reg.setState("missing", "ready")).toThrow("not found");
  });

  it("stores error message on error state", () => {
    const reg = new PluginRegistry();
    reg.register(makePlugin("err-1"));
    reg.setState("err-1", "error", "Something broke");
    expect(reg.get("err-1")?.state).toBe("error");
    expect(reg.get("err-1")?.error).toBe("Something broke");
  });

  it("reports correct size", () => {
    const reg = new PluginRegistry();
    expect(reg.size).toBe(0);
    reg.register(makePlugin("x"));
    expect(reg.size).toBe(1);
    reg.register(makePlugin("y"));
    expect(reg.size).toBe(2);
  });

  it("getAll returns all entries", () => {
    const reg = new PluginRegistry();
    reg.register(makePlugin("a1"));
    reg.register(makePlugin("a2"));
    expect(reg.getAll()).toHaveLength(2);
  });
});
