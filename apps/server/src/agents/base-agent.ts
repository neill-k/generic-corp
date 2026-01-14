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
    let tokensUsed = { input: 0, output: 0 };
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

      // Execute using Claude Agent SDK
      const response = query({
        prompt,
        options: {
          model: "claude-sonnet-4-5",
          permissionMode: "default",
          allowedTools: this.getAllowedTools(),
        },
      });

      // Process streaming response
      for await (const message of response) {
        switch (message.type) {
          case "system":
            if (message.subtype === "init") {
              this.sessionId = message.session_id;
              console.log(`[${this.config.name}] Session started: ${this.sessionId}`);
            }
            break;

          case "assistant":
            // Collect assistant output
            if (typeof message.content === "string") {
              output += message.content;
            } else if (Array.isArray(message.content)) {
              for (const block of message.content) {
                if (block.type === "text") {
                  output += block.text;
                }
              }
            }
            break;

          case "tool_call":
            console.log(`[${this.config.name}] Tool call: ${message.tool_name}`);
            toolsUsed.push(message.tool_name);
            break;

          case "tool_result":
            console.log(`[${this.config.name}] Tool result: ${message.tool_name}`);
            break;

          case "error":
            console.error(`[${this.config.name}] Error:`, message.error);
            throw new Error(message.error.message || "Agent execution error");
        }

        // Emit progress updates periodically
        EventBus.emit("task:progress", {
          taskId: context.taskId,
          progress: 50, // We don't have granular progress from SDK
          message: `Processing...`,
        });
      }

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

  /**
   * Build the prompt including personality and task context
   */
  protected buildPrompt(context: TaskContext): string {
    return `${this.config.personalityPrompt}

---

You have been assigned the following task:

**Title:** ${context.title}

**Description:**
${context.description}

**Priority:** ${context.priority}

---

Please complete this task to the best of your ability. Focus on producing high-quality results.
If you need to communicate with another team member or request approval for external communications,
please indicate this clearly in your response.`;
  }

  /**
   * Get the list of tools this agent is allowed to use
   */
  protected getAllowedTools(): string[] {
    const defaultTools = [
      "Read",
      "Write",
      "Edit",
      "Glob",
      "Grep",
      "Bash",
      "WebSearch",
      "WebFetch",
    ];

    // Filter based on tool permissions
    return defaultTools.filter(
      (tool) => this.config.toolPermissions[tool] !== false
    );
  }

  /**
   * Estimate the cost in USD based on token usage
   * Using approximate Claude pricing: $3/1M input, $15/1M output
   */
  protected estimateCost(tokens: { input: number; output: number }): number {
    const inputCost = (tokens.input / 1_000_000) * 3;
    const outputCost = (tokens.output / 1_000_000) * 15;
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Create a draft message for external communication
   */
  protected async createDraft(
    agentId: string,
    recipient: string,
    subject: string,
    body: string
  ): Promise<void> {
    const draft = await db.message.create({
      data: {
        fromAgentId: agentId,
        toAgentId: agentId, // Self-reference for drafts
        subject,
        body,
        type: "external_draft",
        status: "pending",
        metadata: { externalRecipient: recipient },
      },
    });

    EventBus.emit("draft:pending", {
      draftId: draft.id,
      fromAgent: this.config.name,
      content: { subject, body, recipient },
    });
  }

  /**
   * Get agent name
   */
  get name(): string {
    return this.config.name;
  }
}
