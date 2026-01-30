import { create } from "zustand";
import type { ApiAgentSummary } from "@generic-corp/shared";

interface AgentState {
  agents: ApiAgentSummary[];
  setAgents: (agents: ApiAgentSummary[]) => void;
  updateAgentStatus: (agentId: string, status: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (agentId, status) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.name === agentId ? { ...a, status: status as ApiAgentSummary["status"] } : a,
      ),
    })),
}));
