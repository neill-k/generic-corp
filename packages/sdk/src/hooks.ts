export interface BeforeToolExecutionContext {
  agentId: string;
  taskId: string;
  toolName: string;
  toolArgs: Record<string, unknown>;
  skip: boolean;
}

export interface AfterToolExecutionContext {
  agentId: string;
  taskId: string;
  toolName: string;
  result: unknown;
  durationMs: number;
}

export interface BeforePromptBuildContext {
  agentId: string;
  taskId: string;
  extraSections: string[];
  skills: string[];
}

export interface AfterPromptBuildContext {
  agentId: string;
  taskId: string;
  systemPrompt: string;
}

export interface OnTaskCreatedContext {
  taskId: string;
  assigneeId: string;
  delegatorId: string | null;
}

export interface OnTaskCompletedContext {
  taskId: string;
  status: string;
  result: string | null;
}

export interface OnAgentCreatedContext {
  agentId: string;
  agentName: string;
}

export interface OnAgentDeletedContext {
  agentId: string;
}

export type HookContextMap = {
  beforeToolExecution: BeforeToolExecutionContext;
  afterToolExecution: AfterToolExecutionContext;
  beforePromptBuild: BeforePromptBuildContext;
  afterPromptBuild: AfterPromptBuildContext;
  onTaskCreated: OnTaskCreatedContext;
  onTaskCompleted: OnTaskCompletedContext;
  onAgentCreated: OnAgentCreatedContext;
  onAgentDeleted: OnAgentDeletedContext;
};

export type HookName = keyof HookContextMap;

export type HookHandler<K extends HookName> = (
  context: HookContextMap[K],
  next: () => Promise<void>,
) => Promise<void>;

export type Unsubscribe = () => void;

export interface HookRegistrar {
  tap<K extends HookName>(hookName: K, handler: HookHandler<K>, priority?: number): Unsubscribe;
}
