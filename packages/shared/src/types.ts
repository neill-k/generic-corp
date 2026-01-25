// Agent types
export type AgentStatus = "idle" | "working" | "blocked" | "offline";

export interface AgentStats {
  tasksCompleted: number;
  successRate: number;
  tokensUsed: number;
  avgResponseTime: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  personalityPrompt: string;
  status: AgentStatus;
  /** Human-readable capabilities description */
  capabilities: string[];
  /** Tool access permissions - keys are tool names, values are access boolean */
  toolPermissions: Record<string, boolean>;
  avatarUrl?: string;
  stats?: AgentStats;
  /** Optimistic locking version */
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Task types
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "blocked"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export interface Task {
  id: string;
  agentId: string;
  createdBy: string;
  title: string;
  description: string;
  status: TaskStatus;
  previousStatus?: TaskStatus;
  priority: TaskPriority;
  progressPercent: number;
  progressDetails: Record<string, unknown>;
  deadline?: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorDetails?: Record<string, unknown>;
  version: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  deletedAt?: Date;
}

// Message types
export type MessageType = "direct" | "broadcast" | "system" | "external_draft";
export type MessageStatus =
  | "pending"
  | "delivered"
  | "read"
  | "approved"
  | "rejected";

export interface Message {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  subject: string;
  body: string;
  type: MessageType;
  status: MessageStatus;
  isExternalDraft: boolean;
  externalRecipient?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  readAt?: Date;
  deletedAt?: Date;
}

// Task dependency
export interface TaskDependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  depth: number;
}

// Activity log
export interface ActivityLog {
  id: string;
  agentId: string;
  taskId?: string;
  eventType: string;
  eventData: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}

// Activity event types for real-time feed
export type ActivityEventType =
  | "agent_status_changed"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "task_progress"
  | "tool_called"
  | "message_sent"
  | "message_received"
  | "draft_created"
  | "draft_approved"
  | "draft_rejected"
  | "error"
  | "system";

// Agent session
export interface AgentSession {
  id: string;
  agentId: string;
  claudeSessionId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelInfo: Record<string, unknown>;
  startedAt: Date;
  endedAt?: Date;
}

// Schedule
export interface Schedule {
  id: string;
  agentId: string;
  name: string;
  cronExpression: string;
  taskTemplate: string;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  failureCount: number;
  deletedAt?: Date;
}

// Game state
export interface GameState {
  id: string;
  playerId: string;
  cameraPosition: { x: number; y: number; zoom: number };
  uiState: Record<string, unknown>;
  budgetRemainingUsd: number;
  budgetLimitUsd: number;
  lastSyncAt: Date;
}

// Credential proxy
export interface CredentialProxy {
  id: string;
  name: string;
  service: string;
  encryptedValue: string;
  allowedAgents: string[];
  createdAt: Date;
  rotatedAt?: Date;
}

// Task result from agent execution
export interface TaskResult {
  success: boolean;
  output: string;
  tokensUsed: { input: number; output: number };
  costUsd: number;
  toolsUsed: string[];
  error?: string;
}

// WebSocket events
export interface AgentStatusEvent {
  agentId: string;
  status: AgentStatus;
}

export interface TaskProgressEvent {
  taskId: string;
  agentId: string;
  progress: number;
  details?: Record<string, unknown>;
}

export interface TaskCompletedEvent {
  taskId: string;
  agentId: string;
  result: TaskResult;
}

export interface TaskFailedEvent {
  taskId: string;
  agentId: string;
  error: string;
}

export interface MessageNewEvent {
  toAgentId: string;
  message: Message;
}

export interface DraftPendingEvent {
  draft: Message;
}

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  agentId: string | null;
  agentName: string | null;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// Initial state sent on WebSocket connect
export interface InitialState {
  agents: Agent[];
  pendingDrafts: Message[];
  gameState?: GameState;
  timestamp: number;
}
