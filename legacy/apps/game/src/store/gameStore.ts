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
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;

  // Messages
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;

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

  // UI state
  activePanel: "dashboard" | "messages";
  setActivePanel: (panel: "dashboard" | "messages") => void;
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
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => {
      // Check if task already exists
      const exists = state.tasks.some((t) => t.id === task.id);
      if (exists) {
        return {
          tasks: state.tasks.map((t) => (t.id === task.id ? task : t)),
        };
      }
      return {
        tasks: [task, ...state.tasks].slice(0, 100), // Keep last 100
      };
    }),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    })),

  // Messages
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => {
      // Check if message already exists
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) {
        return {
          messages: state.messages.map((m) => (m.id === message.id ? message : m)),
        };
      }
      return {
        messages: [message, ...state.messages].slice(0, 100), // Keep last 100
      };
    }),
  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
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

  // UI state
  activePanel: "dashboard",
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
