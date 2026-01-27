import { describe, expect, it, vi, beforeEach } from "vitest";

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

    __connect(socket: any) {
      return this.connectionHandler?.(socket);
    }
  }

  return { Server };
});

vi.mock("../../db/index.js", () => ({
  db: {
    agent: { findMany: vi.fn(async () => []) },
    message: { findMany: vi.fn(async () => []), update: vi.fn(async () => ({})), create: vi.fn(async () => ({ id: "m1" })) },
    gameState: { findUnique: vi.fn(async () => null), upsert: vi.fn(async () => ({})) },
    task: { findMany: vi.fn(async () => []), create: vi.fn(async () => ({ id: "t1", agentId: "a1" })) },
  },
}));

vi.mock("../../services/event-bus.js", async () => {
  const actual = await vi.importActual<any>("../../services/event-bus.js");
  return {
    ...actual,
    EventBus: actual.EventBus,
  };
});

describe("websocket setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires EventBus server->client events", async () => {
    const { setupWebSocket } = await import("../../websocket/index.js");
    const { EventBus } = await import("../../services/event-bus.js");
    setupWebSocket({} as any);

    EventBus.emit("task:progress", { taskId: "t1", progress: 1 });
    expect(createdIo.emit).toHaveBeenCalled();
  });
});
