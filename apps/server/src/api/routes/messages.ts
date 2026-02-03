import crypto from "node:crypto";

import express from "express";
import { z } from "zod";

import { MAIN_AGENT_NAME } from "@generic-corp/shared";
import { getTenantPrisma } from "../../middleware/tenant-context.js";
import { enqueueAgentTask } from "../../queue/agent-queues.js";
import { appEventBus } from "../../services/app-events.js";
import { createMessageBodySchema } from "../schemas/message.schema.js";

export function createMessageRouter(): express.Router {
  const router = express.Router();

  router.post("/messages", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const body = createMessageBodySchema.parse(req.body);

      // Main agent chat now uses socket-based streaming
      if (body.agentName === MAIN_AGENT_NAME) {
        res.status(400).json({
          error: "Main agent chat uses real-time streaming. Connect via Socket.io and emit 'chat_message' instead.",
        });
        return;
      }

      const agent = await prisma.agent.findUnique({
        where: { name: body.agentName },
        select: { id: true },
      });
      if (!agent) {
        res.status(404).json({ error: `Unknown agent: ${body.agentName}` });
        return;
      }

      const threadId = body.threadId ?? crypto.randomUUID();

      const message = await prisma.message.create({
        data: {
          fromAgentId: null,
          toAgentId: agent.id,
          threadId,
          body: body.body,
          type: "chat",
          status: "delivered",
        },
        select: {
          id: true,
          fromAgentId: true,
          toAgentId: true,
          threadId: true,
          body: true,
          type: true,
          createdAt: true,
        },
      });

      appEventBus.emit("message_created", {
        messageId: message.id,
        threadId,
        fromAgentId: null,
        toAgentId: agent.id,
        orgSlug: req.tenant?.slug ?? "default",
      });

      // Create a task so the agent actually processes this message
      const agentRecord = await prisma.agent.findUnique({
        where: { id: agent.id },
        select: { id: true, name: true },
      });

      if (agentRecord) {
        const task = await prisma.task.create({
          data: {
            assigneeId: agentRecord.id,
            delegatorId: null,
            prompt: body.body,
            context: `IMPORTANT: This is a chat message in thread "${threadId}" from a human user. You MUST respond by calling the send_message tool with toAgent set to the sender (use "human" if unknown) and threadId "${threadId}". After sending your reply, call finish_task with status "completed". Do NOT just output text — you must use the tools.`,
            priority: 0,
            status: "pending",
          },
          select: { id: true },
        });

        await enqueueAgentTask({
          orgSlug: req.tenant?.slug ?? "default",
          agentName: agentRecord.name,
          taskId: task.id,
          priority: 0,
        });

        appEventBus.emit("task_created", {
          taskId: task.id,
          assignee: agentRecord.name,
          delegator: null,
          orgSlug: req.tenant?.slug ?? "default",
        });
      }

      res.status(201).json({ message });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors[0]?.message ?? "Validation error" });
        return;
      }
      next(error);
    }
  });

  router.get("/messages", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const threadId = req.query["threadId"];
      if (!threadId || typeof threadId !== "string") {
        res.status(400).json({ error: "threadId query parameter is required" });
        return;
      }

      const messages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fromAgentId: true,
          toAgentId: true,
          threadId: true,
          body: true,
          type: true,
          createdAt: true,
        },
      });

      res.json({ messages });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/messages/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const message = await prisma.message.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      const data: Record<string, unknown> = {};
      if (req.body?.status === "read") {
        data["status"] = "read";
        data["readAt"] = new Date();
      }
      const updated = await prisma.message.update({ where: { id: message.id }, data });
      appEventBus.emit("message_updated", { messageId: message.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ message: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/messages/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const message = await prisma.message.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      await prisma.message.delete({ where: { id: message.id } });
      appEventBus.emit("message_deleted", { messageId: message.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
