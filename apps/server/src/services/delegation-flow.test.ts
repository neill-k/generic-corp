import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { handleChildCompletion } from "./delegation-flow.js";

vi.mock("../db/client.js", () => {
  const mockDb = {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("../queue/agent-queues.js", () => ({
  enqueueAgentTask: vi.fn(),
}));

import { db } from "../db/client.js";
import { enqueueAgentTask } from "../queue/agent-queues.js";

const mockDb = db as unknown as {
  task: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  agent: { findUnique: ReturnType<typeof vi.fn> };
};

const mockEnqueue = enqueueAgentTask as ReturnType<typeof vi.fn>;

describe("handleChildCompletion", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    workspaceRoot = path.join(os.tmpdir(), `gc-delegation-test-${Date.now()}`);
    await mkdir(workspaceRoot, { recursive: true });
  });

  it("writes result to parent agent workspace and enqueues parent", async () => {
    const childTask = {
      id: "child-1",
      parentTaskId: "parent-1",
      assigneeId: "agent-child",
      result: "Analysis complete: revenue is up 15%",
      status: "completed",
    };

    mockDb.task.findUnique.mockResolvedValue({
      id: "parent-1",
      assigneeId: "agent-parent",
      status: "running",
      priority: 1,
    });

    mockDb.agent.findUnique.mockResolvedValue({
      id: "agent-parent",
      name: "marcus",
    });

    await handleChildCompletion(childTask as never, workspaceRoot);

    // Check that result file was written
    const resultsDir = path.join(workspaceRoot, "marcus", ".gc", "results");
    const files = (await import("node:fs/promises")).readdir(resultsDir);
    const fileList = await files;
    expect(fileList).toHaveLength(1);
    expect(fileList[0]).toContain("child-1");

    const content = await readFile(path.join(resultsDir, fileList[0]!), "utf8");
    expect(content).toContain("Analysis complete: revenue is up 15%");

    // Check that parent task was enqueued
    expect(mockEnqueue).toHaveBeenCalledWith({
      agentName: "marcus",
      taskId: "parent-1",
      priority: 1,
    });
  });

  it("does nothing when child has no parent task", async () => {
    const childTask = {
      id: "child-1",
      parentTaskId: null,
      assigneeId: "agent-child",
      result: "Done",
      status: "completed",
    };

    await handleChildCompletion(childTask as never, workspaceRoot);

    expect(mockDb.task.findUnique).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
  });

  it("does nothing when parent task is not found", async () => {
    const childTask = {
      id: "child-1",
      parentTaskId: "parent-gone",
      assigneeId: "agent-child",
      result: "Done",
      status: "completed",
    };

    mockDb.task.findUnique.mockResolvedValue(null);

    await handleChildCompletion(childTask as never, workspaceRoot);

    expect(mockEnqueue).not.toHaveBeenCalled();
  });
});
