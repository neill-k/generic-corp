import express from "express";

import { db } from "../../db/client.js";
import { appEventBus } from "../../services/app-events.js";
import {
  createToolPermissionSchema,
  updateToolPermissionSchema,
  updateAgentToolPermissionsSchema,
} from "../schemas/tool-permission.schema.js";

export function createToolPermissionRouter(): express.Router {
  const router = express.Router();

  // --- Workspace-level tool permissions ---

  router.get("/tool-permissions", async (_req, res, next) => {
    try {
      const permissions = await db.toolPermission.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ permissions });
    } catch (error) {
      next(error);
    }
  });

  router.post("/tool-permissions", async (req, res, next) => {
    try {
      const body = createToolPermissionSchema.parse(req.body);
      const permission = await db.toolPermission.create({
        data: {
          name: body.name,
          description: body.description,
          iconName: body.iconName,
          enabled: body.enabled,
        },
      });
      appEventBus.emit("tool_permission_created", { toolPermissionId: permission.id });
      res.status(201).json({ permission });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/tool-permissions/:id", async (req, res, next) => {
    try {
      const permission = await db.toolPermission.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!permission) {
        res.status(404).json({ error: "Tool permission not found" });
        return;
      }
      const body = updateToolPermissionSchema.parse(req.body);
      const updated = await db.toolPermission.update({
        where: { id: permission.id },
        data: body,
      });
      appEventBus.emit("tool_permission_updated", { toolPermissionId: permission.id });
      res.json({ permission: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/tool-permissions/:id", async (req, res, next) => {
    try {
      const permission = await db.toolPermission.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!permission) {
        res.status(404).json({ error: "Tool permission not found" });
        return;
      }
      await db.toolPermission.delete({ where: { id: permission.id } });
      appEventBus.emit("tool_permission_deleted", { toolPermissionId: permission.id });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  // --- Per-agent tool permission overrides ---

  router.get("/agents/:id/tool-permissions", async (req, res, next) => {
    try {
      const agent = await db.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
        select: { id: true, toolPermissions: true },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const allPermissions = await db.toolPermission.findMany({
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
      const agent = await db.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const body = updateAgentToolPermissionsSchema.parse(req.body);
      const updated = await db.agent.update({
        where: { id: agent.id },
        data: { toolPermissions: body },
      });
      appEventBus.emit("agent_updated", { agentId: agent.id });
      res.json({ toolPermissions: updated.toolPermissions });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
