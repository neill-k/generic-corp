import Anthropic from "@anthropic-ai/sdk";
import {
  toolDefinitions,
  getToolsForRole,
  hasToolAccess,
} from "./definitions/index.js";
import * as filesystemHandlers from "./handlers/filesystem.js";
import * as gitHandlers from "./handlers/git.js";
import * as messagingHandlers from "./handlers/messaging.js";
import * as taskHandlers from "./handlers/tasks.js";
import * as shellHandlers from "./handlers/shell.js";

export interface ToolContext {
  agentId: string;
  agentName: string;
  taskId?: string;
}

export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

// Tool handler registry
type ToolHandler = (
  params: unknown,
  context: ToolContext
) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
  // Filesystem tools
  filesystem_read: (params) =>
    filesystemHandlers.filesystemRead(params as { path: string }),
  filesystem_write: (params) =>
    filesystemHandlers.filesystemWrite(
      params as { path: string; content: string }
    ),
  filesystem_list: (params) =>
    filesystemHandlers.filesystemList(params as { path: string }),

  // Git tools
  git_status: (params) =>
    gitHandlers.gitStatus(params as { repoPath: string }),
  git_commit: (params) =>
    gitHandlers.gitCommit(
      params as { repoPath: string; message: string; files?: string[] }
    ),

  // Messaging tools
  message_send: (params, context) =>
    messagingHandlers.messageSend(
      params as { toAgentId: string; subject: string; body: string },
      context
    ),
  message_check_inbox: (params, context) =>
    messagingHandlers.messageCheckInbox(
      params as { unreadOnly?: boolean },
      context
    ),
  external_draft_email: (params, context) =>
    messagingHandlers.externalDraftEmail(
      params as { to: string; subject: string; body: string },
      context
    ),

  // Task tools
  task_create: (params, context) =>
    taskHandlers.taskCreate(
      params as {
        title: string;
        description: string;
        assigneeId: string;
        priority?: "urgent" | "high" | "normal" | "low";
        acceptanceCriteria?: string[];
      },
      context
    ),

  // Shell tools
  shell_exec: (params) =>
    shellHandlers.shellExec(params as { command: string; cwd?: string }),
};

/**
 * Get all tool definitions
 */
export function getMcpTools(): Anthropic.Tool[] {
  return toolDefinitions;
}

/**
 * Get tools available to a specific role
 */
export function getMcpToolsForRole(role: string): Anthropic.Tool[] {
  return getToolsForRole(role);
}

/**
 * Check if an agent role can access a tool
 */
export function canAccessTool(role: string, toolName: string): boolean {
  return hasToolAccess(role, toolName);
}

/**
 * Execute a tool and return the result
 */
export async function executeMcpTool(
  toolName: string,
  params: unknown,
  context: ToolContext
): Promise<ToolResult> {
  const handler = toolHandlers[toolName];

  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    const result = await handler(params, context);
    return {
      success: true,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process a tool use block from Claude's response
 */
export async function processToolUse(
  toolUse: { name: string; input: unknown },
  context: ToolContext,
  role?: string
): Promise<{
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}> {
  // Check permission if role provided
  if (role && !hasToolAccess(role, toolUse.name)) {
    return {
      tool_use_id: toolUse.name,
      content: JSON.stringify({
        error: `Access denied: ${role} cannot use tool ${toolUse.name}`,
      }),
      is_error: true,
    };
  }

  // Execute the tool
  const result = await executeMcpTool(toolUse.name, toolUse.input, context);

  return {
    tool_use_id: toolUse.name,
    content: JSON.stringify(result.success ? result.result : { error: result.error }),
    is_error: !result.success,
  };
}

// Re-export types
export type { ToolContext, ToolResult };
