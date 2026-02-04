import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { handleChildCompletion } from "./delegation-flow.js";

const mockPrisma = {
  task: {
    findUnique: vi.fn(),
  },
  agent: {
    findUnique: vi.fn(),
  },
};

describe("handleChildCompletion", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    workspaceRoot = path.join(os.tmpdir(), `gc-delegation-test-${Date.now()}`);
    await mkdir(workspaceRoot, { recursive: true });
  });

  it("writes result to parent agent workspace", async () => {
    const childTask = {
      id: "child-1",
      parentTaskId: "parent-1",
      assigneeId: "agent-child",
      result: "Analysis complete: revenue is up 15%",
      status: "completed",
    };

    mockPrisma.task.findUnique.mockResolvedValue({
      id: "parent-1",
      assigneeId: "agent-parent",
    });

    mockPrisma.agent.findUnique.mockResolvedValue({
      id: "agent-parent",
      name: "marcus",
    });

    await handleChildCompletion(mockPrisma as never, childTask as never, workspaceRoot);

    // Check that result file was written
    const resultsDir = path.join(workspaceRoot, "marcus", ".gc", "results");
    const files = (await import("node:fs/promises")).readdir(resultsDir);
    const fileList = await files;
    expect(fileList).toHaveLength(1);
    expect(fileList[0]).toContain("child-1");

    const content = await readFile(path.join(resultsDir, fileList[0]!), "utf8");
    expect(content).toContain("Analysis complete: revenue is up 15%");
  });

  it("does nothing when child has no parent task", async () => {
    const childTask = {
      id: "child-1",
      parentTaskId: null,
      assigneeId: "agent-child",
      result: "Done",
      status: "completed",
    };

    await handleChildCompletion(mockPrisma as never, childTask as never, workspaceRoot);

    expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
  });

  it("does nothing when parent task is not found", async () => {
    const childTask = {
      id: "child-1",
      parentTaskId: "parent-gone",
      assigneeId: "agent-child",
      result: "Done",
      status: "completed",
    };

    mockPrisma.task.findUnique.mockResolvedValue(null);

    await handleChildCompletion(mockPrisma as never, childTask as never, workspaceRoot);
  });
});
