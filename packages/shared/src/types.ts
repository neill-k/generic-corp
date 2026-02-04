export type AgentLevel = "ic" | "lead" | "manager" | "vp" | "c-suite" | "system";

export type AgentStatus = "idle" | "running" | "error" | "offline";

export type TaskStatus = "pending" | "running" | "review" | "completed" | "failed" | "blocked";
export type KanbanColumn = "backlog" | "in_progress" | "review" | "done";

export const STATUS_TO_COLUMN: Record<TaskStatus, KanbanColumn> = {
  pending: "backlog",
  running: "in_progress",
  review: "review",
  completed: "done",
  failed: "done",
  blocked: "backlog",
};

export type MessageType = "direct" | "system" | "chat";
export type MessageStatus = "pending" | "delivered" | "read";

export type BoardItemType = "status_update" | "blocker" | "finding" | "request";

export interface TaskTag {
  label: string;
  color: string;
  bg: string;
}

export type McpServerProtocol = "stdio" | "sse" | "http";
export type McpServerStatus = "connected" | "disconnected" | "error";

export interface WorkspaceRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  language: string;
  llmProvider: string;
  llmModel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface McpServerConfigRecord {
  id: string;
  name: string;
  protocol: McpServerProtocol;
  uri: string;
  status: McpServerStatus;
  toolCount: number;
  lastPingAt: Date | null;
  errorMessage: string | null;
  iconName: string | null;
  iconColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolPermissionRecord {
  id: string;
  name: string;
  description: string;
  iconName: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  toolPermissions: Record<string, boolean>;
  avatarColor: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskRecord {
  id: string;
  parentTaskId: string | null;
  assigneeId: string | null;
  delegatorId: string | null;
  prompt: string;
  context: string | null;
  priority: number;
  status: TaskStatus;
  tags: TaskTag[];
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
  positionX: number;
  positionY: number;
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
  agentDbId?: string;
  taskId: string;
  event: AgentEvent;
}

export interface WsSnapshotEvent extends WsEventBase {
  type: "snapshot";
  serverTime: string;
}

export interface WsAgentStatusChanged extends WsEventBase {
  type: "agent_status_changed";
  agentId: string;
  status: string;
}

export interface WsTaskStatusChanged extends WsEventBase {
  type: "task_status_changed";
  taskId: string;
  status: string;
}

export interface WsTaskCreated extends WsEventBase {
  type: "task_created";
  taskId: string;
  assignee: string;
  delegator: string | null;
}

export interface WsMessageCreated extends WsEventBase {
  type: "message_created";
  messageId: string;
  threadId: string;
  fromAgentId: string | null;
  toAgentId: string;
}

export interface WsBoardItemCreated extends WsEventBase {
  type: "board_item_created";
  boardType: string;
  author: string;
  path: string;
}

export interface WsBoardItemArchived extends WsEventBase {
  type: "board_item_archived";
  path: string;
  archivedPath: string;
}

export interface WsAgentUpdated extends WsEventBase {
  type: "agent_updated";
  agentId: string;
}

export interface WsAgentDeleted extends WsEventBase {
  type: "agent_deleted";
  agentId: string;
}

export interface WsMessageUpdated extends WsEventBase {
  type: "message_updated";
  messageId: string;
}

export interface WsMessageDeleted extends WsEventBase {
  type: "message_deleted";
  messageId: string;
}

export interface WsThreadDeleted extends WsEventBase {
  type: "thread_deleted";
  threadId: string;
  messagesRemoved: number;
}

export interface WsTaskUpdated extends WsEventBase {
  type: "task_updated";
  taskId: string;
}

export interface WsOrgChanged extends WsEventBase {
  type: "org_changed";
}

export type WsOutboundEvent =
  | WsAgentEvent
  | WsSnapshotEvent
  | WsAgentStatusChanged
  | WsTaskStatusChanged
  | WsTaskCreated
  | WsMessageCreated
  | WsBoardItemCreated
  | WsBoardItemArchived
  | WsAgentUpdated
  | WsAgentDeleted
  | WsMessageUpdated
  | WsMessageDeleted
  | WsThreadDeleted
  | WsTaskUpdated
  | WsOrgChanged;

// --- Main Agent Streaming Types ---

/** Server → Client streaming events for the main agent chat */
export type MainAgentStreamEvent =
  | { type: "turn_start"; turnId: string; threadId: string }
  | { type: "text_delta"; turnId: string; threadId: string; delta: string }
  | { type: "thinking_delta"; turnId: string; threadId: string; delta: string }
  | { type: "tool_start"; turnId: string; threadId: string; toolUseId: string; toolName: string; input: unknown }
  | { type: "tool_result"; turnId: string; threadId: string; toolUseId: string; toolName: string; output: string; isError: boolean }
  | { type: "turn_complete"; turnId: string; threadId: string; messageId: string; fullText: string; costUsd: number; durationMs: number }
  | { type: "stream_error"; turnId: string; threadId: string; error: string };

/** Client → Server: send a chat message */
export interface ChatMessagePayload {
  body: string;
  threadId: string;
}

/** Client → Server: interrupt an active stream */
export interface ChatInterruptPayload {
  threadId: string;
}

// --- API Response Types ---

export interface ApiAgentSummary {
  id: string;
  name: string;
  displayName: string;
  role: string;
  department: string;
  level: AgentLevel;
  status: AgentStatus;
  currentTaskId: string | null;
}

export interface ApiAgentDetail extends ApiAgentSummary {
  personality: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiOrgNode {
  nodeId: string;
  agent: ApiAgentSummary;
  parentAgentId: string | null;
  parentNodeId: string | null;
  positionX: number;
  positionY: number;
  children: ApiOrgNode[];
}

export interface ApiBoardItem {
  author: string;
  type: BoardItemType;
  summary: string;
  timestamp: string;
  path: string;
}

export interface ApiThread {
  threadId: string;
  agentId: string;
  agentName: string;
  lastMessageAt: string;
  preview: string;
}

export interface ApiMessage {
  id: string;
  fromAgentId: string | null;
  toAgentId: string;
  threadId: string | null;
  body: string;
  type: MessageType;
  createdAt: string;
}
