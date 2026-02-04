import { readFile, readdir } from "node:fs/promises";
import nodePath from "node:path";

import express from "express";

import { getTenantPrisma } from "../../middleware/tenant-context.js";
import { appEventBus } from "../../services/app-events.js";
import { createAgentBodySchema, updateAgentBodySchema } from "../schemas/agent.schema.js";

export function createAgentRouter(): express.Router {
  const router = express.Router();

  router.get("/agents", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agents = await prisma.agent.findMany({
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
          avatarColor: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  });

  router.get("/agents/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({
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

  router.post("/agents", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const body = createAgentBodySchema.parse(req.body);
      const agent = await prisma.agent.create({
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
      appEventBus.emit("agent_updated", { agentId: agent.id, orgSlug: req.tenant?.slug ?? "default" });
      res.status(201).json({ agent });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/agents/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const body = updateAgentBodySchema.parse(req.body);
      const updated = await prisma.agent.update({ where: { id: agent.id }, data: body });
      appEventBus.emit("agent_updated", { agentId: agent.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ agent: updated });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/agents/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({ where: { id: req.params["id"] ?? "" } });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      await prisma.orgNode.deleteMany({ where: { agentId: agent.id } });
      await prisma.agent.delete({ where: { id: agent.id } });
      appEventBus.emit("agent_deleted", { agentId: agent.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/agents/:id/tasks", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const tasks = await prisma.task.findMany({
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

  // --- Agent workspace file access (read-only, shared workspace) ---

  router.get("/agents/:id/context", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({ where: { id: req.params["id"] ?? "" }, select: { name: true } });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const root = process.env["GC_WORKSPACE_ROOT"];
      if (!root) {
        res.status(503).json({ error: "Workspace not configured" });
        return;
      }
      const orgSlug = req.tenant?.slug;
      const agentBase = orgSlug
        ? nodePath.join(root, "orgs", orgSlug, "agents", agent.name)
        : nodePath.join(root, agent.name);
      const contextPath = nodePath.join(agentBase, ".gc", "context.md");
      try {
        const content = await readFile(contextPath, "utf8");
        res.json({ content });
      } catch {
        res.json({ content: null });
      }
    } catch (error) {
      next(error);
    }
  });

  router.get("/agents/:id/results", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({ where: { id: req.params["id"] ?? "" }, select: { name: true } });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }
      const root = process.env["GC_WORKSPACE_ROOT"];
      if (!root) {
        res.status(503).json({ error: "Workspace not configured" });
        return;
      }
      const orgSlug = req.tenant?.slug;
      const agentBase = orgSlug
        ? nodePath.join(root, "orgs", orgSlug, "agents", agent.name)
        : nodePath.join(root, agent.name);
      const resultsDir = nodePath.join(agentBase, ".gc", "results");
      try {
        const files = await readdir(resultsDir);
        const results = [];
        for (const file of files.slice(0, 20)) {
          if (!file.endsWith(".md")) continue;
          const content = await readFile(nodePath.join(resultsDir, file), "utf8");
          results.push({ file, content: content.slice(0, 2000) });
        }
        res.json({ results });
      } catch {
        res.json({ results: [] });
      }
    } catch (error) {
      next(error);
    }
  });

  // --- Agent Metrics ---

  router.get("/agents/:id/metrics", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
        select: { id: true, createdAt: true, status: true },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      const now = new Date();

      // Tasks completed count
      const tasksCompleted = await prisma.task.count({
        where: { assigneeId: agent.id, status: "completed" },
      });

      // Spend today (sum of costUsd for tasks completed today)
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayTasks = await prisma.task.findMany({
        where: {
          assigneeId: agent.id,
          status: "completed",
          completedAt: { gte: startOfDay },
        },
        select: { costUsd: true },
      });
      const spendToday = todayTasks.reduce((sum, t) => sum + (t.costUsd ?? 0), 0);

      // Current task
      const currentTask = await prisma.task.findFirst({
        where: { assigneeId: agent.id, status: "running" },
        select: { id: true, prompt: true, status: true, createdAt: true },
      });

      // Queue depth
      const queueDepth = await prisma.task.count({
        where: { assigneeId: agent.id, status: "pending" },
      });

      // Uptime (time since creation or could be more sophisticated)
      const uptimeMs = now.getTime() - agent.createdAt.getTime();
      const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      const uptime = `${days}d ${hours}h ${minutes}m`;

      res.json({
        uptime,
        tasksCompleted,
        spendToday: `$${spendToday.toFixed(2)}`,
        currentTask,
        queueDepth,
      });
    } catch (error) {
      next(error);
    }
  });

  // --- Agent System Prompt (read-only) ---

  router.get("/agents/:id/system-prompt", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const agent = await prisma.agent.findUnique({
        where: { id: req.params["id"] ?? "" },
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          department: true,
          personality: true,
          toolPermissions: true,
        },
      });
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      // Assemble the system prompt as it would be built per invocation
      const toolPerms = agent.toolPermissions as Record<string, boolean> | null;
      const enabledTools = toolPerms
        ? Object.entries(toolPerms).filter(([, v]) => v).map(([k]) => k)
        : [];

      const systemPrompt = [
        `You are ${agent.displayName}, ${agent.role} at Generic Corp.`,
        "",
        agent.personality,
        "",
        "## Available Tools",
        enabledTools.length > 0
          ? enabledTools.map((t) => `- ${t}`).join("\n")
          : "(no tool permissions configured)",
        "",
        "## Department",
        agent.department,
      ].join("\n");

      res.json({ systemPrompt });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
