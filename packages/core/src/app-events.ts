import type { AgentEvent } from "@generic-corp/sdk";
import type { PluginEventMap } from "@generic-corp/sdk";
import { EventBus } from "./event-bus.js";

/** Every event payload must include the org it belongs to. */
export type TenantEventBase = { orgSlug: string };

export type AppEventMap = {
  agent_event: TenantEventBase & { agentId: string; agentDbId?: string; taskId: string; event: AgentEvent };
  agent_status_changed: TenantEventBase & { agentId: string; status: string };
  task_status_changed: TenantEventBase & { taskId: string; status: string };
  task_created: TenantEventBase & { taskId: string; assignee: string; delegator: string | null };
  message_created: TenantEventBase & { messageId: string; threadId: string; fromAgentId: string | null; toAgentId: string };
  thread_deleted: TenantEventBase & { threadId: string; messagesRemoved: number };
  board_item_created: TenantEventBase & { type: string; author: string; path: string };
  board_item_updated: TenantEventBase & { type: string; author: string; path: string };
  board_item_archived: TenantEventBase & { path: string; archivedPath: string };
  agent_updated: TenantEventBase & { agentId: string };
  agent_deleted: TenantEventBase & { agentId: string };
  message_updated: TenantEventBase & { messageId: string };
  message_deleted: TenantEventBase & { messageId: string };
  task_updated: TenantEventBase & { taskId: string };
  org_changed: TenantEventBase;
  workspace_updated: TenantEventBase & { workspaceId: string };
  tool_permission_created: TenantEventBase & { toolPermissionId: string };
  tool_permission_updated: TenantEventBase & { toolPermissionId: string };
  tool_permission_deleted: TenantEventBase & { toolPermissionId: string };
  mcp_server_created: TenantEventBase & { mcpServerId: string };
  mcp_server_updated: TenantEventBase & { mcpServerId: string };
  mcp_server_deleted: TenantEventBase & { mcpServerId: string };
  mcp_server_status_changed: TenantEventBase & { mcpServerId: string; status: string };
};

export type CoreEventMap = AppEventMap & PluginEventMap;

export const appEventBus = new EventBus<CoreEventMap>();
