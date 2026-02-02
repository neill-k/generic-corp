// Re-export types from SDK and shared for backward compat
export type {
  AgentResult,
  AgentEvent,
  AgentInvocation,
} from "@generic-corp/sdk";

export { RuntimeProvider } from "@generic-corp/sdk";

export type AgentResultStatus = "success" | "error" | "max_turns";

export type McpServerInstance = unknown;

export type LegacyMcpServerFactory = (agentId: string, taskId: string) => McpServerInstance;
