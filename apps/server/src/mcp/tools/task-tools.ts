import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { KANBAN_COLUMNS, STATUS_TO_COLUMN } from "@generic-corp/shared";

import { enqueueAgentTask } from "../../queue/agent-queues.js";
import { appEventBus } from "../../services/app-events.js";
import { getAgentByIdOrName } from "../helpers.js";
import type { McpServerDeps } from "../types.js";
import { toolText } from "../types.js";

export function taskTools(deps: McpServerDeps) {
  const { prisma, orgSlug, agentId, taskId } = deps;

  return [
    tool(
      "delegate_task",
      "Assign work to any agent by name",
      {
        targetAgent: z.string().describe("Name (slug) of the agent to delegate to"),
        prompt: z.string().describe("What to do"),
        context: z.string().describe("Relevant context"),
        priority: z.number().int().optional().describe("Higher is more urgent"),
      },
      async (args) => {
        try {
          const caller = await getAgentByIdOrName(prisma, agentId);
          if (!caller) return toolText(`Unknown caller agent: ${agentId}`);

          const target = await prisma.agent.findUnique({
            where: { name: args.targetAgent },
            select: { id: true, name: true },
          });
          if (!target) return toolText(`Unknown agent: ${args.targetAgent}`);

          const parentTask = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } });

          const task = await prisma.task.create({
            data: {
              parentTaskId: parentTask ? taskId : null,
              assigneeId: target.id,
              delegatorId: caller.id,
              prompt: args.prompt,
              context: args.context,
              priority: args.priority ?? 0,
              status: "pending",
            },
            select: { id: true },
          });

          await enqueueAgentTask({
            agentName: target.name,
            taskId: task.id,
            priority: args.priority ?? 0,
            orgSlug,
          });

          appEventBus.emit("task_created", {
            taskId: task.id,
            assignee: target.name,
            delegator: caller.name,
            orgSlug,
          });

          return toolText(
            `Delegated to ${target.name}. Task ${task.id} queued.`,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delegate_task failed: ${message}`);
        }
      },
    ),

    tool(
      "finish_task",
      "Mark your current task as done with a result summary",
      {
        status: z.enum(["completed", "blocked", "failed"]).describe("Final task status"),
        result: z.string().describe("Result summary or reason for blocking/failure"),
      },
      async (args) => {
        try {
          const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { id: true },
          });
          if (!task) return toolText(`Unknown task: ${taskId}`);

          await prisma.task.update({
            where: { id: taskId },
            data: {
              status: args.status,
              result: args.result,
              completedAt: new Date(),
            },
          });

          appEventBus.emit("task_status_changed", { taskId, status: args.status, orgSlug });

          return toolText(`Task ${taskId} marked as ${args.status}.`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`finish_task failed: ${message}`);
        }
      },
    ),

    tool(
      "get_task",
      "Get details of a specific task by ID",
      {
        taskId: z.string().describe("Task ID to look up"),
      },
      async (args) => {
        try {
          const task = await prisma.task.findUnique({
            where: { id: args.taskId },
            select: {
              id: true,
              prompt: true,
              context: true,
              status: true,
              priority: true,
              result: true,
              learnings: true,
              createdAt: true,
              startedAt: true,
              completedAt: true,
              parentTaskId: true,
              assignee: { select: { name: true } },
              delegator: { select: { name: true } },
            },
          });
          if (!task) return toolText(`Task not found: ${args.taskId}`);

          return toolText(JSON.stringify({
            ...task,
            assignee: task.assignee?.name ?? null,
            delegator: task.delegator?.name ?? null,
            createdAt: task.createdAt.toISOString(),
            startedAt: task.startedAt?.toISOString() ?? null,
            completedAt: task.completedAt?.toISOString() ?? null,
          }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_task failed: ${msg}`);
        }
      },
    ),

    tool(
      "list_tasks",
      "List tasks with optional filters",
      {
        assignee: z.string().optional().describe("Filter by assignee agent name"),
        status: z.enum(["pending", "running", "completed", "failed", "blocked"]).optional(),
        limit: z.number().int().optional().describe("Max results (default 20)"),
      },
      async (args) => {
        try {
          const where: Record<string, unknown> = {};
          if (args.assignee) {
            const agent = await prisma.agent.findUnique({
              where: { name: args.assignee },
              select: { id: true },
            });
            if (!agent) return toolText(`Unknown agent: ${args.assignee}`);
            where["assigneeId"] = agent.id;
          }
          if (args.status) where["status"] = args.status;

          const tasks = await prisma.task.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: args.limit ?? 20,
            select: {
              id: true,
              prompt: true,
              status: true,
              priority: true,
              createdAt: true,
              completedAt: true,
              assignee: { select: { name: true } },
              delegator: { select: { name: true } },
            },
          });

          const formatted = tasks.map((t) => ({
            id: t.id,
            prompt: t.prompt.length > 100 ? t.prompt.slice(0, 100) + "..." : t.prompt,
            status: t.status,
            priority: t.priority,
            assignee: t.assignee?.name ?? null,
            delegator: t.delegator?.name ?? null,
            createdAt: t.createdAt.toISOString(),
            completedAt: t.completedAt?.toISOString() ?? null,
          }));

          return toolText(JSON.stringify(formatted, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_tasks failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_task",
      "Update a task's priority or context",
      {
        taskId: z.string(),
        priority: z.number().int().optional(),
        context: z.string().optional(),
      },
      async (args) => {
        try {
          const task = await prisma.task.findUnique({ where: { id: args.taskId }, select: { id: true } });
          if (!task) return toolText(`Task not found: ${args.taskId}`);

          const data: Record<string, unknown> = {};
          if (args.priority !== undefined) data["priority"] = args.priority;
          if (args.context !== undefined) data["context"] = args.context;

          if (Object.keys(data).length === 0) return toolText("No fields to update.");

          await prisma.task.update({ where: { id: args.taskId }, data });

          appEventBus.emit("task_updated", { taskId: args.taskId, orgSlug });

          return toolText(`Task ${args.taskId} updated.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_task failed: ${msg}`);
        }
      },
    ),

    tool(
      "cancel_task",
      "Cancel a pending task",
      {
        taskId: z.string(),
        reason: z.string().optional().describe("Reason for cancellation"),
      },
      async (args) => {
        try {
          const task = await prisma.task.findUnique({
            where: { id: args.taskId },
            select: { id: true },
          });
          if (!task) return toolText(`Task not found: ${args.taskId}`);

          await prisma.task.update({
            where: { id: args.taskId },
            data: { status: "failed", result: args.reason ?? "Cancelled" },
          });

          appEventBus.emit("task_status_changed", { taskId: args.taskId, status: "failed", orgSlug });

          return toolText(`Task ${args.taskId} cancelled.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`cancel_task failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_task",
      "Delete a task permanently",
      {
        taskId: z.string().describe("Task ID to delete"),
      },
      async (args) => {
        try {
          const task = await prisma.task.findUnique({ where: { id: args.taskId }, select: { id: true } });
          if (!task) return toolText(`Task not found: ${args.taskId}`);

          await prisma.task.delete({ where: { id: args.taskId } });

          appEventBus.emit("task_status_changed", { taskId: args.taskId, status: "deleted", orgSlug });

          return toolText(`Task ${args.taskId} deleted.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_task failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_task_board",
      "Get kanban board view of tasks grouped by column",
      {
        search: z.string().optional().describe("Search text in task prompt"),
        assignee: z.string().optional().describe("Filter by assignee agent name"),
        priority: z.number().optional().describe("Filter by priority"),
      },
      async (args) => {
        try {
          const where: Record<string, unknown> = {};
          if (args.search) {
            where["prompt"] = { contains: args.search, mode: "insensitive" };
          }
          if (args.assignee) {
            const agent = await getAgentByIdOrName(prisma, args.assignee);
            if (agent) where["assigneeId"] = agent.id;
          }
          if (args.priority !== undefined) {
            where["priority"] = args.priority;
          }

          const tasks = await prisma.task.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
            include: {
              assignee: { select: { id: true, name: true, displayName: true, avatarColor: true } },
            },
          });

          const columns = Object.fromEntries(
            KANBAN_COLUMNS.map((col) => [col, { tasks: [] as unknown[], count: 0 }]),
          );

          for (const task of tasks) {
            const col = STATUS_TO_COLUMN[task.status as keyof typeof STATUS_TO_COLUMN] ?? "backlog";
            columns[col]!.tasks.push(task);
            columns[col]!.count++;
          }

          return toolText(JSON.stringify({ columns, total: tasks.length }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_task_board failed: ${msg}`);
        }
      },
    ),
  ];
}
