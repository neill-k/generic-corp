import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../db/index.js", () => ({
  db: {
    agent: {
      findUnique: vi.fn(async () => ({ id: "a1", name: "Agent", status: "idle", currentTaskId: null })),
      findMany: vi.fn(async () => [{ id: "a1", name: "Agent", status: "idle", currentTaskId: null }]),
    },
    task: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "t1" })),
    },
    message: {
      count: vi.fn(async () => 1),
    },
  },
}));

vi.mock("../../services/event-bus.js", async () => {
  const actual = await vi.importActual<any>("../../services/event-bus.js");
  return {
    ...actual,
    EventBus: actual.EventBus,
  };
});

describe("agent scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates an inbox task after message:new when agent is idle", async () => {
    const { initializeAgentScheduler, shutdownAgentScheduler } = await import("../../services/agent-scheduler.js");
    const { EventBus } = await import("../../services/event-bus.js");
    const { db } = await import("../../db/index.js");

    initializeAgentScheduler();

    EventBus.emit("message:new", { toAgentId: "a1", message: { subject: "Hello" } });
    await vi.advanceTimersByTimeAsync(2500);

    expect(db.task.create).toHaveBeenCalled();

    shutdownAgentScheduler();
  });
});
