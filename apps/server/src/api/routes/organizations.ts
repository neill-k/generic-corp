/**
 * Organization CRUD Routes
 *
 * Manages tenant lifecycle: creation, listing, renaming, and deletion.
 * Operates on the public Prisma client (tenants table in public schema).
 * Schema provisioning/teardown delegated to the schema-provisioner utility.
 */

import { Router } from "express";
import type { PrismaClient } from "@prisma/client";

import { provisionOrgSchema, dropOrgSchema } from "../../lib/schema-provisioner.js";
import { getPrismaForTenant, clearTenantCache } from "../../lib/prisma-tenant.js";
import { seedOrganization } from "../../db/seed-org.js";

/** Only lowercase letters, digits, underscores; must start with a letter. */
const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Derive a URL-safe slug from an org display name.
 *
 * Rules:
 * - Lowercase
 * - Spaces become underscores
 * - Non-alphanumeric/underscore characters stripped
 * - If the result starts with a digit, prefix with underscore
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^(\d)/, "_$1");
}

export function createOrganizationRoutes(publicPrisma: PrismaClient): Router {
  const router = Router();

  // POST /api/organizations - Create org
  router.post("/", async (req, res) => {
    try {
      const { name } = req.body as { name?: string };

      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({ error: "name is required and must be a non-empty string." });
        return;
      }

      const slug = slugify(name.trim());

      if (!SLUG_RE.test(slug)) {
        res.status(400).json({
          error: `Generated slug "${slug}" is invalid. Name must contain at least one letter.`,
        });
        return;
      }

      const schemaName = `tenant_${slug}`;

      // Check for duplicate slug
      const existing = await publicPrisma.tenant.findUnique({
        where: { slug },
      });

      if (existing) {
        res.status(409).json({ error: `Organization with slug "${slug}" already exists.` });
        return;
      }

      // Create tenant row first
      const tenant = await publicPrisma.tenant.create({
        data: {
          slug,
          displayName: name.trim(),
          schemaName,
          status: "provisioning",
        },
      });

      // Provision the schema
      try {
        await provisionOrgSchema(publicPrisma, schemaName);
      } catch (provisionError) {
        // Roll back the tenant row if schema provisioning fails
        console.error(
          "[API:Organizations] Schema provisioning failed, removing tenant row.",
          provisionError instanceof Error ? provisionError.message : "Unknown error",
        );
        await publicPrisma.tenant.delete({ where: { id: tenant.id } });
        res.status(500).json({ error: "Failed to provision organization schema." });
        return;
      }

      // Mark tenant as active (must happen before seeding — getPrismaForTenant rejects non-active tenants)
      const activeTenant = await publicPrisma.tenant.update({
        where: { id: tenant.id },
        data: { status: "active" },
      });

      // Seed default data (agents, org hierarchy, workspace, tool permissions)
      try {
        const tenantPrisma = await getPrismaForTenant(slug);
        await seedOrganization(tenantPrisma);
      } catch (seedError) {
        console.error(
          "[API:Organizations] Seeding failed, removing tenant and schema.",
          seedError instanceof Error ? seedError.message : "Unknown error",
        );
        await dropOrgSchema(publicPrisma, schemaName);
        await publicPrisma.tenant.delete({ where: { id: activeTenant.id } });
        res.status(500).json({ error: "Failed to seed organization data." });
        return;
      }

      console.log(`[API:Organizations] Created organization: ${slug} (schema: ${schemaName})`);

      res.status(201).json({
        id: activeTenant.id,
        slug: activeTenant.slug,
        displayName: activeTenant.displayName,
        schemaName: activeTenant.schemaName,
        status: activeTenant.status,
      });
    } catch (error) {
      console.error(
        "[API:Organizations] POST / failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // GET /api/organizations - List all orgs
  router.get("/", async (_req, res) => {
    try {
      const tenants = await publicPrisma.tenant.findMany({
        where: { status: "active" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          displayName: true,
          schemaName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ organizations: tenants });
    } catch (error) {
      console.error(
        "[API:Organizations] GET / failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // PATCH /api/organizations/:slug - Rename org
  router.patch("/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const tenant = await publicPrisma.tenant.findUnique({
        where: { slug },
      });

      if (!tenant) {
        res.status(404).json({ error: `Organization "${slug}" not found.` });
        return;
      }

      const { displayName } = req.body as { displayName?: string };

      if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
        res.status(400).json({ error: "displayName is required and must be a non-empty string." });
        return;
      }

      const updated = await publicPrisma.tenant.update({
        where: { slug },
        data: { displayName: displayName.trim() },
      });

      console.log(`[API:Organizations] Renamed "${slug}" to "${updated.displayName}"`);

      res.json({
        id: updated.id,
        slug: updated.slug,
        displayName: updated.displayName,
        schemaName: updated.schemaName,
        status: updated.status,
      });
    } catch (error) {
      console.error(
        "[API:Organizations] PATCH /:slug failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Internal server error." });
    }
  });

  // DELETE /api/organizations/:slug - Delete org
  router.delete("/:slug", async (req, res) => {
    try {
      const { slug } = req.params;

      const tenant = await publicPrisma.tenant.findUnique({
        where: { slug },
      });

      if (!tenant) {
        res.status(404).json({ error: `Organization "${slug}" not found.` });
        return;
      }

      // Check for running agents in the tenant schema
      try {
        const tenantPrisma = await getPrismaForTenant(slug);
        const runningAgents = await tenantPrisma.agent.findMany({
          where: { status: { in: ["working", "running"] } },
          select: { name: true, displayName: true },
        });

        if (runningAgents.length > 0) {
          const agentNames = runningAgents.map((a) => a.displayName || a.name);
          res.status(409).json({
            error: "Cannot delete organization with running agents.",
            runningAgents: agentNames,
          });
          return;
        }
      } catch {
        // If we can't connect to the tenant schema, it may already be broken.
        // Proceed with deletion.
        console.warn(
          `[API:Organizations] Could not check running agents for "${slug}", proceeding with deletion.`,
        );
      }

      // Clear the cached Prisma client for this tenant
      await clearTenantCache(slug);

      // Drop the schema
      await dropOrgSchema(publicPrisma, tenant.schemaName);

      // Delete the tenant row
      await publicPrisma.tenant.delete({
        where: { id: tenant.id },
      });

      console.log(`[API:Organizations] Deleted organization: ${slug} (schema: ${tenant.schemaName})`);

      res.json({ deleted: true, slug });
    } catch (error) {
      console.error(
        "[API:Organizations] DELETE /:slug failed:",
        error instanceof Error ? error.message : "Unknown error",
      );
      res.status(500).json({ error: "Internal server error." });
    }
  });

  return router;
}
