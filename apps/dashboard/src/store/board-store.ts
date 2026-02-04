import { create } from "zustand";

interface BoardState {
  view: "board" | "list" | "items";
  search: string;
  assignee: string;
  priority: string;
  department: string;
  setView: (v: "board" | "list" | "items") => void;
  setSearch: (s: string) => void;
  setAssignee: (a: string) => void;
  setPriority: (p: string) => void;
  setDepartment: (d: string) => void;
  resetFilters: () => void;
}

const initialFilters = {
  search: "",
  assignee: "",
  priority: "",
  department: "",
};

export const useBoardStore = create<BoardState>((set) => ({
  view: "board",
  ...initialFilters,
  setView: (view) => set({ view }),
  setSearch: (search) => set({ search }),
  setAssignee: (assignee) => set({ assignee }),
  setPriority: (priority) => set({ priority }),
  setDepartment: (department) => set({ department }),
  resetFilters: () => set(initialFilters),
}));
