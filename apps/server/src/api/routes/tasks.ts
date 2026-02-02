import express from "express";

import type { KanbanColumn } from "@generic-corp/shared";
import { STATUS_TO_COLUMN } from "@generic-corp/shared";

import { db } from "../../db/client.js";
import { enqueueAgentTask } from "../../queue/agent-queues.js";
import { appEventBus } from "../../services/app-events.js";
import {
  createTaskBodySchema,
  taskBoardQuerySchema,
  updateTaskBodySchema,
} from "../schemas/task.schema.js";

const ASSIGNEE_SELECT = {
  select: { id: true, name: true, displayName: true, avatarColor: true },
} as const;

export function createTaskRouter(): express.Router {
  const router = express.Router();

  // --- List tasks with filters ---
  router.get("/tasks", async (req, res, next) => {
    try {
      const status = req.query["status"] as string | undefined;
      const priority = req.query["priority"] !== undefined
        ? Number(req.query["priority"])
        : undefined;
      const assigneeName = req.query["assignee"] as string | undefined;
      const search = req.query["search"] as string | undefined;
      const limit = req.query["limit"] !== undefined
        ? Math.min(Math.max(Number(req.query["limit"]), 1), 100)
        : 50;
      const cursor = req.query["cursor"] as string | undefined;

      const where: Record<string, unknown> = {};
      if (status) where["status"] = status;
      if (priority !== undefined && !Number.isNaN(priority)) where["priority"] = priority;
      if (assigneeName) where["assignee"] = { name: assigneeName };
      if (search) where["prompt"] = { contains: search, mode: "insensitive" };
      if (cursor) where["id"] = { lt: cursor };

      const tasks = await db.task.findMany({
        where,
        include: { assignee: ASSIGNEE_SELECT },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      res.json({ tasks });
    } catch (error) {
      next(error);
    }
  });

  // --- Kanban board view ---
  router.get("/tasks/board", async (req, res, next) => {
    try {
      const query = taskBoardQuerySchema.parse(req.query);

      const where: Record<string, unknown> = {};
      if (query.search) where["prompt"] = { contains: query.search, mode: "insensitive" };
      if (query.assignee) where["assignee"] = { name: query.assignee };
      if (query.priority !== undefined) where["priority"] = query.priority;
      if (query.status) where["status"] = query.status;
      if (query.department) where["assignee"] = { ...((where["assignee"] as object) ?? {}), department: query.department };

      const tasks = await db.task.findMany({
        where,
        include: { assignee: ASSIGNEE_SELECT },
        orderBy: { createdAt: "desc" },
      });

      const columns: Record<KanbanColumn, { tasks: unknown[]; count: number }> = {
        backlog: { tasks: [], count: 0 },
        in_progress: { tasks: [], count: 0 },
        review: { tasks: [], count: 0 },
        done: { tasks: [], count: 0 },
      };

      for (const task of tasks) {
        const col = STATUS_TO_COLUMN[task.status as keyof typeof STATUS_TO_COLUMN] ?? "backlog";
        columns[col].count += 1;
        if (columns[col].tasks.length < query.limit) {
          columns[col].tasks.push(task);
        }
      }

      const total = tasks.length;
      res.json({ columns, total });
    } catch (error) {
      next(error);
    }
  });

  // --- Create task ---
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
          tags: body.tags ?? [],
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

  // --- Get single task ---
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

  // --- Update task ---
  router.patch("/tasks/:id", async (req, res, next) => {
    try {
      const task = await db.task.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!task) {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      const body = updateTaskBodySchema.parse(req.body);
      const data: Record<string, unknown> = {};
      if (body.priority !== undefined) data["priority"] = body.priority;
      if (body.context !== undefined) data["context"] = body.context;
      if (body.status !== undefined) data["status"] = body.status;
      if (body.tags !== undefined) data["tags"] = body.tags;
      const updated = await db.task.update({ where: { id: task.id }, data });
      if (body.status) {
        appEventBus.emit("task_status_changed", { taskId: task.id, status: body.status });
      }
      appEventBus.emit("task_updated", { taskId: task.id });
      res.json({ task: updated });
    } catch (error) {
      next(error);
    }
  });

  // --- Delete task ---
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

  return router;
}
