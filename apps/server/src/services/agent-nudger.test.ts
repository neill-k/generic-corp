import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { nudgeIdleAgents, startAgentNudger, stopAgentNudger } from "./agent-nudger.js";

vi.mock("./app-events.js", () => ({
  appEventBus: { emit: vi.fn() },
}));

vi.mock("../queue/agent-queues.js", () => ({
  enqueueAgentTask: vi.fn(),
}));

import { appEventBus } from "./app-events.js";
import { enqueueAgentTask } from "../queue/agent-queues.js";

const mockEventBus = appEventBus as unknown as { emit: ReturnType<typeof vi.fn> };
const mockEnqueue = enqueueAgentTask as ReturnType<typeof vi.fn>;

const mockPrisma = {
  agent: {
    findMany: vi.fn(),
  },
  task: {
    count: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  message: {
    count: vi.fn(),
  },
};

describe("agent-nudger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("nudgeIdleAgents", () => {
    it("creates nudge tasks for idle agents with pending work", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus" },
      ]);
      mockPrisma.task.count.mockResolvedValue(3);
      mockPrisma.message.count.mockResolvedValue(2);
      mockPrisma.task.findFirst.mockResolvedValue(null); // no existing nudge
      mockPrisma.task.create.mockResolvedValue({ id: "nudge-t1" });

      const count = await nudgeIdleAgents(mockPrisma as never);

      expect(count).toBe(1);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          assigneeId: "a1",
          delegatorId: null,
          prompt: expect.stringContaining("3 pending tasks"),
          context: expect.stringMatching(/^SYSTEM NUDGE:/),
          priority: -1,
          status: "pending",
        },
      });
      expect(mockEnqueue).toHaveBeenCalledWith({
        orgSlug: "default",
        agentName: "marcus",
        taskId: "nudge-t1",
        priority: -1,
      });
      expect(mockEventBus.emit).toHaveBeenCalledWith("task_created", {
        taskId: "nudge-t1",
        assignee: "marcus",
        delegator: null,
        orgSlug: "default",
      });
    });

    it("skips agents with no pending work", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus" },
      ]);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.message.count.mockResolvedValue(0);

      const count = await nudgeIdleAgents(mockPrisma as never);

      expect(count).toBe(0);
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();
    });

    it("skips agents that already have a pending nudge task", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus" },
      ]);
      mockPrisma.task.count.mockResolvedValue(3);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.task.findFirst.mockResolvedValue({ id: "existing-nudge" });

      const count = await nudgeIdleAgents(mockPrisma as never);

      expect(count).toBe(0);
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it("handles agents with only unread messages", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus" },
      ]);
      mockPrisma.task.count.mockResolvedValue(0);
      mockPrisma.message.count.mockResolvedValue(5);
      mockPrisma.task.findFirst.mockResolvedValue(null);
      mockPrisma.task.create.mockResolvedValue({ id: "nudge-t1" });

      const count = await nudgeIdleAgents(mockPrisma as never);

      expect(count).toBe(1);
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          prompt: expect.stringContaining("5 unread messages"),
        }),
      });
    });

    it("nudges multiple idle agents independently", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus" },
        { id: "a2", name: "sarah" },
      ]);
      // marcus: 2 tasks, 0 messages
      // sarah: 0 tasks, 1 message
      mockPrisma.task.count
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(0);
      mockPrisma.message.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);
      mockPrisma.task.findFirst
        .mockResolvedValue(null);
      mockPrisma.task.create
        .mockResolvedValueOnce({ id: "nudge-t1" })
        .mockResolvedValueOnce({ id: "nudge-t2" });

      const count = await nudgeIdleAgents(mockPrisma as never);

      expect(count).toBe(2);
      expect(mockPrisma.task.create).toHaveBeenCalledTimes(2);
      expect(mockEnqueue).toHaveBeenCalledTimes(2);
    });

    it("does nothing when no agents are idle", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([]);

      const count = await nudgeIdleAgents(mockPrisma as never);

      expect(count).toBe(0);
      expect(mockPrisma.task.count).not.toHaveBeenCalled();
    });

    it("uses custom orgSlug when provided", async () => {
      mockPrisma.agent.findMany.mockResolvedValue([
        { id: "a1", name: "marcus" },
      ]);
      mockPrisma.task.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(0);
      mockPrisma.task.findFirst.mockResolvedValue(null);
      mockPrisma.task.create.mockResolvedValue({ id: "nudge-t1" });

      await nudgeIdleAgents(mockPrisma as never, "acme-corp");

      expect(mockEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({ orgSlug: "acme-corp" }),
      );
      expect(mockEventBus.emit).toHaveBeenCalledWith("task_created",
        expect.objectContaining({ orgSlug: "acme-corp" }),
      );
    });
  });

  describe("startAgentNudger / stopAgentNudger", () => {
    afterEach(() => {
      stopAgentNudger();
    });

    it("starts and stops the interval", () => {
      mockPrisma.agent.findMany.mockResolvedValue([]);

      startAgentNudger(mockPrisma as never);
      stopAgentNudger();

      // No error thrown means success
    });

    it("does not start when GC_NUDGE_ENABLED is false", () => {
      const original = process.env["GC_NUDGE_ENABLED"];
      process.env["GC_NUDGE_ENABLED"] = "false";

      const consoleSpy = vi.spyOn(console, "log");
      startAgentNudger(mockPrisma as never);

      expect(consoleSpy.mock.calls.some(
        (call) => typeof call[0] === "string" && call[0].includes("Disabled"),
      )).toBe(true);

      consoleSpy.mockRestore();
      process.env["GC_NUDGE_ENABLED"] = original;
    });
  });
});
