import { beforeEach, describe, expect, it, vi } from "vitest";

const handlers: Record<string, (data: any) => Promise<void> | void> = {};

vi.mock("../../services/event-bus.js", () => ({
  EventBus: {
    on: (event: string, cb: any) => {
      handlers[event] = cb;
    },
    emit: vi.fn(),
  },
}));

vi.mock("../../temporal/index.js", () => ({
  getTemporalClient: vi.fn(async () => {
    throw new Error("no temporal");
  }),
  startAgentTaskWorkflow: vi.fn(),
  initializeAgentLifecycles: vi.fn(),
  shutdownTemporalClient: vi.fn(),
}));

vi.mock("../../agents/index.js", () => ({
  getAgent: vi.fn(() => ({
    hasAgentRecord: () => true,
    setAgentRecord: vi.fn(),
    executeTask: vi.fn(async () => ({ success: true, output: "done" })),
  })),
}));

vi.mock("../../db/index.js", () => ({
  db: {
    task: {
      findUnique: vi.fn(async () => ({
        id: "t1",
        title: "Title",
        description: "Desc",
        priority: "high",
        assignedTo: { id: "a1", name: "Agent", capabilities: [], toolPermissions: {} },
      })),
      update: vi.fn(async () => ({})),
    },
    agent: {
      update: vi.fn(async () => ({})),
    },
    activityLog: {
      create: vi.fn(async () => ({})),
    },
  },
}));

describe("queues direct execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(handlers)) delete handlers[key];
  });

  it("handles task:queued in fallback mode", async () => {
    const { initializeQueues } = await import("../../queues/index.js");
    await initializeQueues({} as any);

    expect(typeof handlers["task:queued"]).toBe("function");
    await handlers["task:queued"]({ agentId: "a1", task: { id: "t1" } });

    const { db } = await import("../../db/index.js");
    expect((db as any).task.update).toHaveBeenCalled();
  });

  it("does nothing when queued task is missing", async () => {
    const { db } = await import("../../db/index.js");
    (db as any).task.findUnique = vi.fn(async () => null);

    const { initializeQueues } = await import("../../queues/index.js");
    await initializeQueues({} as any);

    await handlers["task:queued"]({ agentId: "a1", task: { id: "missing" } });
    expect((db as any).task.update).not.toHaveBeenCalled();
  });
});
