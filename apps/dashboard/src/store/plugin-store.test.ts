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

import { usePluginStore } from "./plugin-store.js";

describe("usePluginStore", () => {
  beforeEach(() => {
    usePluginStore.setState({
      manifest: null,
      loaded: false,
      error: null,
    });
    vi.restoreAllMocks();
  });

  it("initializes with null manifest and loaded=false", () => {
    const state = usePluginStore.getState();
    expect(state.manifest).toBeNull();
    expect(state.loaded).toBe(false);
    expect(state.error).toBeNull();
  });

  it("fetches and stores manifest from the API", async () => {
    const mockManifest = {
      navItems: [
        {
          id: "vault",
          label: "Secrets",
          icon: "key",
          path: "/plugins/vault",
          position: 50,
          pluginId: "local-env-vault",
        },
      ],
      pages: [
        {
          id: "vault",
          path: "/plugins/vault",
          title: "Secret Management",
          apiEndpoint: "/api/plugins/local-env-vault/secrets",
          pluginId: "local-env-vault",
        },
      ],
      widgets: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    await usePluginStore.getState().fetchManifest();

    const state = usePluginStore.getState();
    expect(state.manifest).toEqual(mockManifest);
    expect(state.loaded).toBe(true);
    expect(state.error).toBeNull();
  });

  it("handles fetch errors gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await usePluginStore.getState().fetchManifest();

    const state = usePluginStore.getState();
    expect(state.manifest).toBeNull();
    expect(state.loaded).toBe(true);
    expect(state.error).toBe("Failed to fetch plugin manifest: HTTP 500");
  });

  it("handles network errors gracefully", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await usePluginStore.getState().fetchManifest();

    const state = usePluginStore.getState();
    expect(state.manifest).toBeNull();
    expect(state.loaded).toBe(true);
    expect(state.error).toBe("Network error");
  });

  it("returns empty arrays when manifest is null", () => {
    const state = usePluginStore.getState();
    expect(state.getNavItems()).toEqual([]);
    expect(state.getPages()).toEqual([]);
    expect(state.getWidgetsForPage("dashboard", "top")).toEqual([]);
  });

  it("returns sorted nav items by position", async () => {
    const mockManifest = {
      navItems: [
        { id: "b", label: "B", icon: "b", path: "/plugins/b", position: 200, pluginId: "p2" },
        { id: "a", label: "A", icon: "a", path: "/plugins/a", position: 50, pluginId: "p1" },
      ],
      pages: [],
      widgets: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    await usePluginStore.getState().fetchManifest();

    const items = usePluginStore.getState().getNavItems();
    expect(items[0]!.id).toBe("a");
    expect(items[1]!.id).toBe("b");
  });

  it("filters widgets by target page and position", async () => {
    const mockManifest = {
      navItems: [],
      pages: [],
      widgets: [
        { id: "w1", targetPage: "dashboard", position: "top" as const, title: "Stats", apiEndpoint: "/api/stats", pluginId: "p1" },
        { id: "w2", targetPage: "dashboard", position: "bottom" as const, title: "Logs", apiEndpoint: "/api/logs", pluginId: "p1" },
        { id: "w3", targetPage: "agent-detail", position: "top" as const, title: "Health", apiEndpoint: "/api/health", pluginId: "p2" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockManifest),
    });

    await usePluginStore.getState().fetchManifest();

    expect(usePluginStore.getState().getWidgetsForPage("dashboard", "top")).toHaveLength(1);
    expect(usePluginStore.getState().getWidgetsForPage("dashboard", "bottom")).toHaveLength(1);
    expect(usePluginStore.getState().getWidgetsForPage("agent-detail", "top")).toHaveLength(1);
    expect(usePluginStore.getState().getWidgetsForPage("dashboard", "sidebar")).toHaveLength(0);
  });
});
