import crypto from "node:crypto";

import express from "express";
import { z } from "zod";

import { db } from "../db/client.js";
import { enqueueAgentTask } from "../queue/agent-queues.js";
import { appEventBus } from "../services/app-events.js";
import type { BoardService } from "../services/board-service.js";
import type { AgentRuntime } from "../services/agent-lifecycle.js";
import { generateThreadSummary } from "../services/chat-continuity.js";
import type { BoardItemType } from "@generic-corp/shared";

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

const updateAgentBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  personality: z.string().optional(),
});

const updateTaskBodySchema = z.object({
  priority: z.number().int().optional(),
  context: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed", "blocked"]).optional(),
});

const createAgentBodySchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, "Must be lowercase slug"),
  displayName: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  level: z.enum(["ic", "lead", "manager", "vp", "c-suite"]),
  personality: z.string().optional(),
});

const createOrgNodeBodySchema = z.object({
  agentId: z.string().min(1),
  parentNodeId: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

const updateOrgNodeBodySchema = z.object({
  parentNodeId: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export interface ApiRouterDeps {
  boardService?: BoardService;
  runtime?: AgentRuntime;
}

export function createApiRouter(deps: ApiRouterDeps = {}): express.Router {
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

      appEventBus.emit("task_created", {
        taskId: task.id,
        assignee: assignee.name,
        delegator: null,
      });

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

  router.get("/agents/:id", async (req, res, next) => {
    try {
      const agent = await db.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      res.json({ agent });
    } catch (error) {
      next(error);
    }
  });

  router.get("/agents/:id/tasks", async (req, res, next) => {
    try {
      const tasks = await db.task.findMany({
        where: { assigneeId: req.params["id"] ?? "" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          prompt: true,
          status: true,
          createdAt: true,
          completedAt: true,
          costUsd: true,
          durationMs: true,
        },
      });
      res.json({ tasks });
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

      appEventBus.emit("message_created", {
        messageId: message.id,
        threadId,
        fromAgentId: null,
        toAgentId: agent.id,
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

  router.get("/threads/:id/summary", async (req, res, next) => {
    try {
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
        threadId: req.params["id"] ?? "",
        since,
        runtime: deps.runtime,
      });

      res.json({ summary });
    } catch (error) {
      next(error);
    }
  });

  router.post("/board/archive", async (req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const filePath = req.body?.filePath;
      if (!filePath || typeof filePath !== "string") {
        res.status(400).json({ error: "filePath is required" });
        return;
      }

      const archivedPath = await deps.boardService.archiveBoardItem(filePath);

      appEventBus.emit("board_item_archived", { path: filePath, archivedPath });

      res.json({ archivedPath });
    } catch (error) {
      next(error);
    }
  });

  router.get("/board/archived", async (_req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const items = await deps.boardService.listArchivedItems();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.post("/board", async (req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const type = req.body?.type;
      const content = req.body?.content;
      const author = req.body?.author ?? "human";

      if (!type || !content) {
        res.status(400).json({ error: "type and content are required" });
        return;
      }

      const filePath = await deps.boardService.writeBoardItem({
        agentName: author,
        type: type as BoardItemType,
        content,
      });

      appEventBus.emit("board_item_created", { type, author, path: filePath });

      res.status(201).json({ path: filePath });
    } catch (error) {
      next(error);
    }
  });

  router.get("/board", async (req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const type = req.query["type"] as BoardItemType | undefined;
      const since = req.query["since"] as string | undefined;

      const items = await deps.boardService.listBoardItems({
        type: type || undefined,
        since: since || undefined,
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  // --- Agent CRUD ---

  router.post("/agents", async (req, res, next) => {
    try {
      const body = createAgentBodySchema.parse(req.body);
      const agent = await db.agent.create({
        data: {
          name: body.name,
          displayName: body.displayName,
          role: body.role,
          department: body.department,
          level: body.level,
          personality: body.personality ?? "",
          status: "idle",
        },
      });
      res.status(201).json({ agent });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/agents/:id", async (req, res, next) => {
    try {
      const agent = await db.agent.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const body = updateAgentBodySchema.parse(req.body);
      const updated = await db.agent.update({ where: { id: agent.id }, data: body });
      appEventBus.emit("agent_updated", { agentId: agent.id });
      res.json({ agent: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/agents/:id", async (req, res, next) => {
    try {
      const agent = await db.agent.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      await db.orgNode.deleteMany({ where: { agentId: agent.id } });
      await db.agent.delete({ where: { id: agent.id } });
      appEventBus.emit("agent_deleted", { agentId: agent.id });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  // --- Task CRUD ---

  router.patch("/tasks/:id", async (req, res, next) => {
    try {
      const task = await db.task.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const body = updateTaskBodySchema.parse(req.body);
      const updated = await db.task.update({ where: { id: task.id }, data: body });
      if (body.status) {
        appEventBus.emit("task_status_changed", { taskId: task.id, status: body.status });
      }
      res.json({ task: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/tasks/:id", async (req, res, next) => {
    try {
      const task = await db.task.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      await db.task.delete({ where: { id: task.id } });
      appEventBus.emit("task_status_changed", { taskId: task.id, status: "deleted" });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  // --- Message CRUD ---

  router.patch("/messages/:id", async (req, res, next) => {
    try {
      const message = await db.message.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      const data: Record<string, unknown> = {};
      if (req.body?.status === "read") {
        data["status"] = "read";
        data["readAt"] = new Date();
      }
      const updated = await db.message.update({ where: { id: message.id }, data });
      appEventBus.emit("message_updated", { messageId: message.id });
      res.json({ message: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/messages/:id", async (req, res, next) => {
    try {
      const message = await db.message.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!message) {
        res.status(404).json({ error: "Message not found" });
        return;
      }
      await db.message.delete({ where: { id: message.id } });
      appEventBus.emit("message_deleted", { messageId: message.id });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  // --- OrgNode CRUD ---

  router.get("/org/nodes", async (_req, res, next) => {
    try {
      const nodes = await db.orgNode.findMany({
        orderBy: { position: "asc" },
        select: {
          id: true,
          agentId: true,
          parentNodeId: true,
          position: true,
          agent: { select: { name: true, displayName: true, role: true } },
        },
      });
      res.json({ nodes });
    } catch (error) {
      next(error);
    }
  });

  router.post("/org/nodes", async (req, res, next) => {
    try {
      const body = createOrgNodeBodySchema.parse(req.body);
      const node = await db.orgNode.create({
        data: {
          agentId: body.agentId,
          parentNodeId: body.parentNodeId ?? null,
          position: body.position ?? 0,
        },
      });
      appEventBus.emit("org_changed", {});
      res.status(201).json({ node });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/org/nodes/:id", async (req, res, next) => {
    try {
      const node = await db.orgNode.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!node) {
        res.status(404).json({ error: "OrgNode not found" });
        return;
      }
      const body = updateOrgNodeBodySchema.parse(req.body);
      const data: Record<string, unknown> = {};
      if (body.parentNodeId !== undefined) data["parentNodeId"] = body.parentNodeId;
      if (body.position !== undefined) data["position"] = body.position;
      const updated = await db.orgNode.update({ where: { id: node.id }, data });
      appEventBus.emit("org_changed", {});
      res.json({ node: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/org/nodes/:id", async (req, res, next) => {
    try {
      const node = await db.orgNode.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!node) {
        res.status(404).json({ error: "OrgNode not found" });
        return;
      }
      await db.orgNode.delete({ where: { id: node.id } });
      appEventBus.emit("org_changed", {});
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
