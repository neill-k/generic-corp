import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { getPublicPrisma, getPrismaForTenant, clearTenantCache } from "../../lib/prisma-tenant.js";
import { provisionOrgSchema, dropOrgSchema } from "../../lib/schema-provisioner.js";
import { appEventBus } from "../../services/app-events.js";
import { SLUG_RE, slugify } from "../helpers.js";
import type { McpServerDeps } from "../types.js";
import { toolText } from "../types.js";

export function orgTools(deps: McpServerDeps) {
  const { prisma, orgSlug } = deps;

  return [
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

    tool(
      "list_organizations",
      "List all active organizations",
      {},
      async () => {
        try {
          const publicPrisma = getPublicPrisma();
          const tenants = await publicPrisma.tenant.findMany({
            where: { status: "active" },
            orderBy: { createdAt: "asc" },
          });

          const orgs = tenants.map((t) => ({
            id: t.id,
            slug: t.slug,
            displayName: t.displayName,
            status: t.status,
            createdAt: t.createdAt.toISOString(),
          }));

          return toolText(JSON.stringify(orgs, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_organizations failed: ${msg}`);
        }
      },
    ),

    tool(
      "create_organization",
      "Create a new organization with its own isolated schema",
      {
        name: z.string().describe("Organization name"),
      },
      async (args) => {
        try {
          const publicPrisma = getPublicPrisma();
          const trimmedName = args.name.trim();

          if (trimmedName.length === 0) {
            return toolText("create_organization failed: name must be a non-empty string.");
          }

          const slug = slugify(trimmedName);

          if (!SLUG_RE.test(slug)) {
            return toolText(
              `create_organization failed: generated slug "${slug}" is invalid. Name must contain at least one letter.`,
            );
          }

          const schemaName = `tenant_${slug}`;

          const existing = await publicPrisma.tenant.findUnique({
            where: { slug },
          });

          if (existing) {
            return toolText(`create_organization failed: organization with slug "${slug}" already exists.`);
          }

          const tenant = await publicPrisma.tenant.create({
            data: {
              slug,
              displayName: trimmedName,
              schemaName,
              status: "provisioning",
            },
          });

          try {
            await provisionOrgSchema(publicPrisma, schemaName);
          } catch (provisionError) {
            console.error(
              "[MCP] Schema provisioning failed, removing tenant row.",
              provisionError instanceof Error ? provisionError.message : "Unknown error",
            );
            await publicPrisma.tenant.delete({ where: { id: tenant.id } });
            return toolText("create_organization failed: schema provisioning failed.");
          }

          const activeTenant = await publicPrisma.tenant.update({
            where: { id: tenant.id },
            data: { status: "active" },
          });

          console.log(`[MCP] Created organization: ${slug} (schema: ${schemaName})`);

          return toolText(JSON.stringify({
            id: activeTenant.id,
            slug: activeTenant.slug,
            displayName: activeTenant.displayName,
            schemaName: activeTenant.schemaName,
            status: activeTenant.status,
          }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`create_organization failed: ${msg}`);
        }
      },
    ),

    tool(
      "switch_organization",
      "Switch the agent's organization context (informational — actual context switching is handled by the platform)",
      {
        orgSlug: z.string().describe("Organization slug to switch to"),
      },
      async (args) => {
        try {
          const publicPrisma = getPublicPrisma();
          const tenant = await publicPrisma.tenant.findUnique({
            where: { slug: args.orgSlug },
          });

          if (!tenant) {
            return toolText(`switch_organization failed: organization "${args.orgSlug}" not found.`);
          }

          if (tenant.status !== "active") {
            return toolText(
              `switch_organization failed: organization "${args.orgSlug}" is not active (status: ${tenant.status}).`,
            );
          }

          return toolText(
            `Organization context noted: ${tenant.displayName} (${tenant.slug}). ` +
            `The platform will handle the actual context switch.`,
          );
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`switch_organization failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_organization",
      "Delete an organization, its schema, and all data",
      {
        orgSlug: z.string().describe("Organization slug to delete"),
      },
      async (args) => {
        try {
          const publicPrisma = getPublicPrisma();
          const tenant = await publicPrisma.tenant.findUnique({
            where: { slug: args.orgSlug },
          });

          if (!tenant) {
            return toolText(`delete_organization failed: organization "${args.orgSlug}" not found.`);
          }

          try {
            const tenantPrisma = await getPrismaForTenant(args.orgSlug);
            const runningAgents = await tenantPrisma.agent.findMany({
              where: { status: { in: ["working", "running"] } },
              select: { name: true, displayName: true },
            });

            if (runningAgents.length > 0) {
              const agentNames = runningAgents.map((a) => a.displayName || a.name);
              return toolText(
                `delete_organization failed: cannot delete organization with running agents: ${agentNames.join(", ")}`,
              );
            }
          } catch {
            console.warn(
              `[MCP] Could not check running agents for "${args.orgSlug}", proceeding with deletion.`,
            );
          }

          await clearTenantCache(args.orgSlug);

          await dropOrgSchema(publicPrisma, tenant.schemaName);

          await publicPrisma.tenant.delete({
            where: { id: tenant.id },
          });

          console.log(`[MCP] Deleted organization: ${args.orgSlug} (schema: ${tenant.schemaName})`);

          return toolText(`Organization "${args.orgSlug}" deleted successfully.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_organization failed: ${msg}`);
        }
      },
    ),
  ];
}
