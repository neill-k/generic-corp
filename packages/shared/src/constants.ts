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
