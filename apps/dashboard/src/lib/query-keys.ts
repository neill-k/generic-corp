export const queryKeys = {
  workspace: {
    all: ["workspace"] as const,
    detail: () => [...queryKeys.workspace.all, "detail"] as const,
  },
  toolPermissions: {
    all: ["tool-permissions"] as const,
    list: () => [...queryKeys.toolPermissions.all, "list"] as const,
  },
  mcpServers: {
    all: ["mcp-servers"] as const,
    list: () => [...queryKeys.mcpServers.all, "list"] as const,
  },
  agents: {
    all: ["agents"] as const,
    list: () => [...queryKeys.agents.all, "list"] as const,
    detail: (id: string) => [...queryKeys.agents.all, id] as const,
    metrics: (id: string) => [...queryKeys.agents.all, id, "metrics"] as const,
    toolPermissions: (id: string) =>
      [...queryKeys.agents.all, id, "tool-permissions"] as const,
    systemPrompt: (id: string) =>
      [...queryKeys.agents.all, id, "system-prompt"] as const,
    context: (id: string) =>
      [...queryKeys.agents.all, id, "context"] as const,
    results: (id: string) =>
      [...queryKeys.agents.all, id, "results"] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.tasks.all, "list", filters] as const,
    board: (filters?: Record<string, unknown>) =>
      [...queryKeys.tasks.all, "board", filters] as const,
    detail: (id: string) => [...queryKeys.tasks.all, id] as const,
  },
  boardItems: {
    all: ["board-items"] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.boardItems.all, "list", filters] as const,
    archived: () => [...queryKeys.boardItems.all, "archived"] as const,
  },
};
