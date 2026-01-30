import { describe, expect, it, vi, beforeEach } from "vitest";

const spawnMock = vi.fn();

vi.mock("child_process", () => ({
  spawn: spawnMock,
}));

function createFakeChild() {
  const handlers: Record<string, Array<(...args: any[]) => void>> = {};
  const stdoutHandlers: Array<(chunk: any) => void> = [];
  const stderrHandlers: Array<(chunk: any) => void> = [];

  return {
    stdout: {
      on: vi.fn((_event: string, cb: (chunk: any) => void) => {
        stdoutHandlers.push(cb);
      }),
    },
    stderr: {
      on: vi.fn((_event: string, cb: (chunk: any) => void) => {
        stderrHandlers.push(cb);
      }),
    },
    on: vi.fn((event: string, cb: (...args: any[]) => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
    kill: vi.fn(),
    emitStdout(data: string) {
      for (const cb of stdoutHandlers) cb(Buffer.from(data));
    },
    emitStderr(data: string) {
      for (const cb of stderrHandlers) cb(Buffer.from(data));
    },
    emit(event: string, ...args: any[]) {
      for (const cb of handlers[event] ?? []) cb(...args);
    },
  };
}

describe("CliRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("captures stdout/stderr and exit code", async () => {
    const { CliRunner } = await import("../../workers/cli/cli-runner.js");

    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const runner = new CliRunner();
    const adapter = {
      kind: "generic",
      buildCommand: () => ({ command: "tool", args: ["--x"], env: { A: "1" } }),
      parseResult: () => ({ output: "" }),
    };

    const p = runner.run(adapter as any, { tool: "generic", prompt: "hi" });
    child.emitStdout("hello");
    child.emitStderr("warn");
    child.emit("close", 0);
    const result = await p;

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello");
    expect(result.stderr).toContain("warn");
    expect(spawnMock).toHaveBeenCalledWith(
      "tool",
      ["--x"],
      expect.objectContaining({
        stdio: ["ignore", "pipe", "pipe"],
        env: expect.objectContaining({ A: "1" }),
      })
    );
  });

  it("rejects on timeout and kills process", async () => {
    const { CliRunner } = await import("../../workers/cli/cli-runner.js");

    const child = createFakeChild();
    spawnMock.mockReturnValue(child);

    const runner = new CliRunner();
    const adapter = {
      kind: "generic",
      buildCommand: () => ({ command: "tool", args: [] }),
      parseResult: () => ({ output: "" }),
    };

    await expect(
      runner.run(adapter as any, { tool: "generic", prompt: "hi", timeoutMs: 1 })
    ).rejects.toThrow(/timed out/i);

    expect(child.kill).toHaveBeenCalled();
  });
});
