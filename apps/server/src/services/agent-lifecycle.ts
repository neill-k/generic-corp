// Re-export from core — agent lifecycle types are now in @generic-corp/core
export type {
  AgentResultStatus,
  McpServerInstance,
  LegacyMcpServerFactory as McpServerFactory,
  AgentResult,
  AgentEvent,
  AgentInvocation,
} from "@generic-corp/core";
export { RuntimeProvider } from "@generic-corp/core";

// Import locally for use in the backward-compat interface below
import type { AgentInvocation as _AgentInvocation, AgentEvent as _AgentEvent } from "@generic-corp/core";

// Backward-compat: keep the AgentRuntime interface
export interface AgentRuntime {
  invoke(params: _AgentInvocation): AsyncGenerator<_AgentEvent>;
}
