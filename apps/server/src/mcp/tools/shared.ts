import type { PrismaClient } from "@prisma/client";
import path from "node:path";

import type { AgentRuntime } from "../../services/agent-lifecycle.js";
import { BoardService } from "../../services/board-service.js";

export type ToolTextResult = { content: Array<{ type: "text"; text: string }> };

export function toolText(text: string): ToolTextResult {
  return { content: [{ type: "text", text }] };
}

export interface McpToolContext {
  prisma: PrismaClient;
  orgSlug: string;
  agentId: string;
  taskId: string;
  runtime?: AgentRuntime;
}

export function resolveWorkspaceRoot(): string {
  const root = process.env["GC_WORKSPACE_ROOT"];
  if (!root) {
    throw new Error("GC_WORKSPACE_ROOT is not set (needed for board/docs file tools)");
  }
  return path.resolve(root);
}

export function getBoardService(): BoardService {
  return new BoardService(resolveWorkspaceRoot());
}

export async function getAgentByIdOrName(prisma: PrismaClient, agentIdOrName: string) {
  const byId = await prisma.agent.findUnique({ where: { id: agentIdOrName } });
  if (byId) return byId;
  return prisma.agent.findUnique({ where: { name: agentIdOrName } });
}

/** Only lowercase letters, digits, underscores; must start with a letter. */
export const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Derive a URL-safe slug from an org display name.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^(\d)/, "_$1");
}
