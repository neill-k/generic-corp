import { Router } from "express";
import { db } from "../../db/index.js";
import { isEncryptionInitialized } from "../../services/encryption.js";
import { setupOpenAICodexRoutes } from "./openai-codex.js";
import { setupGitHubCopilotRoutes } from "./github-copilot.js";
import { setupGoogleCodeAssistRoutes } from "./google-code-assist.js";

export function setupProviderRoutes(): Router {
  const router = Router();

  router.get("/accounts", async (req, res) => {
    if (!isEncryptionInitialized()) {
      return res.status(503).json({ error: "Encryption not configured" });
    }

    const ownerKey = (req.query.ownerKey as string) || "local";

    const accounts = await db.providerAccount.findMany({
      where: { ownerKey },
      select: {
        id: true,
        provider: true,
        status: true,
        scopes: true,
        accountMeta: true,
        lastUsedAt: true,
        lastError: true,
        lastErrorAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(accounts);
  });

  router.delete("/accounts/:id", async (req, res) => {
    const { id } = req.params;
    const ownerKey = (req.query.ownerKey as string) || "local";

    const account = await db.providerAccount.findFirst({
      where: { id, ownerKey },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await db.providerAccount.delete({ where: { id } });

    res.json({ success: true });
  });

  setupOpenAICodexRoutes(router);
  setupGitHubCopilotRoutes(router);
  setupGoogleCodeAssistRoutes(router);

  return router;
}
