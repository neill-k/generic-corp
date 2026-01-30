export type AgentLevel = "ic" | "lead" | "manager" | "vp" | "c-suite";

export type AgentStatus = "idle" | "running" | "error" | "offline";

export type TaskStatus = "pending" | "running" | "completed" | "failed" | "blocked";

export type MessageType = "direct" | "system" | "chat";
export type MessageStatus = "pending" | "delivered" | "read";

export type BoardItemType = "status_update" | "blocker" | "finding" | "request";

export interface AgentRecord {
  id: string;
  name: string;
  displayName: string;
  role: string;
  department: string;
  level: AgentLevel;
  personality: string;
  status: AgentStatus;
  currentTaskId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRecord {
  id: string;
  parentTaskId: string | null;
  assigneeId: string;
  delegatorId: string | null;
  prompt: string;
  context: string | null;
  priority: number;
  status: TaskStatus;
  result: string | null;
  learnings: string | null;
  costUsd: number | null;
  durationMs: number | null;
  numTurns: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface MessageRecord {
  id: string;
  fromAgentId: string | null;
  toAgentId: string;
  threadId: string | null;
  subject: string | null;
  body: string;
  type: MessageType;
  status: MessageStatus;
  createdAt: Date;
  readAt: Date | null;
}

export interface OrgNodeRecord {
  id: string;
  agentId: string;
  parentNodeId: string | null;
  position: number;
}

export interface AgentResult {
  output: string;
  costUsd: number;
  durationMs: number;
  numTurns: number;
  status: "success" | "error" | "max_turns";
}

export type AgentEvent =
  | { type: "thinking"; content: string }
  | { type: "tool_use"; tool: string; input: unknown }
  | { type: "tool_result"; tool: string; output: string }
  | { type: "message"; content: string }
  | { type: "result"; result: AgentResult };

export interface AgentInvocation {
  agentId: string;
  taskId: string;
  prompt: string;
  systemPrompt: string;
  cwd: string;
  mcpServer: unknown;
  allowedTools?: string[];
  model?: string;
}

export interface ApiErrorResponse {
  error: string;
}

export interface WsEventBase {
  type: string;
}

export interface WsAgentEvent extends WsEventBase {
  type: "agent_event";
  agentId: string;
  taskId: string;
  event: AgentEvent;
}

export interface WsSnapshotEvent extends WsEventBase {
  type: "snapshot";
  serverTime: string;
}

export type WsOutboundEvent = WsAgentEvent | WsSnapshotEvent;
