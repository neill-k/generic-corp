import { query } from "@anthropic-ai/claude-agent-sdk";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import type { TaskResult } from "@generic-corp/shared";

export interface AgentConfig {
  name: string;
  personalityPrompt: string;
  capabilities: string[];
  toolPermissions: Record<string, boolean>;
}

export interface TaskContext {
  taskId: string;
  agentId: string;
  title: string;
  description: string;
  priority: string;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected sessionId?: string;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Execute a task and return the result
   */
  async executeTask(context: TaskContext): Promise<TaskResult> {
    const startTime = Date.now();
    const tokensUsed = { input: 0, output: 0 };
    const toolsUsed: string[] = [];
    let output = "";

    try {
      // Create agent session in DB
      const session = await db.agentSession.create({
        data: {
          agentId: context.agentId,
          taskId: context.taskId,
          status: "active",
        },
      });

      // Build the prompt with personality and task
      const prompt = this.buildPrompt(context);

      // Log task start
      EventBus.emit("activity:log", {
        agentId: context.agentId,
        action: "task_started",
        details: { taskId: context.taskId, title: context.title },
      });

      console.log(`[${this.config.name}] Starting task: ${context.title}`);
      console.log(`[${this.config.name}] Prompt length: ${prompt.length} chars`);

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is required for agent execution");
      }

      const response = query({
        prompt,
        options: {
          model: "claude-sonnet-4-5",
          permissionMode: "default",
        },
      });

      for await (const message of response) {
        if (message.type === "assistant") {
          const blocks = message.message.content;
          for (const block of blocks) {
            if (block.type === "text") {
              output += block.text;
            }
          }
        }

        if (message.type === "result") {
          if (message.subtype !== "success") {
            throw new Error(message.errors.join("\n"));
          }

          output = message.result;
          tokensUsed.input = message.usage.input_tokens;
          tokensUsed.output = message.usage.output_tokens;
          break;
        }
      }

      if (tokensUsed.input <= 0 || tokensUsed.output <= 0) {
        throw new Error("Agent execution did not report token usage");
      }

      toolsUsed.push("claude-agent-sdk");

      // Update session as completed
      await db.agentSession.update({
        where: { id: session.id },
        data: {
          status: "completed",
          endedAt: new Date(),
          tokensUsed,
          toolCalls: toolsUsed,
        },
      });

      // Log completion
      EventBus.emit("activity:log", {
        agentId: context.agentId,
        action: "task_completed",
        details: { taskId: context.taskId, duration: Date.now() - startTime },
      });

      // Calculate estimated cost (rough estimate)
      const costUsd = this.estimateCost(tokensUsed);

      return {
        success: true,
        output,
        tokensUsed,
        costUsd,
        toolsUsed,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Log failure
      EventBus.emit("activity:log", {
        agentId: context.agentId,
        action: "task_failed",
        details: { taskId: context.taskId, error: errorMessage },
      });

      return {
        success: false,
        output: "",
        tokensUsed,
        costUsd: this.estimateCost(tokensUsed),
        toolsUsed,
        error: errorMessage,
      };
    }
  }


  protected buildPrompt(context: TaskContext): string {
    return `${this.config.personalityPrompt}

---

You have been assigned the following task:

**Title:** ${context.title}

**Description:**
${context.description}

**Priority:** ${context.priority}

---

Please complete this task to the best of your ability.`;
  }

  protected estimateCost(tokens: { input: number; output: number }): number {
    const inputCost = (tokens.input / 1_000_000) * 3;
    const outputCost = (tokens.output / 1_000_000) * 15;
    return Number((inputCost + outputCost).toFixed(6));
  }

  get name(): string {
    return this.config.name;
  }
}

export { TaskResult };
