import type { Express } from "express";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { setupProviderRoutes } from "./providers/index.js";
import claudeTasksRouter from "./tasks.js";
import analyticsRouter from "../routes/analytics.js";
import { register } from "../services/metrics.js";

export function setupRoutes(app: Express) {
  // ================== METRICS ==================

  app.get("/metrics", async (_req, res) => {
    try {
      res.set("Content-Type", register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      console.error("[API] Error fetching metrics:", error);
      res.status(500).end("Failed to fetch metrics");
    }
  });

  // ================== ANALYTICS ==================

  app.use("/api/analytics", analyticsRouter);

  // ================== CLAUDE CODE TASKS ==================

  app.use("/api/claude-tasks", claudeTasksRouter);

  // ================== AGENTS ==================

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

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await db.agent.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTasks: { orderBy: { createdAt: "desc" }, take: 10 },
          sessions: { orderBy: { startedAt: "desc" }, take: 5 },
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

  app.get("/api/tasks", async (req, res) => {
    try {
      const { status, agentId } = req.query;

      const statusFilter = typeof status === "string" ? status : undefined;
      const agentIdFilter = typeof agentId === "string" ? agentId : undefined;

      const tasks = await db.task.findMany({
        where: {
          ...(statusFilter ? { status: statusFilter as any } : {}),
          ...(agentIdFilter ? { agentId: agentIdFilter } : {}),
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

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await db.task.findUnique({
        where: { id: req.params.id },
        include: {
          assignedTo: true,
          createdBy: true,
          dependencies: { include: { dependsOn: true } },
          dependents: { include: { task: true } },
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

  app.post("/api/tasks", async (req, res) => {
    try {
      const { agentId, title, description, priority, provider, providerAccountId } = req.body;

      if (!agentId || !title) {
        return res.status(400).json({ error: "agentId and title are required" });
      }

      if (providerAccountId && !provider) {
        return res.status(400).json({ error: "provider is required when providerAccountId is set" });
      }

      const agent = await db.agent.findFirst({
        where: { name: agentId, deletedAt: null },
      });

      if (!agent) {
        return res.status(404).json({ error: `Agent ${agentId} not found` });
      }

      if (providerAccountId) {
        const providerAccount = await db.providerAccount.findUnique({
          where: { id: providerAccountId },
        });

        if (!providerAccount) {
          return res.status(404).json({ error: `Provider account ${providerAccountId} not found` });
        }

        if (providerAccount.status !== "active") {
          return res.status(400).json({ error: `Provider account is not active: ${providerAccount.status}` });
        }

        if (providerAccount.provider !== provider) {
          return res.status(400).json({
            error: `Provider mismatch: account is ${providerAccount.provider}, but task specifies ${provider}`,
          });
        }
      }

      const task = await db.task.create({
        data: {
          agentId: agent.id,
          createdById: agent.id,
          title,
          description: description || "",
          priority: priority || "normal",
          status: "pending",
          provider: provider || null,
          providerAccountId: providerAccountId || null,
        },
        include: { assignedTo: true, providerAccount: true },
      });

      // Auto-execute the task
      EventBus.emit("task:queued", { agentId: agent.id, task });

      res.status(201).json(task);
    } catch (error) {
      console.error("[API] Error creating task:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.post("/api/tasks/:id/execute", async (req, res) => {
    try {
      const task = await db.task.findUnique({
        where: { id: req.params.id },
        include: { assignedTo: true },
      });

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      if (task.status !== "pending") {
        return res.status(409).json({
          error: `Task is not executable from status ${task.status}`,
        });
      }

      EventBus.emit("task:queued", { agentId: task.agentId, task });

      res.status(200).json({ success: true, taskId: task.id });
    } catch (error) {
      console.error("[API] Error executing task:", error);
      res.status(500).json({ error: "Failed to execute task" });
    }
  });

  // ================== MESSAGES ==================

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
          ...(typeof type === "string" ? { type: type as any } : {}),
          ...(status ? { status: status as any } : {}),

        },
        include: { fromAgent: true, toAgent: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(messages);
    } catch (error) {
      console.error("[API] Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/drafts/pending", async (_req, res) => {
    try {
      const drafts = await db.message.findMany({
        where: { type: "external_draft", status: "pending" },
        include: { fromAgent: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(drafts);
    } catch (error) {
      console.error("[API] Error fetching drafts:", error);
      res.status(500).json({ error: "Failed to fetch drafts" });
    }
  });

  // ================== ACTIVITY LOG ==================

  app.get("/api/activity", async (req, res) => {
    try {
      const { agentId, limit } = req.query;

      const activities = await db.activityLog.findMany({
        where: { ...(agentId && { agentId: agentId as string }) },
        include: { agent: true, task: true },
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

  // ================== CLAUDE CODE EVENTS ==================

  app.post("/api/claude-events", async (req, res) => {
    try {
      const event = req.body;

      // Validate event structure
      if (!event.timestamp || !event.event || !event.sessionId) {
        return res.status(400).json({
          error: "Invalid event structure. Required: timestamp, event, sessionId",
        });
      }

      // Validate event type
      const validEvents = ["PreToolUse", "PostToolUse", "SessionStart", "SessionEnd", "UserPromptSubmit", "Stop"];
      if (!validEvents.includes(event.event)) {
        return res.status(400).json({
          error: `Invalid event type. Must be one of: ${validEvents.join(", ")}`,
        });
      }

      // Import and add event
      const { claudeEventsService } = await import("../services/claudeEvents.js");
      await claudeEventsService.addEvent(event);

      res.status(201).json({ success: true });
    } catch (error) {
      console.error("[API] Error processing Claude event:", error);
      res.status(500).json({ error: "Failed to process event" });
    }
  });

  app.get("/api/claude-events", async (req, res) => {
    try {
      const { sessionId, limit } = req.query;
      const { claudeEventsService } = await import("../services/claudeEvents.js");

      let events;
      if (sessionId && typeof sessionId === "string") {
        events = await claudeEventsService.getSessionEvents(
          sessionId,
          parseInt(limit as string) || 100
        );
      } else {
        events = await claudeEventsService.getRecentEvents(
          parseInt(limit as string) || 100
        );
      }

      res.json(events);
    } catch (error) {
      console.error("[API] Error fetching Claude events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // ================== PROVIDER ACCOUNTS ==================

  app.use("/api/providers", setupProviderRoutes());

  // ================== WAITLIST ==================

  app.post("/api/waitlist", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // For now, log to console and store in memory
      // TODO: Add proper database table for waitlist
      console.log(`[WAITLIST] New signup: ${email}`);

      // Send success response
      res.json({
        success: true,
        message: "Thanks for joining our waitlist!"
      });
    } catch (error) {
      console.error("[API] Error processing waitlist signup:", error);
      res.status(500).json({ error: "Failed to process signup" });
    }
  });

  console.log("[API] Routes configured");
}
