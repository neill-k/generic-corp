import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("socket.io-client", () => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  };
  return { io: () => socket };
});

import { useActivityStore } from "./activity-store.js";

describe("useActivityStore", () => {
  beforeEach(() => {
    useActivityStore.setState({ entries: [] });
  });

  it("initializes with empty entries", () => {
    expect(useActivityStore.getState().entries).toEqual([]);
  });

  it("appends an activity entry", () => {
    useActivityStore.getState().appendEntry({
      id: "1",
      agentId: "a1",
      taskId: "t1",
      event: { type: "message", content: "Hello" },
      timestamp: "2025-01-01T00:00:00Z",
    });

    expect(useActivityStore.getState().entries).toHaveLength(1);
    expect(useActivityStore.getState().entries[0]!.event.type).toBe("message");
  });

  it("caps entries at 200", () => {
    const store = useActivityStore.getState();
    for (let i = 0; i < 210; i++) {
      store.appendEntry({
        id: String(i),
        agentId: "a1",
        taskId: "t1",
        event: { type: "message", content: `msg-${i}` },
        timestamp: new Date().toISOString(),
      });
    }

    expect(useActivityStore.getState().entries).toHaveLength(200);
    expect(useActivityStore.getState().entries[0]!.id).toBe("10");
  });

  it("clears entries", () => {
    useActivityStore.getState().appendEntry({
      id: "1",
      agentId: "a1",
      taskId: "t1",
      event: { type: "thinking", content: "hmm" },
      timestamp: new Date().toISOString(),
    });

    useActivityStore.getState().clearEntries();
    expect(useActivityStore.getState().entries).toEqual([]);
  });
});
