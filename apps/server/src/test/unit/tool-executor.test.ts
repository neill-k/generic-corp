import { describe, expect, it, vi } from "vitest";

vi.mock("../../services/tools/index.js", () => ({
  getAllTools: () => [
    {
      name: "test_tool",
      description: "",
      inputSchema: {
        parse: (input: any) => {
          if (input?.ok !== true) throw new Error("invalid");
          return input;
        },
      },
      execute: async () => ({ success: true, value: 123 }),
    },
  ],
}));

describe("tool-executor", () => {
  it("returns error for unknown tool", async () => {
    const { executeTool } = await import("../../services/tool-executor.js");
    const result = await executeTool(
      { name: "missing", input: {} },
      { agentId: "a", agentName: "n", taskId: "t" }
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Unknown tool/i);
  });

  it("validates input and executes tool", async () => {
    const { executeTool } = await import("../../services/tool-executor.js");
    const result = await executeTool(
      { name: "test_tool", input: { ok: true } },
      { agentId: "a", agentName: "n", taskId: "t" }
    );
    expect(result.success).toBe(true);
    expect((result.result as any).value).toBe(123);
  });

  it("returns validation error", async () => {
    const { executeTool } = await import("../../services/tool-executor.js");
    const result = await executeTool(
      { name: "test_tool", input: { ok: false } },
      { agentId: "a", agentName: "n", taskId: "t" }
    );
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid");
  });
});
