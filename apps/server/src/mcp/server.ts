import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

import { agentTools } from "./tools/agent-tools.js";
import { boardTools } from "./tools/board-tools.js";
import { mcpServerTools } from "./tools/mcp-server-tools.js";
import { messageTools } from "./tools/message-tools.js";
import { orgTools } from "./tools/org-tools.js";
import { taskTools } from "./tools/task-tools.js";
import { toolPermissionTools } from "./tools/tool-permission-tools.js";
import { workspaceTools } from "./tools/workspace-tools.js";
import type { McpServerDeps } from "./types.js";

export type { McpServerDeps } from "./types.js";

export function createGcMcpServer(deps: McpServerDeps) {
  return createSdkMcpServer({
    name: "generic-corp",
    version: "1.0.0",
    tools: [
      ...taskTools(deps),
      ...messageTools(deps),
      ...boardTools(deps),
      ...agentTools(deps),
      ...orgTools(deps),
      ...workspaceTools(deps),
      ...toolPermissionTools(deps),
      ...mcpServerTools(deps),
    ],
  });
}
