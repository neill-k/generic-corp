import { describe, expect, it, vi } from "vitest";

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

import { useAgentStore } from "./store/agent-store.js";
import { useSocketStore } from "./store/socket-store.js";
import { api } from "./lib/api-client.js";

describe("useAgentStore", () => {
  it("stores and updates agents", () => {
    const store = useAgentStore.getState();
    expect(store.agents).toEqual([]);

    store.setAgents([
      {
        id: "1",
        name: "marcus",
        displayName: "Marcus Bell",
        role: "CEO",
        department: "Executive",
        level: "c-suite",
        status: "idle",
        currentTaskId: null,
      },
    ]);

    expect(useAgentStore.getState().agents).toHaveLength(1);
    expect(useAgentStore.getState().agents[0]!.name).toBe("marcus");
  });

  it("updates agent status by name", () => {
    const store = useAgentStore.getState();
    store.setAgents([
      {
        id: "1",
        name: "marcus",
        displayName: "Marcus Bell",
        role: "CEO",
        department: "Executive",
        level: "c-suite",
        status: "idle",
        currentTaskId: null,
      },
    ]);

    store.updateAgentStatus("marcus", "running");
    expect(useAgentStore.getState().agents[0]!.status).toBe("running");
  });
});

describe("useSocketStore", () => {
  it("tracks connection status", () => {
    const store = useSocketStore.getState();
    expect(store.connected).toBe(false);

    store.setConnected(true);
    expect(useSocketStore.getState().connected).toBe(true);
  });
});

describe("api client", () => {
  it("exports get and post methods", () => {
    expect(typeof api.get).toBe("function");
    expect(typeof api.post).toBe("function");
  });
});
