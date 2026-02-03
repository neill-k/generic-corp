import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateThreadSummary } from "./chat-continuity.js";

import type { AgentRuntime, AgentInvocation, AgentEvent } from "./agent-lifecycle.js";

const mockPrisma = {
  message: {
    findMany: vi.fn(),
  },
};

function createMockRuntime(output: string): AgentRuntime {
  return {
    async *invoke(_params: AgentInvocation): AsyncGenerator<AgentEvent> {
      yield { type: "result", result: { output, costUsd: 0.001, durationMs: 200, numTurns: 1, status: "success" } };
    },
  };
}

describe("generateThreadSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a summary of messages since a timestamp", async () => {
    mockPrisma.message.findMany.mockResolvedValue([
      { id: "m1", body: "The feature is ready", fromAgentId: "a1", createdAt: new Date("2025-01-02") },
      { id: "m2", body: "Great, deploying now", fromAgentId: null, createdAt: new Date("2025-01-02T01:00:00") },
    ]);

    const runtime = createMockRuntime("While you were away: feature was deployed.");

    const summary = await generateThreadSummary({
      prisma: mockPrisma as never,
      threadId: "t1",
      since: "2025-01-01T00:00:00Z",
      runtime,
    });

    expect(summary).toBe("While you were away: feature was deployed.");
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          threadId: "t1",
          createdAt: { gt: expect.any(Date) },
        },
      }),
    );
  });

  it("returns null when no messages since timestamp", async () => {
    mockPrisma.message.findMany.mockResolvedValue([]);

    const runtime = createMockRuntime("summary");
    const summary = await generateThreadSummary({
      prisma: mockPrisma as never,
      threadId: "t1",
      since: "2025-01-01T00:00:00Z",
      runtime,
    });

    expect(summary).toBeNull();
  });
});
