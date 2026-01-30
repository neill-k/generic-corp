import { describe, expect, it, vi, beforeEach } from "vitest";

import { EventBus } from "../services/event-bus.js";
import type { AppEventMap } from "../services/app-events.js";
import { createWebSocketHub } from "./hub.js";

function makeFakeSocketServer() {
  const connectionHandlers: Array<(socket: unknown) => void> = [];

  return {
    on(event: string, handler: (socket: unknown) => void) {
      if (event === "connection") connectionHandlers.push(handler);
    },
    to(_room: string) {
      return {
        emit: vi.fn(),
      };
    },
    _simulateConnection() {
      const socket = {
        id: `sock-${Date.now()}`,
        join: vi.fn(),
        emit: vi.fn(),
        on: vi.fn(),
      };
      for (const h of connectionHandlers) h(socket);
      return socket;
    },
  };
}

describe("createWebSocketHub", () => {
  let bus: EventBus<AppEventMap>;
  let io: ReturnType<typeof makeFakeSocketServer>;

  beforeEach(() => {
    bus = new EventBus<AppEventMap>();
    io = makeFakeSocketServer();
  });

  it("subscribes to eventBus events and relays to Socket.io rooms", () => {
    const hub = createWebSocketHub(io as never, bus);

    const toSpy = vi.fn().mockReturnValue({ emit: vi.fn() });
    (io as unknown as Record<string, unknown>)["to"] = toSpy;

    bus.emit("agent_event", {
      agentId: "marcus",
      taskId: "t1",
      event: { type: "message", content: "hello" },
    });

    expect(toSpy).toHaveBeenCalledWith("agent:marcus");

    hub.stop();
  });

  it("relays agent_status_changed events", () => {
    const hub = createWebSocketHub(io as never, bus);

    const emitFn = vi.fn();
    (io as unknown as Record<string, unknown>)["to"] = vi.fn().mockReturnValue({ emit: emitFn });

    bus.emit("agent_status_changed", { agentId: "sable", status: "running" });

    expect(emitFn).toHaveBeenCalledWith("agent_status_changed", { agentId: "sable", status: "running" });

    hub.stop();
  });

  it("relays task_status_changed events", () => {
    const hub = createWebSocketHub(io as never, bus);

    const emitFn = vi.fn();
    (io as unknown as Record<string, unknown>)["to"] = vi.fn().mockReturnValue({ emit: emitFn });

    bus.emit("task_status_changed", { taskId: "t1", status: "completed" });

    expect(emitFn).toHaveBeenCalledWith("task_status_changed", { taskId: "t1", status: "completed" });

    hub.stop();
  });

  it("stop() unsubscribes from all events", () => {
    const hub = createWebSocketHub(io as never, bus);
    hub.stop();

    const emitFn = vi.fn();
    (io as unknown as Record<string, unknown>)["to"] = vi.fn().mockReturnValue({ emit: emitFn });

    bus.emit("agent_event", {
      agentId: "marcus",
      taskId: "t1",
      event: { type: "message", content: "hello" },
    });

    expect(emitFn).not.toHaveBeenCalled();
  });
});
