import type { PrismaClient } from "@prisma/client";
import path from "node:path";

import { BoardService } from "../services/board-service.js";

export async function getAgentByIdOrName(prisma: PrismaClient, agentIdOrName: string) {
  const byId = await prisma.agent.findUnique({ where: { id: agentIdOrName } });
  if (byId) return byId;
  return prisma.agent.findUnique({ where: { name: agentIdOrName } });
}

export async function getDirectReportsFor(prisma: PrismaClient, agentDbId: string) {
  const myNode = await prisma.orgNode.findUnique({
    where: { agentId: agentDbId },
    select: { id: true },
  });

  if (!myNode) return [];

  const children = await prisma.orgNode.findMany({
    where: { parentNodeId: myNode.id },
    select: {
      agent: {
        select: {
          id: true,
          name: true,
          displayName: true,
          role: true,
          department: true,
          status: true,
          currentTaskId: true,
        },
      },
    },
  });

  type Report = {
    id: string;
    name: string;
    displayName: string;
    role: string;
    department: string;
    status: string;
    currentTaskId: string | null;
  };

  return (children as Array<{ agent: Report }>).map((child) => child.agent);
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

/** Only lowercase letters, digits, underscores; must start with a letter. */
export const SLUG_RE = /^[a-z][a-z0-9_]*$/;

/**
 * Derive a URL-safe slug from an org display name.
 * Matches logic in api/routes/organizations.ts.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^(\d)/, "_$1");
}
