import { describe, expect, it, vi, beforeEach } from "vitest";

let agentImpl: any = {
  executeTask: vi.fn(async () => ({
    success: true,
    output: "OK",
    tokensUsed: { input: 1, output: 1 },
    costUsd: 0,
    toolsUsed: [],
  })),
};

vi.mock("../../db/index.js", () => ({
  db: {
    task: {
      update: vi.fn(async () => ({})),
      create: vi.fn(async () => ({ id: "t1" })),
      findUnique: vi.fn(async () => ({
        id: "t1",
        agentId: "a1",
        assignedTo: { name: "Agent" },
        title: "Title",
        description: "Desc",
        priority: "high",
      })),
    },
    agent: {
      update: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => ({ id: "a1", name: "Agent", status: "idle" })),
    },
    message: {
      count: vi.fn(async () => 0),
    },
    activityLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("../../agents/index.js", () => ({
  getAgent: vi.fn((_name: string) => agentImpl),
}));

vi.mock("../../services/message-service.js", () => ({
  MessageService: {
    getUnread: vi.fn(async () => []),
  },
}));

vi.mock("../../services/event-bus.js", async () => {
  const actual = await vi.importActual<any>("../../services/event-bus.js");
  return {
    ...actual,
    EventBus: {
      emit: vi.fn(),
      on: actual.EventBus.on.bind(actual.EventBus),
      off: actual.EventBus.off.bind(actual.EventBus),
      once: actual.EventBus.once.bind(actual.EventBus),
    },
  };
});

describe("temporal activities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentImpl = {
      executeTask: vi.fn(async () => ({
        success: true,
        output: "OK",
        tokensUsed: { input: 1, output: 1 },
        costUsd: 0,
        toolsUsed: [],
      })),
    };
  });

  it("executeAgentTask runs agent and returns result", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const res = await activities.executeAgentTask({
      taskId: "t1",
      agentId: "a1",
      agentName: "Agent",
      title: "Title",
      description: "Desc",
      priority: "high",
    });
    expect(res.success).toBe(true);
    expect(res.output).toBe("OK");
  });

  it("executeAgentTask throws when agent missing", async () => {
    agentImpl = null;
    const activities = await import("../../temporal/activities/agentActivities.js");
    await expect(
      activities.executeAgentTask({
        taskId: "t1",
        agentId: "a1",
        agentName: "Missing",
        title: "Title",
        description: "Desc",
        priority: "high",
      })
    ).rejects.toThrow(/not found/i);
  });

  it("updateTaskStatus writes startedAt / completedAt and result", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { db } = await import("../../db/index.js");

    await activities.updateTaskStatus("t1", "in_progress");
    await activities.updateTaskStatus("t1", "completed", { success: true });

    expect(db.task.update).toHaveBeenCalled();
  });

  it("updateAgentStatus emits websocket event", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { EventBus } = await import("../../services/event-bus.js");

    await activities.updateAgentStatus("a1", "working", "t1");
    expect(EventBus.emit).toHaveBeenCalledWith("agent:status", expect.any(Object));
  });

  it("emitTaskProgress emits progress event", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { EventBus } = await import("../../services/event-bus.js");

    await activities.emitTaskProgress("t1", 50, "half");
    expect(EventBus.emit).toHaveBeenCalledWith(
      "task:progress",
      expect.objectContaining({ taskId: "t1", progress: 50 })
    );
  });

  it("emitTaskCompleted emits completed/failed events", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { EventBus } = await import("../../services/event-bus.js");

    await activities.emitTaskCompleted("t1", { success: true, output: "x" } as any);
    await activities.emitTaskCompleted("t2", { success: false, output: "", error: "bad" } as any);

    expect(EventBus.emit).toHaveBeenCalledWith("task:completed", expect.objectContaining({ taskId: "t1" }));
    expect(EventBus.emit).toHaveBeenCalledWith("task:failed", expect.objectContaining({ taskId: "t2" }));
  });

  it("getUnreadMessages maps MessageService payload", async () => {
    const { MessageService } = await import("../../services/message-service.js");
    (MessageService.getUnread as any).mockResolvedValueOnce([
      {
        id: "m1",
        fromAgent: { name: "From" },
        subject: "S",
        body: "B",
        createdAt: new Date(0),
      },
    ]);

    const activities = await import("../../temporal/activities/agentActivities.js");
    const res = await activities.getUnreadMessages("a1");
    expect(res[0]).toEqual(
      expect.objectContaining({ id: "m1", fromAgentName: "From", subject: "S", body: "B" })
    );
  });

  it("getAgentById returns agent or null", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { db } = await import("../../db/index.js");

    (db as any).agent.findUnique = vi.fn(async () => null);
    const none = await activities.getAgentById("a1");
    expect(none).toBeNull();
  });

  it("createTask returns created id", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const id = await activities.createTask({
      agentId: "a1",
      title: "T",
      description: "D",
      priority: "high",
    });
    expect(id).toBe("t1");
  });

  it("getTaskById returns mapped input or null", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { db } = await import("../../db/index.js");

    (db as any).task.findUnique = vi.fn(async () => null);
    const none = await activities.getTaskById("missing");
    expect(none).toBeNull();
  });

  it("logActivity writes db and emits event", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const { db } = await import("../../db/index.js");
    const { EventBus } = await import("../../services/event-bus.js");

    await activities.logActivity("a1", "evt", { x: 1 });
    expect((db as any).activityLog.create).toHaveBeenCalled();
    expect(EventBus.emit).toHaveBeenCalledWith(
      "activity:log",
      expect.objectContaining({ agentId: "a1", eventType: "evt" })
    );
  });

  it("hasUnreadMessages returns boolean", async () => {
    const activities = await import("../../temporal/activities/agentActivities.js");
    const res = await activities.hasUnreadMessages("a1");
    expect(res).toBe(false);
  });
});
