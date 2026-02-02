import express from "express";

import { db } from "../../db/client.js";
import { enqueueAgentTask } from "../../queue/agent-queues.js";
import { appEventBus } from "../../services/app-events.js";
import { createTaskBodySchema, updateTaskBodySchema } from "../schemas/task.schema.js";

export function createTaskRouter(): express.Router {
  const router = express.Router();

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
      appEventBus.emit("task_updated", { taskId: task.id });
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

  return router;
}
