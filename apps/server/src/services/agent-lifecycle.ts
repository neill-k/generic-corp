export type AgentResultStatus = "success" | "error" | "max_turns";

export type AgentResult = {
  output: string;
  costUsd: number;
  durationMs: number;
  numTurns: number;
  status: AgentResultStatus;
};

export type AgentEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_use"; tool: string; input: unknown }
  | { type: "tool_result"; tool: string; output: string }
  | { type: "message"; content: string }
  | { type: "result"; result: AgentResult };

export type McpServerInstance = unknown;

export type McpServerFactory = (agentId: string, taskId: string) => McpServerInstance;

export type AgentInvocation = {
  agentId: string;
  taskId: string;
  prompt: string;
  systemPrompt: string;
  cwd: string;
  mcpServer: McpServerInstance;
  allowedTools?: string[];
  model?: string;
};

export interface AgentRuntime {
  invoke(params: AgentInvocation): AsyncGenerator<AgentEvent>;
}
