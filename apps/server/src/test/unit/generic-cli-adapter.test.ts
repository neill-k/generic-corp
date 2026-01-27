import { describe, expect, it } from "vitest";
import { GenericCliAdapter } from "../../workers/cli/adapters/generic-adapter.js";

describe("GenericCliAdapter", () => {
  it("buildCommand passes prompt via env", async () => {
    const adapter = new GenericCliAdapter();
    const cmd = adapter.buildCommand({
      prompt: "hello",
      cwd: "/tmp",
      timeoutMs: 1,
    });

    expect(cmd.env?.AGENT_PROMPT).toBe("hello");
    expect(cmd.command).toBeDefined();
    expect(Array.isArray(cmd.args)).toBe(true);
  });

  it("buildCommand uses configured args and script", async () => {
    const prevCommand = process.env.GENERIC_CORP_AGENT_CLI_COMMAND;
    const prevArgs = process.env.GENERIC_CORP_AGENT_CLI_ARGS;
    const prevScript = process.env.GENERIC_CORP_AGENT_CLI_SCRIPT;

    process.env.GENERIC_CORP_AGENT_CLI_COMMAND = "tool";
    process.env.GENERIC_CORP_AGENT_CLI_ARGS = "--a --b";
    process.env.GENERIC_CORP_AGENT_CLI_SCRIPT = "echo ok";

    try {
      const adapter = new GenericCliAdapter();
      const cmd = adapter.buildCommand({
        prompt: "hello",
      });

      expect(cmd.command).toBe("tool");
      expect(cmd.args.slice(0, 2)).toEqual(["--a", "--b"]);
      expect(cmd.args.at(-1)).toBe("echo ok");
      expect(cmd.env?.AGENT_PROMPT).toBe("hello");
    } finally {
      process.env.GENERIC_CORP_AGENT_CLI_COMMAND = prevCommand;
      process.env.GENERIC_CORP_AGENT_CLI_ARGS = prevArgs;
      process.env.GENERIC_CORP_AGENT_CLI_SCRIPT = prevScript;
    }
  });

  it("parseResult prefers stdout", async () => {
    const adapter = new GenericCliAdapter();
    const parsed = adapter.parseResult({
      stdout: " out ",
      stderr: " err ",
      exitCode: 0,
      durationMs: 10,
    });

    expect(parsed.output).toBe("out");
    expect(parsed.toolsUsed).toEqual(["cli"]);
  });

  it("parseResult falls back to stderr", async () => {
    const adapter = new GenericCliAdapter();
    const parsed = adapter.parseResult({
      stdout: "   ",
      stderr: " err ",
      exitCode: 1,
      durationMs: 10,
    });

    expect(parsed.output).toBe("err");
  });
});
