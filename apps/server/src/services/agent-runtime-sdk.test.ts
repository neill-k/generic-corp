import { describe, expect, it, vi } from "vitest";

import { AgentSdkRuntime } from "./agent-runtime-sdk.js";

type QueryArgs = { prompt: string; options: Record<string, unknown> };

type SdkMessage = unknown;

function asyncIteratorFromArray(items: SdkMessage[]): AsyncIterable<SdkMessage> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) yield item;
    },
  };
}

const queryMock = vi.fn<(args: QueryArgs) => AsyncIterable<SdkMessage>>();

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: (args: QueryArgs) => queryMock(args),
}));

describe("AgentSdkRuntime", () => {
  it("invokes query() with mcp server + permission bypass", async () => {
    queryMock.mockReturnValueOnce(asyncIteratorFromArray([{ type: "result", subtype: "success", result: "ok" }]));
    const runtime = new AgentSdkRuntime();

    const events: unknown[] = [];
    for await (const event of runtime.invoke({
      agentId: "marcus",
      taskId: "t1",
      prompt: "do work",
      systemPrompt: "sys",
      cwd: "/tmp/work",
      mcpServer: { any: "thing" },
      allowedTools: ["Read"],
      model: "sonnet",
    })) {
      events.push(event);
    }

    expect(queryMock).toHaveBeenCalledTimes(1);
    const call = queryMock.mock.calls[0]?.[0];
    expect(call).toBeTruthy();

    expect(call?.prompt).toBe("do work");
    expect(call?.options["systemPrompt"]).toBe("sys");
    expect(call?.options["cwd"]).toBe("/tmp/work");
    expect(call?.options["permissionMode"]).toBe("bypassPermissions");
    expect(call?.options["model"]).toBe("sonnet");
    expect(call?.options["allowedTools"]).toEqual(["Read"]);

    const mcpServers = call?.options["mcpServers"] as Record<string, unknown>;
    const server = mcpServers["generic-corp"] as Record<string, unknown>;
    expect(server["type"]).toBe("sdk");
    expect(server["instance"]).toEqual({ any: "thing" });

    expect(events).toEqual([
      {
        type: "result",
        result: { output: "ok", costUsd: 0, durationMs: 0, numTurns: 0, status: "success" },
      },
    ]);
  });

  it("maps SDK streaming messages into AgentEvent types", async () => {
    queryMock.mockReturnValueOnce(
      asyncIteratorFromArray([
        { type: "thinking", content: "hmm" },
        { type: "assistant", message: "hello" },
        { type: "tool_use", name: "delegate_task", input: { a: 1 } },
        { type: "tool_result", name: "delegate_task", output: { ok: true } },
        { type: "result", subtype: "max_turns", result: { final: true }, total_cost_usd: 1.23, duration_ms: 456, num_turns: 7 },
      ]),
    );

    const runtime = new AgentSdkRuntime();

    const events: unknown[] = [];
    for await (const event of runtime.invoke({
      agentId: "marcus",
      taskId: "t1",
      prompt: "do work",
      systemPrompt: "sys",
      cwd: "/tmp/work",
      mcpServer: {},
    })) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: "thinking", content: "hmm" },
      { type: "message", content: "hello" },
      { type: "tool_use", tool: "delegate_task", input: { a: 1 } },
      { type: "tool_result", tool: "delegate_task", output: JSON.stringify({ ok: true }) },
      {
        type: "result",
        result: { output: JSON.stringify({ final: true }), costUsd: 1.23, durationMs: 456, numTurns: 7, status: "max_turns" },
      },
    ]);
  });

  it("ignores unknown message shapes", async () => {
    queryMock.mockReturnValueOnce(asyncIteratorFromArray([{ type: "nope" }, 123, null]));

    const runtime = new AgentSdkRuntime();
    const events: unknown[] = [];

    for await (const event of runtime.invoke({
      agentId: "marcus",
      taskId: "t1",
      prompt: "do work",
      systemPrompt: "sys",
      cwd: "/tmp/work",
      mcpServer: {},
    })) {
      events.push(event);
    }

    expect(events).toEqual([]);
  });
});
