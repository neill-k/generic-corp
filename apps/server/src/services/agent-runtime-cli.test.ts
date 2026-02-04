import { describe, expect, it, vi, beforeEach } from "vitest";

import { AgentCliRuntime, parseCliJsonLine } from "./agent-runtime-cli.js";

describe("parseCliJsonLine", () => {
  it("parses an assistant message event", () => {
    const event = parseCliJsonLine(JSON.stringify({
      type: "assistant",
      message: "Hello from agent",
    }));
    expect(event).toEqual({ type: "message", content: "Hello from agent" });
  });

  it("parses a tool_use event", () => {
    const event = parseCliJsonLine(JSON.stringify({
      type: "tool_use",
      name: "Read",
      input: { path: "/foo" },
    }));
    expect(event).toEqual({ type: "tool_use", tool: "Read", input: { path: "/foo" } });
  });

  it("parses a tool_result event", () => {
    const event = parseCliJsonLine(JSON.stringify({
      type: "tool_result",
      name: "Read",
      output: "file contents",
    }));
    expect(event).toEqual({ type: "tool_result", tool: "Read", output: "file contents" });
  });

  it("parses a result event", () => {
    const event = parseCliJsonLine(JSON.stringify({
      type: "result",
      result: "Task completed",
      subtype: "success",
      total_cost_usd: 0.05,
      duration_ms: 12000,
      num_turns: 3,
    }));
    expect(event).toEqual({
      type: "result",
      result: {
        output: "Task completed",
        costUsd: 0.05,
        durationMs: 12000,
        numTurns: 3,
        status: "success",
      },
    });
  });

  it("returns null for unknown event types", () => {
    const event = parseCliJsonLine(JSON.stringify({ type: "unknown" }));
    expect(event).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    const event = parseCliJsonLine("not json");
    expect(event).toBeNull();
  });
});

describe("AgentCliRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("implements the AgentRuntime interface", () => {
    const runtime = new AgentCliRuntime();
    expect(typeof runtime.invoke).toBe("function");
  });
});
