import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { checkStuckAgents, startStuckAgentChecker, stopStuckAgentChecker } from "./error-recovery.js";

vi.mock("../db/client.js", () => {
  const mockDb = {
    agent: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    task: {
      update: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("./app-events.js", () => ({
  appEventBus: { emit: vi.fn() },
}));

import { db } from "../db/client.js";
import { appEventBus } from "./app-events.js";

const mockDb = db as unknown as {
  agent: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  task: { update: ReturnType<typeof vi.fn> };
};
const mockEventBus = appEventBus as unknown as { emit: ReturnType<typeof vi.fn> };

describe("error-recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkStuckAgents", () => {
    it("resets agents that have been running beyond the timeout", async () => {
      const stuckTime = new Date(Date.now() - 35 * 60_000); // 35 min ago
      mockDb.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus", currentTaskId: "t1", updatedAt: stuckTime },
      ]);
      mockDb.agent.update.mockResolvedValue({ id: "a1", name: "marcus" });
      mockDb.task.update.mockResolvedValue({ id: "t1" });

      const count = await checkStuckAgents();

      expect(count).toBe(1);
      expect(mockDb.agent.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { status: "idle", currentTaskId: null },
      });
      expect(mockDb.task.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "failed", result: expect.stringContaining("stuck") },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith("agent_status_changed", { agentId: "marcus", status: "idle" });
      expect(mockEventBus.emit).toHaveBeenCalledWith("task_status_changed", { taskId: "t1", status: "failed" });
    });

    it("does nothing when no agents are stuck", async () => {
      mockDb.agent.findMany.mockResolvedValue([]);

      const count = await checkStuckAgents();

      expect(count).toBe(0);
      expect(mockDb.agent.update).not.toHaveBeenCalled();
    });

    it("skips agents with no current task", async () => {
      const stuckTime = new Date(Date.now() - 35 * 60_000);
      mockDb.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus", currentTaskId: null, updatedAt: stuckTime },
      ]);

      const count = await checkStuckAgents();

      expect(count).toBe(0);
      expect(mockDb.agent.update).not.toHaveBeenCalled();
    });
  });

  describe("startStuckAgentChecker / stopStuckAgentChecker", () => {
    afterEach(() => {
      stopStuckAgentChecker();
    });

    it("starts and stops the interval", () => {
      mockDb.agent.findMany.mockResolvedValue([]);

      startStuckAgentChecker();
      stopStuckAgentChecker();

      // No error thrown means success
    });
  });
});
