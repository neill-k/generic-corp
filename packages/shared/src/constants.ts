// ── Enum tuples (single source of truth) ────────────────────────────

export const AGENT_LEVELS = ["ic", "lead", "manager", "vp", "c-suite", "system"] as const;
export const ASSIGNABLE_AGENT_LEVELS = ["ic", "lead", "manager", "vp", "c-suite"] as const;

export const AGENT_STATUSES = ["idle", "running", "error", "offline"] as const;

export const TASK_STATUSES = ["pending", "running", "review", "completed", "failed", "blocked"] as const;

export const KANBAN_COLUMNS = ["backlog", "in_progress", "review", "done"] as const;

export const MESSAGE_TYPES = ["direct", "system", "chat"] as const;
export const MESSAGE_STATUSES = ["pending", "delivered", "read"] as const;

export const BOARD_ITEM_TYPES = ["status_update", "blocker", "finding", "request"] as const;

export const MCP_SERVER_PROTOCOLS = ["stdio", "sse", "http"] as const;
export const MCP_SERVER_STATUSES = ["connected", "disconnected", "error"] as const;

export const TENANT_STATUSES = ["active", "suspended"] as const;

// ── Derived mappings ────────────────────────────────────────────────

export const BOARD_TYPE_TO_FOLDER = {
  status_update: "status-updates",
  blocker: "blockers",
  finding: "findings",
  request: "requests",
} as const;

export const SOFT_CONTEXT_TOKEN_LIMIT = 6_000;

export const MAIN_AGENT_NAME = "main";

export const DEFAULT_AGENT_MODEL = "sonnet";
export const SUMMARIZER_MODEL = "haiku";
