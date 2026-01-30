import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../db/index.js", () => ({
  db: {
    agentSession: {
      create: vi.fn(async () => ({ id: "session-1" })),
      update: vi.fn(async () => ({})),
    },
    agent: {
      findUnique: vi.fn(async () => ({
        id: "agent-1",
        name: "Test Agent",
        capabilities: [],
        toolPermissions: {},
      })),
    },
  },
}));

vi.mock("../../workers/cli/cli-runner.js", () => ({
  CliRunner: class {
    run = vi.fn(async () => ({ stdout: "OK\n", stderr: "", exitCode: 0, durationMs: 5 }));
  },
}));

describe("BaseAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes via CLI runner and records session", async () => {
    const { BaseAgent } = await import("../../agents/base-agent.js");
    const { db } = await import("../../db/index.js");
    const mockDb = db as any;

    class TestAgent extends BaseAgent {
      constructor() {
        super({
          name: "Test Agent",
          personalityPrompt: "You are a test agent.",
          capabilities: [],
          toolPermissions: {},
        });
      }
    }

    const agent = new TestAgent();
    const result = await agent.executeTask({
      taskId: "task-1",
      agentId: "agent-1",
      title: "Do thing",
      description: "Please do thing",
      priority: "high",
    });

    expect(result.success).toBe(true);
    expect(result.output).toBe("OK");
    expect(result.toolsUsed).toContain("cli");
    expect(mockDb.agentSession.create).toHaveBeenCalled();
    expect(mockDb.agentSession.update).toHaveBeenCalled();
  });
});
