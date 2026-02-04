import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../lib/create-resettable", () => ({
  resetAllStores: vi.fn(),
}));

import { useOrgStore, type Organization } from "./org-store.js";
import { api } from "../lib/api-client";
import { resetAllStores } from "../lib/create-resettable";

const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
const mockResetAllStores = resetAllStores as ReturnType<typeof vi.fn>;

const orgA: Organization = {
  id: "1",
  slug: "acme",
  displayName: "Acme Corp",
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
};

const orgB: Organization = {
  id: "2",
  slug: "initech",
  displayName: "Initech",
  status: "active",
  createdAt: "2025-01-02T00:00:00Z",
};

describe("useOrgStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useOrgStore.setState({
      currentOrg: null,
      organizations: [],
      isLoading: false,
      isSwitching: false,
    });
  });

  it("initializes with empty state", () => {
    const state = useOrgStore.getState();
    expect(state.currentOrg).toBeNull();
    expect(state.organizations).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.isSwitching).toBe(false);
  });

  describe("fetchOrganizations", () => {
    it("fetches and stores organizations", async () => {
      mockApi.get.mockResolvedValue([orgA, orgB]);

      await useOrgStore.getState().fetchOrganizations();

      const state = useOrgStore.getState();
      expect(state.organizations).toEqual([orgA, orgB]);
      expect(state.isLoading).toBe(false);
      expect(mockApi.get).toHaveBeenCalledWith("/organizations");
    });

    it("auto-selects first org when none is set", async () => {
      mockApi.get.mockResolvedValue([orgA, orgB]);

      await useOrgStore.getState().fetchOrganizations();

      expect(useOrgStore.getState().currentOrg).toEqual(orgA);
    });

    it("restores last org from localStorage", async () => {
      localStorage.setItem("gc_lastOrgSlug", "initech");
      mockApi.get.mockResolvedValue([orgA, orgB]);

      await useOrgStore.getState().fetchOrganizations();

      expect(useOrgStore.getState().currentOrg).toEqual(orgB);
    });

    it("falls back to first org if localStorage slug not found", async () => {
      localStorage.setItem("gc_lastOrgSlug", "nonexistent");
      mockApi.get.mockResolvedValue([orgA, orgB]);

      await useOrgStore.getState().fetchOrganizations();

      expect(useOrgStore.getState().currentOrg).toEqual(orgA);
    });

    it("does not override existing current org", async () => {
      useOrgStore.setState({ currentOrg: orgB });
      mockApi.get.mockResolvedValue([orgA, orgB]);

      await useOrgStore.getState().fetchOrganizations();

      expect(useOrgStore.getState().currentOrg).toEqual(orgB);
    });

    it("handles fetch errors gracefully", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      await useOrgStore.getState().fetchOrganizations();

      const state = useOrgStore.getState();
      expect(state.organizations).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("setCurrentOrg", () => {
    it("sets current org and persists to localStorage", () => {
      useOrgStore.getState().setCurrentOrg(orgA);

      expect(useOrgStore.getState().currentOrg).toEqual(orgA);
      expect(localStorage.getItem("gc_lastOrgSlug")).toBe("acme");
    });
  });

  describe("switchOrg", () => {
    it("resets all stores, fetches orgs, and sets the target org", async () => {
      mockApi.get.mockResolvedValue([orgA, orgB]);

      await useOrgStore.getState().switchOrg("initech");

      expect(mockResetAllStores).toHaveBeenCalled();
      const state = useOrgStore.getState();
      expect(state.currentOrg).toEqual(orgB);
      expect(state.isSwitching).toBe(false);
      expect(localStorage.getItem("gc_lastOrgSlug")).toBe("initech");
    });

    it("throws if target org not found", async () => {
      mockApi.get.mockResolvedValue([orgA]);

      await useOrgStore.getState().switchOrg("nonexistent");

      // Error handled internally, isSwitching reset
      expect(useOrgStore.getState().isSwitching).toBe(false);
    });

    it("handles fetch errors during switch", async () => {
      mockApi.get.mockRejectedValue(new Error("Network error"));

      await useOrgStore.getState().switchOrg("initech");

      expect(useOrgStore.getState().isSwitching).toBe(false);
    });
  });

  describe("createOrganization", () => {
    it("creates org and adds to list", async () => {
      useOrgStore.setState({ organizations: [orgA] });
      mockApi.post.mockResolvedValue(orgB);

      const result = await useOrgStore.getState().createOrganization("Initech");

      expect(result).toEqual(orgB);
      expect(useOrgStore.getState().organizations).toEqual([orgA, orgB]);
      expect(mockApi.post).toHaveBeenCalledWith("/organizations", { name: "Initech" });
    });
  });

  describe("deleteOrganization", () => {
    it("deletes org and removes from list", async () => {
      useOrgStore.setState({ organizations: [orgA, orgB], currentOrg: orgA });
      mockApi.delete.mockResolvedValue(undefined);

      await useOrgStore.getState().deleteOrganization("initech");

      expect(useOrgStore.getState().organizations).toEqual([orgA]);
      expect(mockApi.delete).toHaveBeenCalledWith("/organizations/initech");
    });

    it("switches to first remaining org when current org is deleted", async () => {
      useOrgStore.setState({ organizations: [orgA, orgB], currentOrg: orgA });
      mockApi.delete.mockResolvedValue(undefined);

      await useOrgStore.getState().deleteOrganization("acme");

      expect(useOrgStore.getState().currentOrg).toEqual(orgB);
      expect(localStorage.getItem("gc_lastOrgSlug")).toBe("initech");
    });

    it("clears current org when last org is deleted", async () => {
      useOrgStore.setState({ organizations: [orgA], currentOrg: orgA });
      mockApi.delete.mockResolvedValue(undefined);

      await useOrgStore.getState().deleteOrganization("acme");

      expect(useOrgStore.getState().currentOrg).toBeNull();
      expect(localStorage.getItem("gc_lastOrgSlug")).toBeNull();
    });

    it("does not change current org when deleting a different org", async () => {
      useOrgStore.setState({ organizations: [orgA, orgB], currentOrg: orgA });
      mockApi.delete.mockResolvedValue(undefined);

      await useOrgStore.getState().deleteOrganization("initech");

      expect(useOrgStore.getState().currentOrg).toEqual(orgA);
    });
  });
});
