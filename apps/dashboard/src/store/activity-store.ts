import { create } from "zustand";
import type { AgentEvent } from "@generic-corp/shared";

interface ActivityEntry {
  id: string;
  agentId: string;
  taskId: string;
  event: AgentEvent;
  timestamp: string;
}

interface ActivityState {
  entries: ActivityEntry[];
  appendEntry: (entry: ActivityEntry) => void;
  clearEntries: () => void;
}

const MAX_ENTRIES = 200;

export const useActivityStore = create<ActivityState>((set) => ({
  entries: [],
  appendEntry: (entry) =>
    set((state) => ({
      entries: [...state.entries, entry].slice(-MAX_ENTRIES),
    })),
  clearEntries: () => set({ entries: [] }),
}));
