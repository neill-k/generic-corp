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

  return router;
}
