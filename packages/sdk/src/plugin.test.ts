import { describe, it, expect } from "vitest";
import { GcPlugin, validateManifest } from "./plugin.js";
import type { PluginManifest, PluginContext } from "./plugin.js";

const validManifest: PluginManifest = {
  id: "test-plugin",
  name: "Test Plugin",
  version: "1.0.0",
  description: "A test plugin",
  author: "Test Author",
  license: "MIT",
  tags: ["test"],
};

class TestPlugin extends GcPlugin {
  readonly manifest = validManifest;
}

describe("GcPlugin", () => {
  it("can be instantiated via concrete subclass", () => {
    const plugin = new TestPlugin();
    expect(plugin.manifest.id).toBe("test-plugin");
    expect(plugin.manifest.name).toBe("Test Plugin");
  });

  it("lifecycle methods return resolved promises by default", async () => {
    const plugin = new TestPlugin();
    const ctx = {} as PluginContext;
    await expect(plugin.onRegister(ctx)).resolves.toBeUndefined();
    await expect(plugin.onInitialize(ctx)).resolves.toBeUndefined();
    await expect(plugin.onReady(ctx)).resolves.toBeUndefined();
    await expect(plugin.onShutdown()).resolves.toBeUndefined();
  });

  it("is an instance of GcPlugin", () => {
    const plugin = new TestPlugin();
    expect(plugin).toBeInstanceOf(GcPlugin);
  });
});

describe("validateManifest", () => {
  it("returns no errors for a valid manifest", () => {
    expect(validateManifest(validManifest)).toEqual([]);
  });

  it("returns errors for missing required fields", () => {
    const errors = validateManifest({
      id: "",
      name: "",
      version: "",
      description: "",
      author: "",
      license: "",
      tags: [],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes("id"))).toBe(true);
  });

  it("returns error for non-array tags", () => {
    const errors = validateManifest({
      ...validManifest,
      tags: "not-an-array" as unknown as string[],
    });
    expect(errors.some((e) => e.includes("tags"))).toBe(true);
  });

  it("returns error for non-array requires", () => {
    const errors = validateManifest({
      ...validManifest,
      requires: "not-an-array" as unknown as string[],
    });
    expect(errors.some((e) => e.includes("requires"))).toBe(true);
  });

  it("accepts valid requires array", () => {
    const errors = validateManifest({
      ...validManifest,
      requires: ["other-plugin"],
    });
    expect(errors).toEqual([]);
  });

  it("accepts undefined requires", () => {
    const manifest = { ...validManifest };
    delete (manifest as Record<string, unknown>)["requires"];
    expect(validateManifest(manifest)).toEqual([]);
  });
});
