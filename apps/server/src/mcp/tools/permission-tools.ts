import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { appEventBus } from "../../services/app-events.js";
import type { McpToolContext } from "./shared.js";
import { toolText, getAgentByIdOrName } from "./shared.js";

export function createPermissionTools(ctx: McpToolContext) {
  const { prisma, orgSlug } = ctx;

  return [
    tool(
      "list_tool_permissions",
      "List all tool permissions with enabled state",
      {},
      async () => {
        try {
          const perms = await prisma.toolPermission.findMany({ orderBy: { name: "asc" } });
          return toolText(JSON.stringify(perms, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_tool_permissions failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_tool_permission",
      "Get a single tool permission by ID",
      {
        id: z.string().describe("Tool permission ID"),
      },
      async (args) => {
        try {
          const perm = await prisma.toolPermission.findUnique({ where: { id: args.id } });
          if (!perm) return toolText(`Tool permission not found: ${args.id}`);
          return toolText(JSON.stringify(perm, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_tool_permission failed: ${msg}`);
        }
      },
    ),

    tool(
      "create_tool_permission",
      "Create a new tool permission",
      {
        name: z.string().describe("Permission name (e.g. 'bash', 'deploy')"),
        description: z.string().describe("What this permission allows"),
        iconName: z.string().describe("Lucide icon name"),
        enabled: z.boolean().optional().describe("Workspace-level default (true)"),
      },
      async (args) => {
        try {
          const perm = await prisma.toolPermission.create({
            data: {
              name: args.name,
              description: args.description,
              iconName: args.iconName,
              enabled: args.enabled ?? true,
            },
          });
          appEventBus.emit("tool_permission_created", { toolPermissionId: perm.id, orgSlug });
          return toolText(`Tool permission created: ${perm.name} (${perm.id})`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`create_tool_permission failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_tool_permission",
      "Toggle or update a tool permission",
      {
        id: z.string().describe("Tool permission ID"),
        enabled: z.boolean().optional().describe("Enable/disable"),
        description: z.string().optional().describe("New description"),
      },
      async (args) => {
        try {
          const perm = await prisma.toolPermission.findUnique({ where: { id: args.id } });
          if (!perm) return toolText(`Tool permission not found: ${args.id}`);
          const data: Record<string, unknown> = {};
          if (args.enabled !== undefined) data["enabled"] = args.enabled;
          if (args.description !== undefined) data["description"] = args.description;
          const updated = await prisma.toolPermission.update({ where: { id: args.id }, data });
          appEventBus.emit("tool_permission_updated", { toolPermissionId: updated.id, orgSlug });
          return toolText(`Tool permission updated: ${updated.name} (enabled: ${updated.enabled})`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_tool_permission failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_tool_permission",
      "Remove a tool permission",
      {
        id: z.string().describe("Tool permission ID"),
      },
      async (args) => {
        try {
          const perm = await prisma.toolPermission.findUnique({ where: { id: args.id } });
          if (!perm) return toolText(`Tool permission not found: ${args.id}`);
          await prisma.toolPermission.delete({ where: { id: args.id } });
          appEventBus.emit("tool_permission_deleted", { toolPermissionId: args.id, orgSlug });
          return toolText(`Tool permission deleted: ${perm.name}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_tool_permission failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_agent_tool_permissions",
      "Get an agent's merged tool permissions (workspace default + agent override)",
      {
        agentName: z.string().describe("Agent name (slug)"),
      },
      async (args) => {
        try {
          const agent = await getAgentByIdOrName(prisma, args.agentName);
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);
          const perms = await prisma.toolPermission.findMany({ orderBy: { name: "asc" } });
          const overrides = (agent.toolPermissions as Record<string, boolean>) ?? {};
          const merged = perms.map((p: typeof perms[number]) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            enabled: overrides[p.name] !== undefined ? overrides[p.name] : p.enabled,
            overridden: overrides[p.name] !== undefined,
          }));
          return toolText(JSON.stringify(merged, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_agent_tool_permissions failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_agent_tool_permissions",
      "Update an agent's tool permission overrides",
      {
        agentName: z.string().describe("Agent name (slug)"),
        permissions: z.record(z.string(), z.boolean()).describe("Map of permission name to enabled state"),
      },
      async (args) => {
        try {
          const agent = await getAgentByIdOrName(prisma, args.agentName);
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);
          const existing = (agent.toolPermissions as Record<string, boolean>) ?? {};
          const merged = { ...existing, ...args.permissions };
          await prisma.agent.update({
            where: { id: agent.id },
            data: { toolPermissions: merged },
          });
          appEventBus.emit("agent_updated", { agentId: agent.id, orgSlug });
          return toolText(`Agent ${agent.name} tool permissions updated.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_agent_tool_permissions failed: ${msg}`);
        }
      },
    ),
  ];
}
