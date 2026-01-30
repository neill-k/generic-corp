import { describe, expect, it, vi } from "vitest";

const handlers: Record<string, (data: any) => Promise<void> | void> = {};

vi.mock("../../services/event-bus.js", async () => {
  const actual = await vi.importActual<any>("../../services/event-bus.js");
  return {
    ...actual,
    EventBus: {
      ...actual.EventBus,
      on: (event: string, cb: any) => {
        handlers[event] = cb;
        actual.EventBus.on(event as any, cb);
      },
      emit: vi.fn(),
    },
  };
});

const startAgentTaskWorkflow = vi.fn(async () => "wf-1");
const getTemporalClient = vi.fn(async () => ({}));

vi.mock("../../temporal/index.js", () => ({
  getTemporalClient,
  startAgentTaskWorkflow,
  initializeAgentLifecycles: vi.fn(async () => undefined),
  shutdownTemporalClient: vi.fn(async () => undefined),
}));

vi.mock("../../agents/index.js", () => ({
  getAgent: vi.fn(() => null),
}));

vi.mock("../../db/index.js", () => ({
  db: {
    task: {
      findUnique: vi.fn(async () => ({
        id: "t1",
        title: "Title",
        description: "Desc",
        priority: "high",
        assignedTo: { id: "a1", name: "Agent" },
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

describe("queues temporal path", () => {
  it("starts a Temporal workflow when available", async () => {
    const { initializeQueues } = await import("../../queues/index.js");
    await initializeQueues({} as any);

    await handlers["task:queued"]({ agentId: "a1", task: { id: "t1" } });
    expect(startAgentTaskWorkflow).toHaveBeenCalled();
  });

  it("falls back to direct execution when workflow start fails", async () => {
    startAgentTaskWorkflow.mockRejectedValueOnce(new Error("boom"));
    const { initializeQueues } = await import("../../queues/index.js");
    await initializeQueues({} as any);

    await handlers["task:queued"]({ agentId: "a1", task: { id: "t1" } });

    const { db } = await import("../../db/index.js");
    expect((db as any).task.update).toHaveBeenCalled();
  });
});
