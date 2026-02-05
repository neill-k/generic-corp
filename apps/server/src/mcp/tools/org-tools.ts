import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { appEventBus } from "../../services/app-events.js";
import type { McpToolContext } from "./shared.js";
import { toolText, getAgentByIdOrName } from "./shared.js";

export function createOrgTools(ctx: McpToolContext) {
  const { prisma, orgSlug, agentId } = ctx;

  async function getDirectReportsFor(agentDbId: string) {
    const myNode = await prisma.orgNode.findUnique({
      where: { agentId: agentDbId },
      select: { id: true },
    });

    if (!myNode) return [];

    const children = await prisma.orgNode.findMany({
      where: { parentNodeId: myNode.id },
      select: {
        agent: {
          select: {
            id: true,
            name: true,
            displayName: true,
            role: true,
            department: true,
            status: true,
            currentTaskId: true,
          },
        },
      },
    });

    type Report = {
      id: string;
      name: string;
      displayName: string;
      role: string;
      department: string;
      status: string;
      currentTaskId: string | null;
    };

    return (children as Array<{ agent: Report }>).map((child) => child.agent);
  }

  return [
    tool(
      "get_my_org",
      "List your direct reports and their current status",
      {},
      async () => {
        try {
          const self = await getAgentByIdOrName(prisma, agentId);
          if (!self) return toolText(`Unknown caller agent: ${agentId}`);

          const reports = await getDirectReportsFor(self.id);

          return toolText(
            JSON.stringify(
              {
                self: { name: self.name, role: self.role, department: self.department, status: self.status },
                directReports: reports.map((r) => ({
                  name: r.name,
                  role: r.role,
                  department: r.department,
                  status: r.status,
                })),
              },
              null,
              2,
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_my_org failed: ${message}`);
        }
      },
    ),

    tool(
      "list_org_nodes",
      "List all org hierarchy nodes with agent info",
      {},
      async () => {
        try {
          const nodes = await prisma.orgNode.findMany({
            orderBy: { position: "asc" },
            select: {
              id: true,
              agentId: true,
              parentNodeId: true,
              position: true,
              positionX: true,
              positionY: true,
              agent: { select: { name: true, displayName: true, role: true, department: true, status: true } },
            },
          });

          return toolText(JSON.stringify(nodes, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_org_nodes failed: ${msg}`);
        }
      },
    ),

    tool(
      "create_org_node",
      "Add an agent to the org hierarchy",
      {
        agentName: z.string().describe("Agent name (slug) to place in org"),
        parentNodeId: z.string().optional().describe("Parent org node ID, omit for root"),
        position: z.number().int().optional().describe("Sort position among siblings"),
        positionX: z.number().optional().describe("Canvas X position"),
        positionY: z.number().optional().describe("Canvas Y position"),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.findUnique({ where: { name: args.agentName }, select: { id: true } });
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          const node = await prisma.orgNode.create({
            data: {
              agentId: agent.id,
              parentNodeId: args.parentNodeId ?? null,
              position: args.position ?? 0,
              positionX: args.positionX ?? 0,
              positionY: args.positionY ?? 0,
            },
            select: { id: true },
          });

          appEventBus.emit("org_changed", { orgSlug });

          return toolText(JSON.stringify({ nodeId: node.id }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`create_org_node failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_org_node",
      "Move an agent in the org hierarchy",
      {
        agentName: z.string().describe("Agent name (slug) to move"),
        parentNodeId: z.string().nullable().optional().describe("New parent node ID, null for root"),
        position: z.number().int().optional().describe("New sort position"),
        positionX: z.number().optional().describe("Canvas X position"),
        positionY: z.number().optional().describe("Canvas Y position"),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.findUnique({ where: { name: args.agentName }, select: { id: true } });
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          const node = await prisma.orgNode.findUnique({ where: { agentId: agent.id }, select: { id: true } });
          if (!node) return toolText(`Agent ${args.agentName} has no org node`);

          const data: Record<string, unknown> = {};
          if (args.parentNodeId !== undefined) data["parentNodeId"] = args.parentNodeId;
          if (args.position !== undefined) data["position"] = args.position;
          if (args.positionX !== undefined) data["positionX"] = args.positionX;
          if (args.positionY !== undefined) data["positionY"] = args.positionY;

          if (Object.keys(data).length === 0) return toolText("No fields to update.");

          await prisma.orgNode.update({ where: { id: node.id }, data });

          appEventBus.emit("org_changed", { orgSlug });

          return toolText(`Org node for ${args.agentName} updated.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_org_node failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_org_node",
      "Remove an agent from the org hierarchy",
      {
        agentName: z.string().describe("Agent name (slug) to remove from org"),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.findUnique({ where: { name: args.agentName }, select: { id: true } });
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          const node = await prisma.orgNode.findUnique({ where: { agentId: agent.id }, select: { id: true } });
          if (!node) return toolText(`Agent ${args.agentName} has no org node`);

          await prisma.orgNode.delete({ where: { id: node.id } });

          appEventBus.emit("org_changed", { orgSlug });

          return toolText(`Org node for ${args.agentName} deleted.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_org_node failed: ${msg}`);
        }
      },
    ),
  ];
}
