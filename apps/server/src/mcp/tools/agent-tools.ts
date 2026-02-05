import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { appEventBus } from "../../services/app-events.js";
import { getAgentByIdOrName, getDirectReportsFor } from "../helpers.js";
import type { McpServerDeps } from "../types.js";
import { toolText } from "../types.js";

export function agentTools(deps: McpServerDeps) {
  const { prisma, orgSlug, agentId } = deps;

  return [
    tool(
      "get_my_org",
      "List your direct reports and their current status",
      {},
      async () => {
        try {
          const self = await getAgentByIdOrName(prisma, agentId);
          if (!self) return toolText(`Unknown caller agent: ${agentId}`);

          const reports = await getDirectReportsFor(prisma, self.id);

          return toolText(
            JSON.stringify(
              {
                self: { name: self.name, role: self.role, department: self.department, status: self.status },
                directReports: reports.map((r) => ({
                  name: r.name,
                  role: r.role,
                  department: r.department,
                  status: r.status,
                })),
              },
              null,
              2,
            ),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_my_org failed: ${message}`);
        }
      },
    ),

    tool(
      "get_agent_status",
      "Read an agent's current status",
      {
        agentName: z.string(),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.findUnique({
            where: { name: args.agentName },
            select: {
              name: true,
              displayName: true,
              role: true,
              department: true,
              level: true,
              status: true,
              currentTaskId: true,
            },
          });
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          return toolText(JSON.stringify(agent, null, 2));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_agent_status failed: ${message}`);
        }
      },
    ),

    tool(
      "list_agents",
      "List all agents in the organization",
      {
        department: z.string().optional().describe("Filter by department"),
        status: z.enum(["idle", "running", "error", "offline"]).optional().describe("Filter by status"),
      },
      async (args) => {
        try {
          const where: Record<string, unknown> = {};
          if (args.department) where["department"] = args.department;
          if (args.status) where["status"] = args.status;

          const agents = await prisma.agent.findMany({
            where,
            orderBy: { name: "asc" },
            select: {
              name: true,
              displayName: true,
              role: true,
              department: true,
              level: true,
              status: true,
              currentTaskId: true,
            },
          });

          return toolText(JSON.stringify(agents, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_agents failed: ${msg}`);
        }
      },
    ),

    tool(
      "create_agent",
      "Create a new agent in the organization",
      {
        name: z.string().regex(/^[a-z0-9-]+$/).describe("Unique slug name"),
        displayName: z.string().describe("Human-readable name"),
        role: z.string().describe("Agent's role title"),
        department: z.string().describe("Department name"),
        level: z.enum(["ic", "lead", "manager", "vp", "c-suite"]),
        personality: z.string().optional().describe("Personality/behavior description"),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.create({
            data: {
              name: args.name,
              displayName: args.displayName,
              role: args.role,
              department: args.department,
              level: args.level,
              personality: args.personality ?? "",
              status: "idle",
            },
            select: { id: true, name: true },
          });

          appEventBus.emit("agent_updated", { agentId: agent.id, orgSlug });

          return toolText(JSON.stringify({ id: agent.id, name: agent.name }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`create_agent failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_agent",
      "Update an agent's properties",
      {
        agentName: z.string().describe("Agent name (slug)"),
        displayName: z.string().optional(),
        role: z.string().optional(),
        department: z.string().optional(),
        personality: z.string().optional(),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.findUnique({ where: { name: args.agentName } });
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          const data: Record<string, unknown> = {};
          if (args.displayName !== undefined) data["displayName"] = args.displayName;
          if (args.role !== undefined) data["role"] = args.role;
          if (args.department !== undefined) data["department"] = args.department;
          if (args.personality !== undefined) data["personality"] = args.personality;

          if (Object.keys(data).length === 0) return toolText("No fields to update.");

          await prisma.agent.update({ where: { id: agent.id }, data });

          appEventBus.emit("agent_updated", { agentId: agent.id, orgSlug });

          return toolText(`Agent ${args.agentName} updated.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_agent failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_agent",
      "Remove an agent from the organization",
      {
        agentName: z.string().describe("Agent name (slug)"),
      },
      async (args) => {
        try {
          const agent = await prisma.agent.findUnique({ where: { name: args.agentName } });
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          await prisma.agent.delete({ where: { id: agent.id } });

          appEventBus.emit("agent_deleted", { agentId: agent.id, orgSlug });

          return toolText(`Agent ${args.agentName} deleted.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_agent failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_agent_metrics",
      "Get metrics for an agent (tasks completed, spend, queue depth)",
      {
        agentName: z.string().describe("Agent name (slug)"),
      },
      async (args) => {
        try {
          const agent = await getAgentByIdOrName(prisma, args.agentName);
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          const tasksCompleted = await prisma.task.count({
            where: { assigneeId: agent.id, status: "completed" },
          });

          const now = new Date();
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const todayTasks = await prisma.task.findMany({
            where: { assigneeId: agent.id, status: "completed", completedAt: { gte: startOfDay } },
            select: { costUsd: true },
          });
          const spendToday = todayTasks.reduce((sum, t) => sum + (t.costUsd ?? 0), 0);

          const queueDepth = await prisma.task.count({
            where: { assigneeId: agent.id, status: "pending" },
          });

          const currentTask = await prisma.task.findFirst({
            where: { assigneeId: agent.id, status: "running" },
            select: { id: true, prompt: true, status: true },
          });

          return toolText(JSON.stringify({
            agent: agent.name,
            tasksCompleted,
            spendToday: `$${spendToday.toFixed(2)}`,
            queueDepth,
            currentTask,
          }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_agent_metrics failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_agent_system_prompt",
      "Get the assembled system prompt for an agent (read-only)",
      {
        agentName: z.string().describe("Agent name (slug)"),
      },
      async (args) => {
        try {
          const agent = await getAgentByIdOrName(prisma, args.agentName);
          if (!agent) return toolText(`Unknown agent: ${args.agentName}`);

          const toolPerms = (agent.toolPermissions as Record<string, boolean>) ?? {};
          const enabledTools = Object.entries(toolPerms).filter(([, v]) => v).map(([k]) => k);

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

          return toolText(systemPrompt);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_agent_system_prompt failed: ${msg}`);
        }
      },
    ),
  ];
}
