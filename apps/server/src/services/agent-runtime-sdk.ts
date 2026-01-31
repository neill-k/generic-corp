import { query } from "@anthropic-ai/claude-agent-sdk";

import type { Options } from "@anthropic-ai/claude-agent-sdk";

import type { AgentEvent, AgentInvocation, AgentResultStatus, AgentRuntime } from "./agent-lifecycle.js";

type SdkMessage = { [key: string]: unknown; type?: unknown };

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mapSdkSubtypeToResultStatus(subtype: unknown): AgentResultStatus {
  if (subtype === "success") return "success";
  if (subtype === "max_turns") return "max_turns";
  return "error";
}

function mapSdkMessageToAgentEvent(message: SdkMessage): AgentEvent | null {
  if (message.type === "assistant" && typeof message["message"] === "string") {
    return { type: "message", content: message["message"] };
  }

  if (message.type === "thinking" && typeof message["content"] === "string") {
    return { type: "thinking", content: message["content"] };
  }

  if (message.type === "tool_use" && typeof message["name"] === "string") {
    return { type: "tool_use", tool: message["name"], input: message["input"] };
  }

  if (message.type === "tool_result" && typeof message["name"] === "string") {
    return {
      type: "tool_result",
      tool: message["name"],
      output: safeStringify(message["output"]),
    };
  }

  if (message.type === "result") {
    const output =
      typeof message["result"] === "string" ? message["result"] : safeStringify(message["result"]);

    const costUsd = typeof message["total_cost_usd"] === "number" ? message["total_cost_usd"] : 0;
    const durationMs = typeof message["duration_ms"] === "number" ? message["duration_ms"] : 0;
    const numTurns = typeof message["num_turns"] === "number" ? message["num_turns"] : 0;

    return {
      type: "result",
      result: {
        output,
        costUsd,
        durationMs,
        numTurns,
        status: mapSdkSubtypeToResultStatus(message["subtype"]),
      },
    };
  }

  return null;
}

export class AgentSdkRuntime implements AgentRuntime {
  async *invoke(params: AgentInvocation): AsyncGenerator<AgentEvent> {
    const options: Record<string, unknown> = {
      systemPrompt: params.systemPrompt,
      cwd: params.cwd,
      mcpServers: {
        "generic-corp": params.mcpServer,
      },
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      model: params.model ?? "sonnet",
      maxTurns: params.maxTurns ?? 10,
    };

    if (params.allowedTools) {
      options["allowedTools"] = params.allowedTools;
    }

    const stream = query({
      prompt: params.prompt,
      options: options as unknown as Options,
    }) as AsyncIterable<unknown>;

    for await (const raw of stream) {
      if (!raw || typeof raw !== "object") continue;
      const event = mapSdkMessageToAgentEvent(raw as SdkMessage);
      if (event) yield event;
    }
  }
}
