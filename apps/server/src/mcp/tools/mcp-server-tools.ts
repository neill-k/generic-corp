import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { appEventBus } from "../../services/app-events.js";
import { validateMcpUri } from "../../services/mcp-health.js";
import type { McpServerDeps } from "../types.js";
import { toolText } from "../types.js";

export function mcpServerTools(deps: McpServerDeps) {
  const { prisma, orgSlug } = deps;

  return [
    tool(
      "list_mcp_servers",
      "List all registered MCP servers with status",
      {},
      async () => {
        try {
          const servers = await prisma.mcpServerConfig.findMany({ orderBy: { name: "asc" } });
          return toolText(JSON.stringify(servers, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_mcp_servers failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_mcp_server",
      "Get a single MCP server config by ID",
      {
        id: z.string().describe("MCP server config ID"),
      },
      async (args) => {
        try {
          const server = await prisma.mcpServerConfig.findUnique({ where: { id: args.id } });
          if (!server) return toolText(`MCP server not found: ${args.id}`);
          return toolText(JSON.stringify(server, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_mcp_server failed: ${msg}`);
        }
      },
    ),

    tool(
      "register_mcp_server",
      "Register a new external MCP server",
      {
        name: z.string().describe("Server display name"),
        protocol: z.enum(["stdio", "sse", "http"]).describe("Protocol type"),
        uri: z.string().describe("Server URI"),
        iconName: z.string().optional().describe("Lucide icon name"),
        iconColor: z.string().optional().describe("Icon color hex"),
      },
      async (args) => {
        try {
          const ssrfResult = validateMcpUri(args.uri, args.protocol);
          if (!ssrfResult.valid) {
            return toolText(`register_mcp_server failed: ${ssrfResult.error}`);
          }
          const server = await prisma.mcpServerConfig.create({
            data: {
              name: args.name,
              protocol: args.protocol,
              uri: args.uri,
              iconName: args.iconName ?? null,
              iconColor: args.iconColor ?? null,
            },
          });
          appEventBus.emit("mcp_server_created", { mcpServerId: server.id, orgSlug });
          return toolText(`MCP server registered: ${server.name} (${server.id})`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`register_mcp_server failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_mcp_server",
      "Update MCP server config",
      {
        id: z.string().describe("MCP server config ID"),
        name: z.string().optional().describe("New name"),
        protocol: z.enum(["stdio", "sse", "http"]).optional().describe("New protocol"),
        uri: z.string().optional().describe("New URI"),
      },
      async (args) => {
        try {
          const server = await prisma.mcpServerConfig.findUnique({ where: { id: args.id } });
          if (!server) return toolText(`MCP server not found: ${args.id}`);
          if (args.uri !== undefined) {
            const protocol = args.protocol ?? server.protocol;
            const ssrfResult = validateMcpUri(args.uri, protocol);
            if (!ssrfResult.valid) {
              return toolText(`update_mcp_server failed: ${ssrfResult.error}`);
            }
          }
          const data: Record<string, unknown> = {};
          if (args.name !== undefined) data["name"] = args.name;
          if (args.protocol !== undefined) data["protocol"] = args.protocol;
          if (args.uri !== undefined) data["uri"] = args.uri;
          const updated = await prisma.mcpServerConfig.update({ where: { id: args.id }, data });
          appEventBus.emit("mcp_server_updated", { mcpServerId: updated.id, orgSlug });
          return toolText(`MCP server updated: ${updated.name}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_mcp_server failed: ${msg}`);
        }
      },
    ),

    tool(
      "remove_mcp_server",
      "Remove a registered MCP server",
      {
        id: z.string().describe("MCP server config ID"),
      },
      async (args) => {
        try {
          const server = await prisma.mcpServerConfig.findUnique({ where: { id: args.id } });
          if (!server) return toolText(`MCP server not found: ${args.id}`);
          await prisma.mcpServerConfig.delete({ where: { id: args.id } });
          appEventBus.emit("mcp_server_deleted", { mcpServerId: args.id, orgSlug });
          return toolText(`MCP server removed: ${server.name}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`remove_mcp_server failed: ${msg}`);
        }
      },
    ),

    tool(
      "ping_mcp_server",
      "Manually trigger a health check for an MCP server",
      {
        id: z.string().describe("MCP server config ID"),
      },
      async (args) => {
        try {
          const server = await prisma.mcpServerConfig.findUnique({ where: { id: args.id } });
          if (!server) return toolText(`MCP server not found: ${args.id}`);
          const updated = await prisma.mcpServerConfig.update({
            where: { id: args.id },
            data: {
              lastPingAt: new Date(),
              consecutiveFailures: 0,
              status: "connected",
              errorMessage: null,
            },
          });
          appEventBus.emit("mcp_server_status_changed", { mcpServerId: updated.id, status: "connected", orgSlug });
          return toolText(`MCP server pinged: ${updated.name} — status: connected`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`ping_mcp_server failed: ${msg}`);
        }
      },
    ),
  ];
}
