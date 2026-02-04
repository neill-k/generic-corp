import express from "express";

import { getTenantPrisma } from "../../middleware/tenant-context.js";
import type { AgentRuntime } from "../../services/agent-lifecycle.js";
import { appEventBus } from "../../services/app-events.js";
import { generateThreadSummary } from "../../services/chat-continuity.js";

export interface ThreadRouterDeps {
  runtime?: AgentRuntime;
}

export function createThreadRouter(deps: ThreadRouterDeps): express.Router {
  const router = express.Router();

  router.get("/threads", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      // Get the latest message per thread using distinct + orderBy
      const latestMessages = await prisma.message.findMany({
        where: { threadId: { not: null }, type: "chat" },
        orderBy: { createdAt: "desc" },
        distinct: ["threadId"],
        select: {
          threadId: true,
          toAgentId: true,
          body: true,
          createdAt: true,
          recipient: { select: { name: true } },
        },
      });

      const threads = latestMessages.map((msg) => ({
        threadId: msg.threadId!,
        agentId: msg.toAgentId,
        agentName: msg.recipient.name,
        lastMessageAt: msg.createdAt.toISOString(),
        preview: msg.body.length > 100 ? msg.body.slice(0, 100) + "..." : msg.body,
      }));

      res.json({ threads });
    } catch (error) {
      next(error);
    }
  });

  router.get("/threads/:id/summary", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      if (!deps.runtime) {
        res.status(503).json({ error: "Runtime not available" });
        return;
      }

      const since = req.query["since"];
      if (!since || typeof since !== "string") {
        res.status(400).json({ error: "since query parameter is required" });
        return;
      }

      const summary = await generateThreadSummary({
        prisma,
        threadId: req.params["id"] ?? "",
        since,
        runtime: deps.runtime,
      });

      res.json({ summary });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/threads/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const threadId = req.params["id"] ?? "";

      const hasAnyMessages = await prisma.message.findFirst({
        where: { threadId },
        select: { id: true },
      });
      if (!hasAnyMessages) {
        res.status(404).json({ error: "Thread not found" });
        return;
      }

      const hasHumanMessages = await prisma.message.findFirst({
        where: { threadId, fromAgentId: null },
        select: { id: true },
      });
      if (!hasHumanMessages) {
        res.status(403).json({ error: "Not allowed" });
        return;
      }

      const result = await prisma.message.deleteMany({ where: { threadId } });
      appEventBus.emit("thread_deleted", { threadId, messagesRemoved: result.count, orgSlug: req.tenant?.slug ?? "default" });

      res.json({ deleted: true, messagesRemoved: result.count });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
