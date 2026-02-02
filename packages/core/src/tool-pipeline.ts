import type { BeforeToolExecutionContext, AfterToolExecutionContext } from "@generic-corp/sdk";
import type { HookRunner } from "./hook-runner.js";
import type { VaultResolver } from "./vault-resolver.js";

export interface ToolHandler {
  (args: Record<string, unknown>): Promise<unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  handler: ToolHandler;
}

export class ToolExecutionPipeline {
  constructor(
    private readonly hookRunner: HookRunner,
    private readonly vaultResolver: VaultResolver,
    private readonly agentId: string,
    private readonly taskId: string,
  ) {}

  async execute(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // 1. Fire beforeToolExecution hooks
    const beforeCtx: BeforeToolExecutionContext = {
      agentId: this.agentId,
      taskId: this.taskId,
      toolName,
      toolArgs: { ...args },
      skip: false,
    };
    await this.hookRunner.run("beforeToolExecution", beforeCtx);

    if (beforeCtx.skip) {
      return { content: [{ type: "text", text: `Tool ${toolName} skipped by hook` }] };
    }

    // 2. Resolve vault placeholders in args
    const resolvedArgs = await this.vaultResolver.resolveInput(beforeCtx.toolArgs);

    return resolvedArgs;
  }

  async executeWithHandler(
    toolName: string,
    args: Record<string, unknown>,
    handler: ToolHandler,
  ): Promise<unknown> {
    // 1. Fire beforeToolExecution hooks
    const beforeCtx: BeforeToolExecutionContext = {
      agentId: this.agentId,
      taskId: this.taskId,
      toolName,
      toolArgs: { ...args },
      skip: false,
    };
    await this.hookRunner.run("beforeToolExecution", beforeCtx);

    if (beforeCtx.skip) {
      return { content: [{ type: "text", text: `Tool ${toolName} skipped by hook` }] };
    }

    // 2. Resolve vault placeholders in args
    const resolvedArgs = await this.vaultResolver.resolveInput(beforeCtx.toolArgs);

    // 3. Execute original handler
    const startMs = Date.now();
    const result = await handler(resolvedArgs);
    const durationMs = Date.now() - startMs;

    // 4. Fire afterToolExecution hooks
    const afterCtx: AfterToolExecutionContext = {
      agentId: this.agentId,
      taskId: this.taskId,
      toolName,
      result,
      durationMs,
    };
    await this.hookRunner.run("afterToolExecution", afterCtx);

    // 5. Scrub secrets from result text
    const scrubbed = this.scrubResult(afterCtx.result);

    return scrubbed;
  }

  private scrubResult(result: unknown): unknown {
    if (typeof result === "string") {
      return this.vaultResolver.scrubSecrets(result);
    }
    if (result !== null && typeof result === "object") {
      if ("content" in result && Array.isArray((result as Record<string, unknown>)["content"])) {
        const content = (result as { content: Array<{ type: string; text: string }> }).content;
        return {
          ...result,
          content: content.map((item) => {
            if (item.type === "text" && typeof item.text === "string") {
              return { ...item, text: this.vaultResolver.scrubSecrets(item.text) };
            }
            return item;
          }),
        };
      }
    }
    return result;
  }
}
