import type { PrismaClient } from "@prisma/client";
import { MAIN_AGENT_NAME } from "@generic-corp/shared";
import type { OrgOverviewEntry } from "@generic-corp/core";

import { BoardService } from "./board-service.js";
import { checkContextHealth } from "./context-health.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface MainAgentContextData {
  recentBoardItems: { type: string; author: string; summary: string; timestamp: string }[];
  pendingResults: { childTaskId: string; result: string }[];
  unreadMessageCount: number;
  taskHistory: { id: string; prompt: string; status: string; completedAt: string | null }[];
  contextHealthWarning: string | null;
  activeBlockers: { author: string; summary: string; timestamp: string }[];
  unreadMessagePreviews: { from: string; threadId: string; preview: string; receivedAt: string }[];
  orgOverview: OrgOverviewEntry[];
}

async function loadRecentBoardItems() {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) return [];
  try {
    const boardService = new BoardService(root);
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const items = await boardService.listBoardItems({ since });
    return items.slice(0, 10).map((item) => ({
      type: item.type,
      author: item.author,
      summary: item.summary.slice(0, 100),
      timestamp: item.timestamp,
    }));
  } catch {
    return [];
  }
}

async function loadActiveBlockers() {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) return [];
  try {
    const boardService = new BoardService(root);
    const items = await boardService.listBoardItems({ type: "blocker" });
    return items.slice(0, 5).map((item) => ({
      author: item.author,
      summary: item.summary.slice(0, 200),
      timestamp: item.timestamp,
    }));
  } catch {
    return [];
  }
}

async function loadUnreadCount(prisma: PrismaClient, agentDbId: string) {
  return prisma.message.count({
    where: { toAgentId: agentDbId, status: { not: "read" } },
  });
}

async function loadUnreadMessagePreviews(prisma: PrismaClient, agentDbId: string) {
  const messages = await prisma.message.findMany({
    where: { toAgentId: agentDbId, status: { not: "read" } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      threadId: true,
      body: true,
      createdAt: true,
      sender: { select: { name: true } },
    },
  });
  return messages.map((m) => ({
    from: m.sender?.name ?? "human",
    threadId: m.threadId ?? "unknown",
    preview: m.body.length > 80 ? m.body.slice(0, 80) + "..." : m.body,
    receivedAt: m.createdAt.toISOString(),
  }));
}

async function loadTaskHistory(prisma: PrismaClient, agentDbId: string) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: agentDbId, status: { in: ["completed", "failed"] } },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { id: true, prompt: true, status: true, completedAt: true },
  });
  return tasks.map((t) => ({
    id: t.id,
    prompt: t.prompt,
    status: t.status,
    completedAt: t.completedAt?.toISOString() ?? null,
  }));
}

async function loadPendingResults(agentName: string) {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) return [];
  const resultsDir = path.join(root, agentName, ".gc", "results");
  try {
    const files = await readdir(resultsDir);
    const results = [];
    for (const file of files.slice(0, 5)) {
      if (!file.endsWith(".md")) continue;
      const content = await readFile(path.join(resultsDir, file), "utf8");
      const taskIdMatch = content.match(/\*\*Task ID\*\*:\s*(\S+)/);
      results.push({ childTaskId: taskIdMatch?.[1] ?? file, result: content.slice(0, 500) });
    }
    return results;
  } catch {
    return [];
  }
}

async function loadOrgOverview(prisma: PrismaClient): Promise<OrgOverviewEntry[]> {
  const agents = await prisma.agent.findMany({
    where: { name: { not: MAIN_AGENT_NAME } },
    select: {
      name: true,
      displayName: true,
      role: true,
      department: true,
      level: true,
      status: true,
      currentTaskId: true,
      orgNode: {
        select: {
          parent: {
            select: { agent: { select: { name: true } } },
          },
        },
      },
    },
  });

  return Promise.all(agents.map(async (a) => {
    let currentTask: string | null = null;
    if (a.currentTaskId) {
      const t = await prisma.task.findUnique({ where: { id: a.currentTaskId }, select: { prompt: true } });
      currentTask = t?.prompt?.slice(0, 80) ?? null;
    }
    return {
      name: a.name,
      displayName: a.displayName,
      role: a.role,
      department: a.department,
      level: a.level,
      status: a.status,
      currentTask,
      reportsTo: a.orgNode?.parent?.agent.name ?? null,
    };
  }));
}

export async function loadMainAgentContext(
  prisma: PrismaClient,
  agentDbId: string,
  agentName: string,
  cwd: string,
): Promise<MainAgentContextData> {
  const [
    recentBoardItems,
    pendingResults,
    unreadMessageCount,
    taskHistory,
    contextHealthWarning,
    activeBlockers,
    unreadMessagePreviews,
    orgOverview,
  ] = await Promise.all([
    loadRecentBoardItems(),
    loadPendingResults(agentName),
    loadUnreadCount(prisma, agentDbId),
    loadTaskHistory(prisma, agentDbId),
    checkContextHealth(cwd),
    loadActiveBlockers(),
    loadUnreadMessagePreviews(prisma, agentDbId),
    loadOrgOverview(prisma),
  ]);

  return {
    recentBoardItems,
    pendingResults,
    unreadMessageCount,
    taskHistory,
    contextHealthWarning,
    activeBlockers,
    unreadMessagePreviews,
    orgOverview,
  };
}
