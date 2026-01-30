import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { runSummarizerOnce, startSummarizer, stopSummarizer } from "./summarizer.js";

vi.mock("../db/client.js", () => {
  const mockDb = {
    task: {
      findMany: vi.fn(),
    },
    agent: {
      findMany: vi.fn(),
    },
  };
  return { db: mockDb };
});

import { db } from "../db/client.js";
import type { AgentRuntime, AgentInvocation, AgentEvent } from "./agent-lifecycle.js";
import type { BoardService } from "./board-service.js";

const mockDb = db as unknown as {
  task: { findMany: ReturnType<typeof vi.fn> };
  agent: { findMany: ReturnType<typeof vi.fn> };
};

function createMockRuntime(output: string): AgentRuntime {
  return {
    async *invoke(_params: AgentInvocation): AsyncGenerator<AgentEvent> {
      yield { type: "result", result: { output, costUsd: 0.001, durationMs: 500, numTurns: 1, status: "success" } };
    },
  };
}

function createMockBoardService(items: unknown[]): BoardService {
  return {
    listBoardItems: vi.fn().mockResolvedValue(items),
    writeBoardItem: vi.fn(),
  } as unknown as BoardService;
}

describe("summarizer", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    workspaceRoot = path.join(os.tmpdir(), `gc-summarizer-test-${Date.now()}`);
    await mkdir(workspaceRoot, { recursive: true });
  });

  it("generates org-wide digest from board items and completed tasks", async () => {
    mockDb.task.findMany.mockResolvedValue([
      { id: "t1", prompt: "Build feature", status: "completed", result: "Feature built", assignee: { name: "noah", department: "Engineering" } },
    ]);
    mockDb.agent.findMany.mockResolvedValue([
      { name: "noah", department: "Engineering" },
      { name: "viv", department: "Product" },
    ]);

    const runtime = createMockRuntime("# Org Digest\n\nAll is well.");
    const boardService = createMockBoardService([
      { author: "marcus", type: "status_update", summary: "Q1 on track", timestamp: new Date().toISOString(), path: "/ws/board/status.md" },
    ]);

    await runSummarizerOnce(runtime, boardService, workspaceRoot);

    const digestPath = path.join(workspaceRoot, "docs", "digests", "org-wide.md");
    const content = await readFile(digestPath, "utf8");
    expect(content).toContain("# Org Digest");
    expect(content).toContain("All is well.");
  });

  it("starts and stops the summarizer interval", () => {
    vi.useFakeTimers();

    const runtime = createMockRuntime("digest");
    const boardService = createMockBoardService([]);

    mockDb.task.findMany.mockResolvedValue([]);
    mockDb.agent.findMany.mockResolvedValue([]);

    startSummarizer(runtime, boardService, workspaceRoot);
    stopSummarizer();

    vi.useRealTimers();
  });
});
