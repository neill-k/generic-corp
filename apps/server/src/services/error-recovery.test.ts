import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { checkStuckAgents, startStuckAgentChecker, stopStuckAgentChecker } from "./error-recovery.js";

vi.mock("./app-events.js", () => ({
  appEventBus: { emit: vi.fn() },
}));

import { appEventBus } from "./app-events.js";

const mockPrisma = {
  agent: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  task: {
    update: vi.fn(),
  },
};
const mockEventBus = appEventBus as unknown as { emit: ReturnType<typeof vi.fn> };

describe("error-recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkStuckAgents", () => {
    it("resets agents that have been running beyond the timeout", async () => {
      const stuckTime = new Date(Date.now() - 35 * 60_000); // 35 min ago
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus", currentTaskId: "t1", updatedAt: stuckTime },
      ]);
      mockPrisma.agent.update.mockResolvedValue({ id: "a1", name: "marcus" });
      mockPrisma.task.update.mockResolvedValue({ id: "t1" });

      const count = await checkStuckAgents(mockPrisma as never);

      expect(count).toBe(1);
      expect(mockPrisma.agent.update).toHaveBeenCalledWith({
        where: { id: "a1" },
        data: { status: "idle", currentTaskId: null },
      });
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: "t1" },
        data: { status: "failed", result: expect.stringContaining("stuck") },
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith("agent_status_changed", { agentId: "marcus", status: "idle", orgSlug: "default" });
      expect(mockEventBus.emit).toHaveBeenCalledWith("task_status_changed", { taskId: "t1", status: "failed", orgSlug: "default" });
    });

    it("does nothing when no agents are stuck", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([]);

      const count = await checkStuckAgents(mockPrisma as never);

      expect(count).toBe(0);
      expect(mockPrisma.agent.update).not.toHaveBeenCalled();
    });

    it("skips agents with no current task", async () => {
      const stuckTime = new Date(Date.now() - 35 * 60_000);
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus", currentTaskId: null, updatedAt: stuckTime },
      ]);

      const count = await checkStuckAgents(mockPrisma as never);

      expect(count).toBe(0);
      expect(mockPrisma.agent.update).not.toHaveBeenCalled();
    });
  });

  describe("startStuckAgentChecker / stopStuckAgentChecker", () => {
    afterEach(() => {
      stopStuckAgentChecker();
    });

    it("starts and stops the interval", () => {
      mockPrisma.agent.findMany.mockResolvedValue([]);

      startStuckAgentChecker(mockPrisma as never);
      stopStuckAgentChecker();

      // No error thrown means success
    });
  });
});
