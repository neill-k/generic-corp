import { create } from "zustand";
import type { Agent, Task, Message, ActivityEvent } from "@generic-corp/shared";

interface GameState {
  // Connection state
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;

  // Pending drafts
  pendingDrafts: Message[];
  setPendingDrafts: (drafts: Message[]) => void;
  addPendingDraft: (draft: Message) => void;
  removePendingDraft: (draftId: string) => void;

  // Activity feed
  activities: ActivityEvent[];
  addActivity: (activity: ActivityEvent) => void;

  // Selected agent for detail view
  selectedAgentId: string | null;
  setSelectedAgent: (agentId: string | null) => void;

  // Game viewport state
  camera: { x: number; y: number; zoom: number };
  setCamera: (camera: { x: number; y: number; zoom: number }) => void;

  // Budget tracking
  budget: { remaining: number; limit: number };
  setBudget: (budget: { remaining: number; limit: number }) => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgent: (agentId, updates) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === agentId ? { ...a, ...updates } : a
      ),
    })),

  // Tasks
  tasks: [],
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks].slice(0, 100), // Keep last 100
    })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    })),

  // Pending drafts
  pendingDrafts: [],
  setPendingDrafts: (drafts) => set({ pendingDrafts: drafts }),
  addPendingDraft: (draft) =>
    set((state) => ({
      pendingDrafts: [draft, ...state.pendingDrafts],
    })),
  removePendingDraft: (draftId) =>
    set((state) => ({
      pendingDrafts: state.pendingDrafts.filter((d) => d.id !== draftId),
    })),

  // Activity feed
  activities: [],
  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities].slice(0, 50), // Keep last 50
    })),

  // Selected agent
  selectedAgentId: null,
  setSelectedAgent: (agentId) => set({ selectedAgentId: agentId }),

  // Camera
  camera: { x: 400, y: 300, zoom: 1.5 },
  setCamera: (camera) => set({ camera }),

  // Budget
  budget: { remaining: 100, limit: 100 },
  setBudget: (budget) => set({ budget }),
}));
