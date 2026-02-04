import { create } from "zustand";
import { api } from "../lib/api-client";
import { resetAllStores } from "../lib/create-resettable";
import { getSocket } from "../lib/socket";
import { queryClient } from "../lib/query-client";

const LS_KEY = "gc_lastOrgSlug";

export interface Organization {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  createdAt: string;
}

interface OrgStore {
  currentOrg: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  isSwitching: boolean;
  fetchOrganizations: () => Promise<void>;
  setCurrentOrg: (org: Organization) => void;
  switchOrg: (slug: string) => Promise<void>;
  createOrganization: (name: string) => Promise<Organization>;
  deleteOrganization: (slug: string) => Promise<void>;
}

let switchId = 0;

export const useOrgStore = create<OrgStore>((set, get) => ({
  currentOrg: null,
  organizations: [],
  isLoading: false,
  isSwitching: false,

  fetchOrganizations: async () => {
    set({ isLoading: true });
    try {
      const { organizations: orgs } = await api.get<{ organizations: Organization[] }>("/organizations");
      set({ organizations: orgs, isLoading: false });

      // Auto-select org if none is set
      if (!get().currentOrg && orgs.length > 0) {
        const lastSlug = localStorage.getItem(LS_KEY);
        const restored = orgs.find((o) => o.slug === lastSlug);
        const selected = restored ?? orgs[0];
        set({ currentOrg: selected });
        localStorage.setItem(LS_KEY, selected.slug);

        // Tell the socket which org we're in so the server can resolve the tenant
        getSocket().emit("switch_org", selected.slug);
      }
    } catch (err) {
      console.error(
        "[OrgStore] Failed to fetch organizations:",
        err instanceof Error ? err.message : "Unknown error",
      );
      set({ isLoading: false });
    }
  },

  setCurrentOrg: (org) => {
    set({ currentOrg: org });
    localStorage.setItem(LS_KEY, org.slug);
  },

  switchOrg: async (slug) => {
    const mySwitchId = ++switchId;

    resetAllStores();
    set({ isSwitching: true });

    try {
      const { organizations: orgs } = await api.get<{ organizations: Organization[] }>("/organizations");

      // Guard against stale switch: if another switch started, bail out
      if (mySwitchId !== switchId) return;

      const target = orgs.find((o) => o.slug === slug);
      if (!target) {
        throw new Error(`Organization "${slug}" not found`);
      }

      set({
        organizations: orgs,
        currentOrg: target,
        isSwitching: false,
      });
      localStorage.setItem(LS_KEY, target.slug);

      // Move WebSocket to the new org's broadcast room
      getSocket().emit("switch_org", target.slug);

      // Invalidate all queries so active observers refetch with the new org header
      void queryClient.invalidateQueries();
    } catch (err) {
      // Only update state if this is still the active switch
      if (mySwitchId === switchId) {
        console.error(
          "[OrgStore] Failed to switch org:",
          err instanceof Error ? err.message : "Unknown error",
        );
        set({ isSwitching: false });
      }
    }
  },

  createOrganization: async (name) => {
    const created = await api.post<Organization>("/organizations", { name });
    set((state) => ({
      organizations: [...state.organizations, created],
    }));
    return created;
  },

  deleteOrganization: async (slug) => {
    await api.delete(`/organizations/${slug}`);
    const remaining = get().organizations.filter((o) => o.slug !== slug);
    set({ organizations: remaining });

    // If we deleted the current org, switch to the first remaining one
    if (get().currentOrg?.slug === slug) {
      const first = remaining[0];
      if (first) {
        get().setCurrentOrg(first);
      } else {
        set({ currentOrg: null });
        localStorage.removeItem(LS_KEY);
      }
    }
  },
}));
