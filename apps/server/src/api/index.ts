import type { Express } from "express";
import { db } from "../db/index.js";

export function setupRoutes(app: Express) {
  // ================== AGENTS ==================

  // Get all agents
  app.get("/api/agents", async (_req, res) => {
    try {
      const agents = await db.agent.findMany({
        where: { deletedAt: null },
        include: {
          assignedTasks: {
            where: { status: { in: ["pending", "in_progress", "blocked"] } },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      });
      res.json(agents);
    } catch (error) {
      console.error("[API] Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // Get single agent
  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await db.agent.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTasks: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          sessions: {
            orderBy: { startedAt: "desc" },
            take: 5,
          },
        },
      });

      if (!agent || agent.deletedAt) {
        return res.status(404).json({ error: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      console.error("[API] Error fetching agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  // ================== TASKS ==================

  // Get all tasks
  app.get("/api/tasks", async (req, res) => {
    try {
      const { status, agentId } = req.query;

      const tasks = await db.task.findMany({
        where: {
          ...(status && { status: status as string }),
          ...(agentId && { agentId: agentId as string }),
        },
        include: {
          assignedTo: true,
          createdBy: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(tasks);
    } catch (error) {
      console.error("[API] Error fetching tasks:", error);
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  // Get single task
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await db.task.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: true,
          createdBy: true,
          dependencies: {
            include: { dependsOn: true },
          },
          dependents: {
            include: { task: true },
          },
        },
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("[API] Error fetching task:", error);
      res.status(500).json({ error: "Failed to fetch task" });
    }
  });

  // Create task
  app.post("/api/tasks", async (req, res) => {
    try {
      const { agentId, title, description, priority } = req.body;

      if (!agentId || !title) {
        return res.status(400).json({ error: "agentId and title are required" });
      }

      const agent = await db.agent.findFirst({
        where: { name: agentId, deletedAt: null },
      });

      if (!agent) {
        return res.status(404).json({ error: `Agent ${agentId} not found` });
      }

      const task = await db.task.create({
        data: {
          agentId: agent.id,
          createdById: agent.id,
          title,
          description: description || "",
          priority: priority || "normal",
          status: "pending",
        },
        include: { assignedTo: true },
      });

      res.status(201).json(task);
    } catch (error) {
      console.error("[API] Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  // ================== MESSAGES ==================

  // Get messages
  app.get("/api/messages", async (req, res) => {
    try {
      const { agentId, type, status } = req.query;

      const messages = await db.message.findMany({
        where: {
          ...(agentId && {
            OR: [
              { fromAgentId: agentId as string },
              { toAgentId: agentId as string },
            ],
          }),
          ...(type && { type: type as string }),
          ...(status && { status: status as string }),
        },
        include: {
          fromAgent: true,
          toAgent: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(messages);
    } catch (error) {
      console.error("[API] Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Get pending drafts
  app.get("/api/drafts/pending", async (_req, res) => {
    try {
      const drafts = await db.message.findMany({
        where: {
          type: "external_draft",
          status: "pending",
        },
        include: {
          fromAgent: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(drafts);
    } catch (error) {
      console.error("[API] Error fetching drafts:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });

  // ================== ACTIVITY LOG ==================

  // Get activity log
  app.get("/api/activity", async (req, res) => {
    try {
      const { agentId, limit } = req.query;

      const activities = await db.activityLog.findMany({
        where: {
          ...(agentId && { agentId: agentId as string }),
        },
        include: {
          agent: true,
          task: true,
        },
        orderBy: { timestamp: "desc" },
        take: parseInt(limit as string) || 100,
      });

      res.json(activities);
    } catch (error) {
      console.error("[API] Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  // ================== GAME STATE ==================

  // Get game state
  app.get("/api/game-state", async (_req, res) => {
    try {
      const state = await db.gameState.findUnique({
        where: { playerId: "default" },
      });

      res.json(state || { budgetRemainingUsd: 100, budgetLimitUsd: 100 });
    } catch (error) {
      console.error("[API] Error fetching game state:", error);
      res.status(500).json({ error: "Failed to fetch game state" });
    }
  });

  console.log("[API] Routes configured");
}
