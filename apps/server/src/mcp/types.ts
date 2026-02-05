import type { PrismaClient } from "@prisma/client";

import type { AgentRuntime } from "../services/agent-lifecycle.js";

export type ToolTextResult = { content: Array<{ type: "text"; text: string }> };

export function toolText(text: string): ToolTextResult {
  return { content: [{ type: "text", text }] };
}

export interface McpServerDeps {
  prisma: PrismaClient;
  orgSlug: string;
  agentId: string;
  taskId: string;
  runtime?: AgentRuntime;
}
