import crypto from "node:crypto";

import express from "express";
import { z } from "zod";

import { db } from "../db/client.js";
import { enqueueAgentTask } from "../queue/agent-queues.js";

const createTaskBodySchema = z.object({
  assignee: z.string().optional().describe("Agent name (slug). Defaults to marcus"),
  prompt: z.string().min(1),
  context: z.string().optional(),
  priority: z.number().int().optional(),
});

const createMessageBodySchema = z.object({
  agentName: z.string().min(1),
  body: z.string().min(1),
  threadId: z.string().optional(),
});

export function createApiRouter(): express.Router {
  const router = express.Router();

  router.get("/agents", async (_req, res, next) => {
    try {
      const agents = await db.agent.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          department: true,
          level: true,
          status: true,
          currentTaskId: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  });

  router.post("/tasks", async (req, res, next) => {
    try {
      const body = createTaskBodySchema.parse(req.body);
      const assigneeName = body.assignee ?? "marcus";

      const assignee = await db.agent.findUnique({ where: { name: assigneeName }, select: { id: true, name: true } });
      if (!assignee) {
        res.status(404).json({ error: `Unknown assignee agent: ${assigneeName}` });
        return;
      }

      const task = await db.task.create({
        data: {
          parentTaskId: null,
          assigneeId: assignee.id,
          delegatorId: null,
          prompt: body.prompt,
          context: body.context ?? null,
          priority: body.priority ?? 0,
          status: "pending",
        },
        select: { id: true },
      });

      await enqueueAgentTask({ agentName: assignee.name, taskId: task.id, priority: body.priority ?? 0 });

      res.status(201).json({ id: task.id });
    } catch (error) {
      next(error);
    }
  });

  router.get("/tasks/:id", async (req, res, next) => {
    try {
      const task = await db.task.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!task) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.json({ task });
    } catch (error) {
      next(error);
    }
  });

  router.post("/messages", async (req, res, next) => {
    try {
      const body = createMessageBodySchema.parse(req.body);

      const agent = await db.agent.findUnique({
        where: { name: body.agentName },
        select: { id: true },
      });
      if (!agent) {
        res.status(404).json({ error: `Unknown agent: ${body.agentName}` });
        return;
      }

      const threadId = body.threadId ?? crypto.randomUUID();

      const message = await db.message.create({
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
      const threadId = req.query["threadId"];
      if (!threadId || typeof threadId !== "string") {
        res.status(400).json({ error: "threadId query parameter is required" });
        return;
      }

      const messages = await db.message.findMany({
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

  router.get("/org", async (_req, res, next) => {
    try {
      const nodes = await db.orgNode.findMany({
        orderBy: { position: "asc" },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              displayName: true,
              role: true,
              department: true,
              level: true,
              status: true,
              currentTaskId: true,
            },
          },
        },
      });

      // Build tree: map nodeId → children, then return roots
      const nodeMap = new Map<string, { agent: typeof nodes[0]["agent"]; parentAgentId: string | null; children: unknown[] }>();
      const parentLookup = new Map<string, string>(); // nodeId → parentNodeId

      for (const node of nodes) {
        const parentNode = node.parentNodeId ? nodes.find((n) => n.id === node.parentNodeId) : null;
        nodeMap.set(node.id, {
          agent: node.agent,
          parentAgentId: parentNode?.agent.id ?? null,
          children: [],
        });
        if (node.parentNodeId) {
          parentLookup.set(node.id, node.parentNodeId);
        }
      }

      const roots: unknown[] = [];
      for (const [nodeId, treeNode] of nodeMap) {
        const parentNodeId = parentLookup.get(nodeId);
        if (parentNodeId && nodeMap.has(parentNodeId)) {
          (nodeMap.get(parentNodeId)!.children as unknown[]).push(treeNode);
        } else {
          roots.push(treeNode);
        }
      }

      res.json({ org: roots });
    } catch (error) {
      next(error);
    }
  });

  router.get("/threads", async (_req, res, next) => {
    try {
      // Get the latest message per thread using distinct + orderBy
      const latestMessages = await db.message.findMany({
        where: { threadId: { not: null } },
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

  return router;
}
