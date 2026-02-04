import { describe, expect, it, vi } from "vitest";

import { EventBus } from "./event-bus.js";

type Events = {
  ping: { value: number };
  pong: { ok: boolean };
};

describe("EventBus", () => {
  it("publishes events to subscribers", () => {
    const bus = new EventBus<Events>();
    const handler = vi.fn<(payload: Events["ping"]) => void>();

    const unsubscribe = bus.on("ping", handler);
    bus.emit("ping", { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 });
    unsubscribe();
  });

  it("supports multiple handlers for the same event", () => {
    const bus = new EventBus<Events>();
    const h1 = vi.fn<(payload: Events["ping"]) => void>();
    const h2 = vi.fn<(payload: Events["ping"]) => void>();

    bus.on("ping", h1);
    bus.on("ping", h2);

    bus.emit("ping", { value: 1 });

    expect(h1).toHaveBeenCalledWith({ value: 1 });
    expect(h2).toHaveBeenCalledWith({ value: 1 });
  });

  it("does not call unsubscribed handlers", () => {
    const bus = new EventBus<Events>();
    const handler = vi.fn<(payload: Events["pong"]) => void>();

    const unsubscribe = bus.on("pong", handler);
    unsubscribe();
    unsubscribe();
    bus.emit("pong", { ok: true });

    expect(handler).not.toHaveBeenCalled();
  });
});
