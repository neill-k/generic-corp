import { create } from "zustand";
import type {
  UiManifest,
  NavItemExtension,
  PageExtension,
  WidgetExtension,
} from "@generic-corp/sdk";

interface PluginUiState {
  manifest: UiManifest | null;
  loaded: boolean;
  error: string | null;
  fetchManifest: () => Promise<void>;
  getNavItems: () => NavItemExtension[];
  getPages: () => PageExtension[];
  getWidgetsForPage: (
    targetPage: string,
    position: "top" | "bottom" | "sidebar",
  ) => WidgetExtension[];
}

export const usePluginStore = create<PluginUiState>((set, get) => ({
  manifest: null,
  loaded: false,
  error: null,

  fetchManifest: async () => {
    try {
      const res = await fetch("/api/plugins/ui");
      if (!res.ok) {
        set({
          loaded: true,
          error: `Failed to fetch plugin manifest: HTTP ${res.status}`,
        });
        return;
      }
      const manifest = (await res.json()) as UiManifest;
      set({ manifest, loaded: true, error: null });
    } catch (err) {
      set({
        loaded: true,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  },

  getNavItems: () => {
    const manifest = get().manifest;
    if (!manifest) return [];
    return [...manifest.navItems].sort(
      (a, b) => (a.position ?? 100) - (b.position ?? 100),
    );
  },

  getPages: () => {
    const manifest = get().manifest;
    if (!manifest) return [];
    return manifest.pages;
  },

  getWidgetsForPage: (targetPage, position) => {
    const manifest = get().manifest;
    if (!manifest) return [];
    return manifest.widgets.filter(
      (w) => w.targetPage === targetPage && w.position === position,
    );
  },
}));
