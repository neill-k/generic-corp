import express from "express";

import { getTenantPrisma } from "../../middleware/tenant-context.js";
import { appEventBus } from "../../services/app-events.js";
import {
  createToolPermissionSchema,
  updateToolPermissionSchema,
  updateAgentToolPermissionsSchema,
} from "../schemas/tool-permission.schema.js";

export function createToolPermissionRouter(): express.Router {
  const router = express.Router();

  // --- Workspace-level tool permissions ---

  router.get("/tool-permissions", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const permissions = await prisma.toolPermission.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ permissions });
    } catch (error) {
      next(error);
    }
  });

  router.post("/tool-permissions", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const body = createToolPermissionSchema.parse(req.body);
      const permission = await prisma.toolPermission.create({
        data: {
          name: body.name,
          description: body.description,
          iconName: body.iconName,
          enabled: body.enabled,
        },
      });
      appEventBus.emit("tool_permission_created", { toolPermissionId: permission.id, orgSlug: req.tenant?.slug ?? "default" });
      res.status(201).json({ permission });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/tool-permissions/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const permission = await prisma.toolPermission.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!permission) {
        res.status(404).json({ error: "Tool permission not found" });
        return;
      }
      const body = updateToolPermissionSchema.parse(req.body);
      const updated = await prisma.toolPermission.update({
        where: { id: permission.id },
        data: body,
      });
      appEventBus.emit("tool_permission_updated", { toolPermissionId: permission.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ permission: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/tool-permissions/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const permission = await prisma.toolPermission.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!permission) {
        res.status(404).json({ error: "Tool permission not found" });
        return;
      }
      await prisma.toolPermission.delete({ where: { id: permission.id } });
      appEventBus.emit("tool_permission_deleted", { toolPermissionId: permission.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  // --- Per-agent tool permission overrides ---

  router.get("/agents/:id/tool-permissions", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
        select: { id: true, toolPermissions: true },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const allPermissions = await prisma.toolPermission.findMany({
        orderBy: { name: "asc" },
      });

      const overrides = (agent.toolPermissions ?? {}) as Record<string, boolean>;

      const permissions = allPermissions.map((perm) => {
        const hasOverride = perm.name in overrides;
        return {
          id: perm.id,
          name: perm.name,
          description: perm.description,
          iconName: perm.iconName,
          enabled: hasOverride ? overrides[perm.name] : perm.enabled,
          overridden: hasOverride,
        };
      });

      res.json({ permissions });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/agents/:id/tool-permissions", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const body = updateAgentToolPermissionsSchema.parse(req.body);
      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data: { toolPermissions: body },
      });
      appEventBus.emit("agent_updated", { agentId: agent.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ toolPermissions: updated.toolPermissions });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
