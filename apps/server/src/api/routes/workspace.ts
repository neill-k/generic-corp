import express from "express";

import { getTenantPrisma } from "../../middleware/tenant-context.js";
import { appEventBus } from "../../services/app-events.js";
import { encrypt, maskApiKey } from "../../services/crypto.js";
import { updateWorkspaceSchema } from "../schemas/workspace.schema.js";

interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  language: string;
  llmProvider: string;
  llmModel: string;
  llmApiKeyEnc: string;
  llmApiKeyIv: string;
  llmApiKeyTag: string;
  createdAt: Date;
  updatedAt: Date;
}

function sanitizeWorkspace(ws: WorkspaceRow) {
  const { llmApiKeyEnc, llmApiKeyIv, llmApiKeyTag, ...rest } = ws;
  return {
    ...rest,
    llmApiKey: maskApiKey(llmApiKeyEnc),
  };
}

export function createWorkspaceRouter(): express.Router {
  const router = express.Router();

  router.get("/workspace", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      let workspace = await prisma.workspace.findFirst();
      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: "Generic Corp",
            slug: "generic-corp",
          },
        });
      }
      res.json({ workspace: sanitizeWorkspace(workspace) });
    } catch (error) {
      console.error("[API] Failed to get workspace:", error);
      next(error);
    }
  });

  router.patch("/workspace", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const parsed = updateWorkspaceSchema.parse(req.body);

      let workspace = await prisma.workspace.findFirst();
      if (!workspace) {
        workspace = await prisma.workspace.create({
          data: {
            name: "Generic Corp",
            slug: "generic-corp",
          },
        });
      }

      const { llmApiKey, ...fields } = parsed;

      const data: Record<string, unknown> = { ...fields };
      if (llmApiKey !== undefined) {
        const encrypted = encrypt(llmApiKey);
        data["llmApiKeyEnc"] = encrypted.enc;
        data["llmApiKeyIv"] = encrypted.iv;
        data["llmApiKeyTag"] = encrypted.tag;
      }

      const updated = await prisma.workspace.update({
        where: { id: workspace.id },
        data,
      });

      appEventBus.emit("workspace_updated", { workspaceId: updated.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ workspace: sanitizeWorkspace(updated) });
    } catch (error) {
      console.error("[API] Failed to update workspace:", error);
      next(error);
    }
  });

  router.delete("/workspace", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const workspace = await prisma.workspace.findFirst();
      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      await prisma.workspace.delete({ where: { id: workspace.id } });
      appEventBus.emit("workspace_updated", { workspaceId: workspace.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ deleted: true });
    } catch (error) {
      console.error("[API] Failed to delete workspace:", error);
      next(error);
    }
  });

  return router;
}
