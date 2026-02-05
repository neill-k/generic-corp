import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import type { PrismaClient } from "@prisma/client";

import type { AgentRuntime } from "../services/agent-lifecycle.js";
import {
  createTaskTools,
  createAgentTools,
  createMessageTools,
  createBoardTools,
  createOrgTools,
  createWorkspaceTools,
  createMcpConfigTools,
  createPermissionTools,
  createOrganizationTools,
  type McpToolContext,
} from "./tools/index.js";

export interface McpServerDeps {
  prisma: PrismaClient;
  orgSlug: string;
  agentId: string;
  taskId: string;
  runtime?: AgentRuntime;
}

/**
 * Create the Generic Corp MCP server with all tools composed from domain modules.
 *
 * Each tool module follows the "Tools as Primitives" principle:
 * - Tools provide capability (read, write, list), not behavior
 * - Business logic lives in services, not in tool handlers
 * - Tools are thin wrappers that call services and format responses
 */
export function createGcMcpServer(deps: McpServerDeps) {
  const ctx: McpToolContext = {
    prisma: deps.prisma,
    orgSlug: deps.orgSlug,
    agentId: deps.agentId,
    taskId: deps.taskId,
    runtime: deps.runtime,
  };

  return createSdkMcpServer({
    name: "generic-corp",
    version: "1.0.0",
    tools: [
      // Task management: delegate, finish, get, list, update, cancel, delete, board view
      ...createTaskTools(ctx),

      // Agent management: status, list, create, update, delete, metrics, system prompt
      ...createAgentTools(ctx),

      // Messaging: send, read, threads, summary, delete
      ...createMessageTools(ctx),

      // Board: query, post, update, archive
      ...createBoardTools(ctx),

      // Org hierarchy: get_my_org, list nodes, create/update/delete nodes
      ...createOrgTools(ctx),

      // Workspace settings
      ...createWorkspaceTools(ctx),

      // MCP server configuration
      ...createMcpConfigTools(ctx),

      // Tool permissions
      ...createPermissionTools(ctx),

      // Multi-tenant organization management
      ...createOrganizationTools(),
    ],
  });
}
