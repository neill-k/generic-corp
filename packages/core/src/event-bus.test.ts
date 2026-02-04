import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./event-bus.js";

type TestEvents = {
  hello: { name: string };
  count: { n: number };
};

describe("EventBus", () => {
  it("delivers events to handlers", () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    bus.on("hello", handler);
    bus.emit("hello", { name: "world" });
    expect(handler).toHaveBeenCalledWith({ name: "world" });
  });

  it("supports multiple handlers", () => {
    const bus = new EventBus<TestEvents>();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on("hello", h1);
    bus.on("hello", h2);
    bus.emit("hello", { name: "test" });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("unsubscribes correctly", () => {
    const bus = new EventBus<TestEvents>();
    const handler = vi.fn();
    const unsub = bus.on("hello", handler);
    unsub();
    bus.emit("hello", { name: "gone" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw when emitting with no handlers", () => {
    const bus = new EventBus<TestEvents>();
    expect(() => bus.emit("hello", { name: "nobody" })).not.toThrow();
  });

  it("isolates events by type", () => {
    const bus = new EventBus<TestEvents>();
    const helloHandler = vi.fn();
    const countHandler = vi.fn();
    bus.on("hello", helloHandler);
    bus.on("count", countHandler);
    bus.emit("hello", { name: "test" });
    expect(helloHandler).toHaveBeenCalledOnce();
    expect(countHandler).not.toHaveBeenCalled();
  });

  it("cleans up handler set when last handler removed", () => {
    const bus = new EventBus<TestEvents>();
    const unsub = bus.on("hello", vi.fn());
    unsub();
    // Emit should not throw
    bus.emit("hello", { name: "clean" });
  });
});
