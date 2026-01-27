import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../db/index.js", () => ({
  db: {
    $queryRaw: vi.fn(async () => 1),
    agent: {
      count: vi.fn(async () => 5),
      findMany: vi.fn(async () => [{ id: "w1", name: "Worker 1", status: "idle", currentTaskId: null, updatedAt: new Date() }]),
      findFirst: vi.fn(async () => ({ id: "marcus", name: "Marcus Bell" })),
      update: vi.fn(async () => ({})),
    },
    task: {
      count: vi.fn(async () => 1),
      findFirst: vi.fn(async () => ({ id: "t1", title: "T", agentId: "w1", status: "pending" })),
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => ({ id: "t1", status: "in_progress" })),
      create: vi.fn(async () => ({ id: "t-created" })),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 2 })),
    },
    activityLog: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      deleteMany: vi.fn(async () => ({ count: 3 })),
      create: vi.fn(async () => ({})),
    },
    message: {
      count: vi.fn(async () => 0),
      deleteMany: vi.fn(async () => ({ count: 4 })),
    },
    gameState: {
      findUnique: vi.fn(async () => null),
    },
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

describe("cron job handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("system health check emits activity", async () => {
    const { systemCronJobs } = await import("../../crons/system.js");
    const { EventBus } = await import("../../services/event-bus.js");

    const job = systemCronJobs.find((j) => j.name === "system:health-check")!;
    await job.handler({} as any);
    expect(EventBus.emit).toHaveBeenCalledWith("activity:log", expect.any(Object));
  });

  it("system cleanup runs without throwing", async () => {
    const { systemCronJobs } = await import("../../crons/system.js");
    const job = systemCronJobs.find((j) => j.name === "system:db-cleanup")!;
    await job.handler({} as any);
  });

  it("worker check-inbox queues tasks when pending", async () => {
    const { workerCronJobs } = await import("../../crons/workers.js");
    const { EventBus } = await import("../../services/event-bus.js");
    const job = workerCronJobs.find((j) => j.name === "workers:check-inbox")!;

    await job.handler({} as any);
    expect(EventBus.emit).toHaveBeenCalledWith("task:queued", expect.any(Object));
  });

  it("worker heartbeat resets stale agent and marks task failed", async () => {
    const { workerCronJobs } = await import("../../crons/workers.js");
    const { db } = await import("../../db/index.js");

    (db.agent.findMany as any).mockResolvedValueOnce([
      { id: "a1", name: "Stale", status: "working", updatedAt: new Date(0), deletedAt: null, currentTaskId: "t1" },
    ]);
    (db.task.findUnique as any).mockResolvedValueOnce({ id: "t1", status: "in_progress" });

    const job = workerCronJobs.find((j) => j.name === "workers:heartbeat")!;
    await job.handler({} as any);

    expect(db.agent.update).toHaveBeenCalled();
    expect(db.task.update).toHaveBeenCalled();
  });

  it("ceo daily priorities creates a task when Marcus exists", async () => {
    const { ceoCronJobs } = await import("../../crons/ceo.js");
    const { db } = await import("../../db/index.js");
    const job = ceoCronJobs.find((j) => j.name === "ceo:daily-priorities")!;
    await job.handler({} as any);
    expect(db.task.create).toHaveBeenCalled();
  });
});
