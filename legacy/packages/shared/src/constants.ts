// Agent IDs
export const AGENT_IDS = {
  MARCUS: "marcus",
  SABLE: "sable",
  DEVONTE: "devonte",
  YUKI: "yuki",
  GRAY: "gray",
  MIRANDA: "miranda",
  HELEN: "helen",
  WALTER: "walter",
  FRANKIE: "frankie",
  KENJI: "kenji",
} as const;

export type AgentId = (typeof AGENT_IDS)[keyof typeof AGENT_IDS];

// Agent configurations
export const AGENT_CONFIGS: Record<
  AgentId,
  {
    name: string;
    role: string;
    autonomyLevel: "low" | "medium" | "high";
    canDraftExternal: boolean;
    capabilities: string[];
  }
> = {
  marcus: {
    name: "Marcus Bell",
    role: "CEO/Supervisor",
    autonomyLevel: "high",
    canDraftExternal: true,
    capabilities: ["task_routing", "team_coordination", "decision_making"],
  },
  sable: {
    name: "Sable Chen",
    role: "Principal Engineer",
    autonomyLevel: "medium",
    canDraftExternal: false,
    capabilities: [
      "architecture",
      "code_review",
      "system_design",
      "typescript",
      "python",
      "go",
    ],
  },
  devonte: {
    name: "DeVonte Jackson",
    role: "Full-Stack Developer",
    autonomyLevel: "medium",
    canDraftExternal: false,
    capabilities: [
      "frontend",
      "backend",
      "react",
      "nodejs",
      "ui_development",
    ],
  },
  yuki: {
    name: "Yuki Tanaka",
    role: "SRE",
    autonomyLevel: "medium",
    canDraftExternal: false,
    capabilities: ["infrastructure", "docker", "kubernetes", "monitoring"],
  },
  gray: {
    name: "Graham Sutton",
    role: "Data Engineer",
    autonomyLevel: "medium",
    canDraftExternal: false,
    capabilities: ["sql", "data_pipelines", "analytics", "etl"],
  },
  miranda: {
    name: "Miranda Okonkwo",
    role: "Software Engineer",
    autonomyLevel: "low",
    canDraftExternal: false,
    capabilities: ["general_development", "debugging", "testing"],
  },
  helen: {
    name: "Helen Marsh",
    role: "Executive Assistant",
    autonomyLevel: "low",
    canDraftExternal: true,
    capabilities: ["scheduling", "coordination", "documentation"],
  },
  walter: {
    name: "Walter Huang",
    role: "CFO",
    autonomyLevel: "low",
    canDraftExternal: false,
    capabilities: ["budget_tracking", "financial_analysis", "reporting"],
  },
  frankie: {
    name: "Frankie Deluca",
    role: "VP Sales",
    autonomyLevel: "low",
    canDraftExternal: true,
    capabilities: ["sales", "crm", "customer_relations"],
  },
  kenji: {
    name: "Kenji Ross",
    role: "Marketing",
    autonomyLevel: "low",
    canDraftExternal: true,
    capabilities: ["content_creation", "social_media", "branding"],
  },
};

// Tool permissions by role
export const TOOL_PERMISSIONS: Record<string, string[]> = {
  ceo: [
    "filesystem_read",
    "messaging_send",
    "messaging_check",
    "external_draft",
    "credential_use",
  ],
  principal_engineer: [
    "filesystem_read",
    "filesystem_write",
    "git_commit",
    "messaging_send",
    "messaging_check",
    "credential_use",
  ],
  fullstack: [
    "filesystem_read",
    "filesystem_write",
    "git_commit",
    "messaging_send",
    "messaging_check",
  ],
  sre: [
    "filesystem_read",
    "filesystem_write",
    "git_commit",
    "messaging_send",
    "messaging_check",
    "credential_use",
  ],
  data_engineer: [
    "filesystem_read",
    "filesystem_write",
    "database_query",
    "messaging_send",
    "messaging_check",
  ],
  software_engineer: [
    "filesystem_read",
    "filesystem_write",
    "git_commit",
    "messaging_send",
    "messaging_check",
  ],
  exec_assistant: [
    "filesystem_read",
    "messaging_send",
    "messaging_check",
    "external_draft",
  ],
  cfo: [
    "filesystem_read",
    "database_query",
    "messaging_send",
    "messaging_check",
  ],
  sales: ["messaging_send", "messaging_check", "external_draft"],
  marketing: [
    "filesystem_read",
    "messaging_send",
    "messaging_check",
    "external_draft",
  ],
};

// Valid task status transitions
export const VALID_TASK_TRANSITIONS: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["blocked", "completed", "failed"],
  blocked: ["in_progress", "cancelled"],
  completed: [], // Terminal
  failed: ["pending", "cancelled"], // Can retry
  cancelled: [], // Terminal
};

// WebSocket event names
export const WS_EVENTS = {
  // Server -> Client
  INIT: "init",
  AGENT_STATUS: "agent:status",
  TASK_PROGRESS: "task:progress",
  TASK_COMPLETED: "task:completed",
  TASK_FAILED: "task:failed",
  MESSAGE_NEW: "message:new",
  DRAFT_PENDING: "draft:pending",
  DRAFT_REJECTED: "draft:rejected",
  ACTIVITY_LOG: "activity:log",
  HEARTBEAT: "heartbeat",

  // Client -> Server
  TASK_ASSIGN: "task:assign",
  DRAFT_APPROVE: "draft:approve",
  DRAFT_REJECT: "draft:reject",
  MESSAGE_SEND: "message:send",
  STATE_SYNC: "state:sync",
} as const;

// BullMQ queue names
export const QUEUE_NAMES = {
  AGENT_TASKS: "agent-tasks",
  AGENT_SCHEDULER: "agent-scheduler",
  MESSAGES: "messages",
} as const;

// Default values
export const DEFAULTS = {
  MAX_TASK_RETRIES: 3,
  TASK_TIMEOUT_MS: 300000, // 5 minutes
  HEARTBEAT_INTERVAL_MS: 300000, // 5 minutes
  WS_HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  MAX_BUDGET_USD: 100.0,
  MAX_ACTIVITY_HISTORY: 100,
} as const;
