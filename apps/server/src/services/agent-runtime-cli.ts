import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

import type { AgentEvent, AgentInvocation, AgentResultStatus, AgentRuntime } from "./agent-lifecycle.js";

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mapSubtypeToStatus(subtype: unknown): AgentResultStatus {
  if (subtype === "success") return "success";
  if (subtype === "max_turns") return "max_turns";
  return "error";
}

export function parseCliJsonLine(line: string): AgentEvent | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || !parsed["type"]) return null;

  if (parsed["type"] === "assistant" && typeof parsed["message"] === "string") {
    return { type: "message", content: parsed["message"] };
  }

  if (parsed["type"] === "tool_use" && typeof parsed["name"] === "string") {
    return { type: "tool_use", tool: parsed["name"], input: parsed["input"] };
  }

  if (parsed["type"] === "tool_result" && typeof parsed["name"] === "string") {
    return {
      type: "tool_result",
      tool: parsed["name"],
      output: safeStringify(parsed["output"]),
    };
  }

  if (parsed["type"] === "result") {
    const output = typeof parsed["result"] === "string" ? parsed["result"] : safeStringify(parsed["result"]);
    const costUsd = typeof parsed["total_cost_usd"] === "number" ? parsed["total_cost_usd"] : 0;
    const durationMs = typeof parsed["duration_ms"] === "number" ? parsed["duration_ms"] : 0;
    const numTurns = typeof parsed["num_turns"] === "number" ? parsed["num_turns"] : 0;

    return {
      type: "result",
      result: {
        output,
        costUsd,
        durationMs,
        numTurns,
        status: mapSubtypeToStatus(parsed["subtype"]),
      },
    };
  }

  return null;
}

export class AgentCliRuntime implements AgentRuntime {
  async *invoke(params: AgentInvocation): AsyncGenerator<AgentEvent> {
    const args = [
      "-p", params.prompt,
      "--output-format", "stream-json",
      "--system-prompt", params.systemPrompt,
    ];

    if (params.model) {
      args.push("--model", params.model);
    }

    const child = spawn("claude", args, {
      cwd: params.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    const rl = createInterface({ input: child.stdout });

    const lineBuffer: string[] = [];
    let resolveNext: ((value: IteratorResult<string>) => void) | null = null;
    let done = false;

    rl.on("line", (line) => {
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve({ value: line, done: false });
      } else {
        lineBuffer.push(line);
      }
    });

    const exitPromise = new Promise<void>((resolve) => {
      child.on("close", () => {
        done = true;
        if (resolveNext) {
          const resolve2 = resolveNext;
          resolveNext = null;
          resolve2({ value: "", done: true });
        }
        resolve();
      });
    });

    child.stderr.on("data", (data: Buffer) => {
      console.error(`[CLI:${params.agentId}] ${data.toString().trim()}`);
    });

    async function nextLine(): Promise<IteratorResult<string>> {
      if (lineBuffer.length > 0) {
        return { value: lineBuffer.shift()!, done: false };
      }
      if (done) {
        return { value: "", done: true };
      }
      return new Promise((resolve) => {
        resolveNext = resolve;
      });
    }

    try {
      while (true) {
        const { value, done: finished } = await nextLine();
        if (finished) break;

        const trimmed = value.trim();
        if (!trimmed) continue;

        const event = parseCliJsonLine(trimmed);
        if (event) yield event;
      }
    } finally {
      rl.close();
      child.kill();
      await exitPromise;
    }
  }
}
