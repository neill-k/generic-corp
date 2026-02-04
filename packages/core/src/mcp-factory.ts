import type { ToolDefinition } from "./tool-pipeline.js";
import { ToolExecutionPipeline } from "./tool-pipeline.js";
import type { HookRunner } from "./hook-runner.js";
import type { VaultResolver } from "./vault-resolver.js";

export interface McpToolRegistration {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export class McpServerFactory {
  private readonly pluginTools: McpToolRegistration[] = [];

  constructor(
    private readonly hookRunner: HookRunner,
    private readonly vaultResolver: VaultResolver,
  ) {}

  registerTool(tool: McpToolRegistration): void {
    this.pluginTools.push(tool);
  }

  getPluginTools(): McpToolRegistration[] {
    return [...this.pluginTools];
  }

  createPipeline(agentId: string, taskId: string): ToolExecutionPipeline {
    return new ToolExecutionPipeline(
      this.hookRunner,
      this.vaultResolver,
      agentId,
      taskId,
    );
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.pluginTools.map((t) => ({
      name: t.name,
      description: t.description,
      handler: t.handler,
    }));
  }
}
