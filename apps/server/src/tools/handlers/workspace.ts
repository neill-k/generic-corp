import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";
import * as fs from "fs/promises";
import * as path from "path";

// Workspace context file location
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/tmp/generic-corp-workspace";
const CONTEXT_FILE = "context.md";

/**
 * Ensure workspace directory exists
 */
async function ensureWorkspaceDir(): Promise<void> {
  try {
    await fs.mkdir(WORKSPACE_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

/**
 * Read the shared workspace context file
 */
export async function contextRead(
  _params: Record<string, never>,
  _context: { agentId: string }
): Promise<{ content: string; lastModified?: string }> {
  await ensureWorkspaceDir();
  const contextPath = path.join(WORKSPACE_DIR, CONTEXT_FILE);

  try {
    const content = await fs.readFile(contextPath, "utf-8");
    const stats = await fs.stat(contextPath);
    return {
      content,
      lastModified: stats.mtime.toISOString(),
    };
  } catch {
    // Initialize with default template if doesn't exist
    const defaultContent = `# Shared Workspace Context

This file contains accumulated knowledge and learnings from all agents.

## Learnings

## Decisions

## Blockers

## Notes

---
Last updated: ${new Date().toISOString()}
`;
    await fs.writeFile(contextPath, defaultContent, "utf-8");
    return { content: defaultContent };
  }
}

/**
 * Write/append to the shared workspace context file
 */
export async function contextWrite(
  params: {
    content: string;
    section?: "learnings" | "decisions" | "blockers" | "notes";
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  await ensureWorkspaceDir();
  const contextPath = path.join(WORKSPACE_DIR, CONTEXT_FILE);

  // Get current content
  let currentContent: string;
  try {
    currentContent = await fs.readFile(contextPath, "utf-8");
  } catch {
    currentContent = await (await contextRead({}, context)).content;
  }

  // Get agent name for attribution
  const agent = await db.agent.findUnique({
    where: { id: context.agentId },
    select: { name: true },
  });
  const agentName = agent?.name || context.agentId;

  const timestamp = new Date().toISOString();
  const entry = `\n- [${timestamp}] (${agentName}): ${params.content}`;

  // Insert content into the appropriate section
  if (params.section) {
    const sectionHeader = `## ${params.section.charAt(0).toUpperCase() + params.section.slice(1)}`;
    const sectionIndex = currentContent.indexOf(sectionHeader);

    if (sectionIndex !== -1) {
      // Find the end of the section (next ## or ---)
      const afterSection = currentContent.slice(sectionIndex + sectionHeader.length);
      const nextSectionMatch = afterSection.match(/\n##|\n---/);
      const insertPosition = nextSectionMatch
        ? sectionIndex + sectionHeader.length + (nextSectionMatch.index || 0)
        : currentContent.length;

      currentContent =
        currentContent.slice(0, insertPosition) +
        entry +
        currentContent.slice(insertPosition);
    } else {
      // Section doesn't exist, append to end
      currentContent += `\n\n${sectionHeader}${entry}`;
    }
  } else {
    // Append to Notes section by default
    const notesIndex = currentContent.indexOf("## Notes");
    if (notesIndex !== -1) {
      const afterNotes = currentContent.slice(notesIndex + "## Notes".length);
      const nextSectionMatch = afterNotes.match(/\n##|\n---/);
      const insertPosition = nextSectionMatch
        ? notesIndex + "## Notes".length + (nextSectionMatch.index || 0)
        : currentContent.length;

      currentContent =
        currentContent.slice(0, insertPosition) +
        entry +
        currentContent.slice(insertPosition);
    } else {
      currentContent += entry;
    }
  }

  // Update last updated timestamp
  currentContent = currentContent.replace(
    /Last updated: .*/,
    `Last updated: ${timestamp}`
  );

  await fs.writeFile(contextPath, currentContent, "utf-8");

  EventBus.emit("activity:log", {
    type: "context_updated",
    agentId: context.agentId,
    agentName,
    message: `Updated shared context (${params.section || "notes"})`,
  });

  return { success: true };
}

/**
 * Generic key-value store operations using the database
 */
export async function storeSet(
  params: {
    key: string;
    value: string;
    namespace?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  const namespace = params.namespace || context.agentId;

  // Use ActivityLog as a simple key-value store (could be a dedicated table)
  // For now, we'll use a file-based approach for simplicity
  await ensureWorkspaceDir();
  const storeDir = path.join(WORKSPACE_DIR, "store", namespace);
  await fs.mkdir(storeDir, { recursive: true });

  const keyFile = path.join(storeDir, `${params.key}.json`);
  await fs.writeFile(
    keyFile,
    JSON.stringify({
      value: params.value,
      updatedAt: new Date().toISOString(),
      updatedBy: context.agentId,
    }),
    "utf-8"
  );

  return { success: true };
}

export async function storeGet(
  params: {
    key: string;
    namespace?: string;
  },
  context: { agentId: string }
): Promise<{ value: string | null; found: boolean }> {
  const namespace = params.namespace || context.agentId;

  await ensureWorkspaceDir();
  const keyFile = path.join(WORKSPACE_DIR, "store", namespace, `${params.key}.json`);

  try {
    const content = await fs.readFile(keyFile, "utf-8");
    const data = JSON.parse(content);
    return { value: data.value, found: true };
  } catch {
    return { value: null, found: false };
  }
}

export async function storeDelete(
  params: {
    key: string;
    namespace?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  const namespace = params.namespace || context.agentId;

  const keyFile = path.join(WORKSPACE_DIR, "store", namespace, `${params.key}.json`);

  try {
    await fs.unlink(keyFile);
    return { success: true };
  } catch {
    return { success: true }; // Idempotent - success even if not found
  }
}

export async function storeList(
  params: {
    namespace?: string;
  },
  context: { agentId: string }
): Promise<{ keys: string[] }> {
  const namespace = params.namespace || context.agentId;
  const storeDir = path.join(WORKSPACE_DIR, "store", namespace);

  try {
    const files = await fs.readdir(storeDir);
    const keys = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
    return { keys };
  } catch {
    return { keys: [] };
  }
}

/**
 * Refresh context - returns updated context information
 */
export async function refreshContext(
  params: {
    include?: ("budget" | "team" | "activity" | "dependencies")[];
  },
  context: { agentId: string; taskId?: string }
): Promise<{
  budget?: { remaining: number; limit: number; percentUsed: number };
  team?: { agents: { id: string; name: string; status: string; currentTaskId: string | null }[] };
  activity?: { recent: { type: string; message: string; timestamp: Date }[] };
  dependencies?: { blocked: string[]; blocking: string[] };
}> {
  const include = params.include || ["budget", "team", "activity", "dependencies"];
  const result: Record<string, unknown> = {};

  if (include.includes("budget")) {
    const gameState = await db.gameState.findFirst();
    if (gameState) {
      const remaining = Number(gameState.budgetRemainingUsd);
      const limit = Number(gameState.budgetLimitUsd);
      result.budget = {
        remaining,
        limit,
        percentUsed: limit > 0 ? ((limit - remaining) / limit) * 100 : 0,
      };
    }
  }

  if (include.includes("team")) {
    const agents = await db.agent.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, status: true, currentTaskId: true },
    });
    result.team = { agents };
  }

  if (include.includes("activity")) {
    const recent = await db.activityLog.findMany({
      where: { timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
      orderBy: { timestamp: "desc" },
      take: 10,
    });
    result.activity = {
      recent: recent.map((a) => ({
        type: a.action,
        message: (a.details as { message?: string })?.message || a.action,
        timestamp: a.timestamp,
      })),
    };
  }

  if (include.includes("dependencies") && context.taskId) {
    const [blockedBy, blocks] = await Promise.all([
      db.taskDependency.findMany({
        where: { taskId: context.taskId },
        include: { dependsOn: { select: { id: true, title: true, status: true } } },
      }),
      db.taskDependency.findMany({
        where: { dependsOnTaskId: context.taskId },
        include: { task: { select: { id: true, title: true, status: true } } },
      }),
    ]);

    result.dependencies = {
      blocked: blockedBy
        .filter((d) => d.dependsOn.status !== "completed")
        .map((d) => `${d.dependsOn.title} (${d.dependsOn.status})`),
      blocking: blocks.map((d) => d.task.title),
    };
  }

  return result;
}
