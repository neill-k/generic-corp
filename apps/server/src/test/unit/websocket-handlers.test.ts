import { describe, expect, it, vi, beforeEach } from "vitest";
import { WS_EVENTS } from "@generic-corp/shared";

let createdIo: any;

vi.mock("socket.io", () => {
  class Server {
    emit = vi.fn();
    private connectionHandler: any;

    on = vi.fn((event: string, cb: any) => {
      if (event === "connection") this.connectionHandler = cb;
    });

    constructor(_http: any, _opts: any) {
      createdIo = this;
    }

    async __connect(socket: any) {
      return this.connectionHandler?.(socket);
    }
  }

  return { Server };
});

const dbMock = {
  agent: {
    findMany: vi.fn(async () => [{ id: "a1", name: "Frankie Deluca", deletedAt: null, assignedTasks: [] }]),
    findFirst: vi.fn(async (args: any) => {
      const name = args?.where?.name;
      if (name === "Marcus Bell") return { id: "marcus", name };
      if (name) return { id: `agent-${name}`, name };
      return null;
    }),
  },
  message: {
    findMany: vi.fn(async (args: any) => {
      if (args?.where?.type === "external_draft") return [{ id: "d1", type: "external_draft", status: "pending" }];
      return [{ id: "m1", type: "direct", status: "pending" }];
    }),
    findUnique: vi.fn(async () => ({
      id: "d1",
      externalRecipient: "to@example.com",
      subject: "Sub",
      body: "Body",
      fromAgent: { name: "Frankie Deluca" },
    })),
    update: vi.fn(async () => ({})),
    create: vi.fn(async () => ({ id: "m-created" })),
  },
  gameState: {
    findUnique: vi.fn(async () => ({
      playerId: "default",
      budgetRemainingUsd: "99.5",
      budgetLimitUsd: "100",
    })),
    upsert: vi.fn(async () => ({})),
  },
  task: {
    findMany: vi.fn(async () => [{ id: "t1", status: "pending", agentId: "a1" }]),
    create: vi.fn(async () => ({ id: "t-created", agentId: "a1" })),
  },
};

vi.mock("../../db/index.js", () => ({
  db: dbMock,
}));

function createSocket() {
  const handlers = new Map<string, any>();
  return {
    id: "socket-1",
    emit: vi.fn(),
    on: vi.fn((event: string, cb: any) => {
      handlers.set(event, cb);
    }),
    __trigger(event: string, data?: any) {
      const cb = handlers.get(event);
      return cb?.(data);
    },
    __triggerWithCallback(event: string, data: any) {
      const cb = handlers.get(event);
      return new Promise<any>((resolve) => {
        cb?.(data, (result: any) => resolve(result));
      });
    },
  };
}

describe("websocket handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, "setInterval").mockReturnValue(1 as any);
  });

  it("sends initial state on connect", async () => {
    const { setupWebSocket } = await import("../../websocket/index.js");
    const socket = createSocket();

    setupWebSocket({} as any);
    await createdIo.__connect(socket);

    expect(dbMock.agent.findMany).toHaveBeenCalled();
    expect(dbMock.task.findMany).toHaveBeenCalled();
    expect(dbMock.message.findMany).toHaveBeenCalled();
    expect(socket.emit).toHaveBeenCalledWith(
      WS_EVENTS.INIT,
      expect.objectContaining({
        agents: expect.any(Array),
        tasks: expect.any(Array),
        messages: expect.any(Array),
        pendingDrafts: expect.any(Array),
        gameState: expect.objectContaining({
          budgetRemainingUsd: 99.5,
          budgetLimitUsd: 100,
        }),
        timestamp: expect.any(Number),
      })
    );
  });

  it("handles TASK_ASSIGN happy path and not-found", async () => {
    const { setupWebSocket } = await import("../../websocket/index.js");
    const { EventBus } = await import("../../services/event-bus.js");
    const emitSpy = vi.spyOn(EventBus, "emit");

    setupWebSocket({} as any);

    const socket = createSocket();
    await createdIo.__connect(socket);

    const ok = await socket.__triggerWithCallback(WS_EVENTS.TASK_ASSIGN, {
      agentId: "Frankie Deluca",
      title: "Do it",
      description: "desc",
      priority: "normal",
    });
    expect(ok).toEqual({ success: true, taskId: "t-created" });
    expect(dbMock.task.create).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("task:queued", expect.any(Object));

    dbMock.agent.findFirst.mockResolvedValueOnce(null);
    const missing = await socket.__triggerWithCallback(WS_EVENTS.TASK_ASSIGN, {
      agentId: "Missing",
      title: "Do it",
      description: "desc",
    });
    expect(missing.success).toBe(false);
  });

  it("handles DRAFT_APPROVE and DRAFT_REJECT", async () => {
    const { setupWebSocket } = await import("../../websocket/index.js");
    const { EventBus } = await import("../../services/event-bus.js");
    const emitSpy = vi.spyOn(EventBus, "emit");
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    setupWebSocket({} as any);
    const socket = createSocket();
    await createdIo.__connect(socket);

    const approved = await socket.__triggerWithCallback(WS_EVENTS.DRAFT_APPROVE, { draftId: "d1" });
    expect(approved.success).toBe(true);
    expect(dbMock.message.update).toHaveBeenCalled();

    const rejected = await socket.__triggerWithCallback(WS_EVENTS.DRAFT_REJECT, { draftId: "d1", reason: "no" });
    expect(rejected).toEqual({ success: true });
    expect(emitSpy).toHaveBeenCalledWith("draft:rejected", { draftId: "d1", reason: "no" });

    logSpy.mockRestore();
  });

  it("handles MESSAGE_SEND and STATE_SYNC", async () => {
    const { setupWebSocket } = await import("../../websocket/index.js");
    const { EventBus } = await import("../../services/event-bus.js");
    const emitSpy = vi.spyOn(EventBus, "emit");

    setupWebSocket({} as any);
    const socket = createSocket();
    await createdIo.__connect(socket);

    const sent = await socket.__triggerWithCallback(WS_EVENTS.MESSAGE_SEND, {
      toAgentId: "Kenji Ross",
      subject: "Hi",
      body: "Body",
    });
    expect(sent.success).toBe(true);
    expect(dbMock.message.create).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith("message:new", expect.any(Object));

    dbMock.agent.findFirst.mockResolvedValueOnce(null);
    const missing = await socket.__triggerWithCallback(WS_EVENTS.MESSAGE_SEND, {
      toAgentId: "Nope",
      subject: "Hi",
      body: "Body",
    });
    expect(missing.success).toBe(false);

    await socket.__trigger(WS_EVENTS.STATE_SYNC, { camera: { x: 1 }, ui: { tab: "a" } });
    expect(dbMock.gameState.upsert).toHaveBeenCalled();
  });
});
