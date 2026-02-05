import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { getPublicPrisma, getPrismaForTenant, clearTenantCache } from "../../lib/prisma-tenant.js";
import { provisionOrgSchema, dropOrgSchema } from "../../lib/schema-provisioner.js";
import { toolText, SLUG_RE, slugify } from "./shared.js";

export function createOrganizationTools() {
  return [
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

          const orgs = tenants.map((t: typeof tenants[number]) => ({
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
              const agentNames = runningAgents.map((a: typeof runningAgents[number]) => a.displayName || a.name);
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
