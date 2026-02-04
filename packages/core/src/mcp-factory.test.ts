import { describe, it, expect } from "vitest";
import { McpServerFactory } from "./mcp-factory.js";
import { HookRunner } from "./hook-runner.js";
import { VaultResolver } from "./vault-resolver.js";

describe("McpServerFactory", () => {
  it("registers and retrieves plugin tools", () => {
    const factory = new McpServerFactory(new HookRunner(), new VaultResolver());

    factory.registerTool({
      name: "custom_tool",
      description: "A custom plugin tool",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ ok: true }),
    });

    const tools = factory.getPluginTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]!.name).toBe("custom_tool");
  });

  it("creates a pipeline for agent/task", () => {
    const factory = new McpServerFactory(new HookRunner(), new VaultResolver());
    const pipeline = factory.createPipeline("agent-1", "task-1");
    expect(pipeline).toBeDefined();
  });

  it("getToolDefinitions returns registered tools as definitions", () => {
    const factory = new McpServerFactory(new HookRunner(), new VaultResolver());
    factory.registerTool({
      name: "tool_a",
      description: "Tool A",
      inputSchema: {},
      handler: async () => "a",
    });
    factory.registerTool({
      name: "tool_b",
      description: "Tool B",
      inputSchema: {},
      handler: async () => "b",
    });

    const defs = factory.getToolDefinitions();
    expect(defs).toHaveLength(2);
    expect(defs.map((d) => d.name)).toEqual(["tool_a", "tool_b"]);
  });
});
