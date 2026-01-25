// MCP Tools Module
// This module provides Model Context Protocol tools for AI agents

export {
  getMcpTools,
  getMcpToolsForRole,
  canAccessTool,
  executeMcpTool,
  processToolUse,
} from "./mcp-client.js";

export type { ToolContext, ToolResult } from "./mcp-client.js";

export {
  toolDefinitions,
  toolPermissions,
  getToolsForRole,
  hasToolAccess,
} from "./definitions/index.js";

// Handler exports for direct access if needed
export * as filesystemHandlers from "./handlers/filesystem.js";
export * as gitHandlers from "./handlers/git.js";
export * as messagingHandlers from "./handlers/messaging.js";
export * as taskHandlers from "./handlers/tasks.js";
export * as shellHandlers from "./handlers/shell.js";
