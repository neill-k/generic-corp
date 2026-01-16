import { query } from "@anthropic-ai/claude-agent-sdk";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { sanitizePromptInput } from "../services/security.js";
import { getToolsForAgent } from "../services/tools/index.js";
import { executeTool } from "../services/tool-executor.js";
import { getToolDescriptions } from "../services/tool-executor.js";
import type { TaskResult } from "@generic-corp/shared";
import type { Agent } from "@generic-corp/shared";

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
  protected agent?: Agent; // Full agent record from DB

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Set the full agent record (needed for tool permissions)
   */
  setAgentRecord(agent: any) {
    // Convert Prisma types to our Agent type
    this.agent = {
      ...agent,
      capabilities: Array.isArray(agent.capabilities) 
        ? agent.capabilities as string[]
        : typeof agent.capabilities === 'object' && agent.capabilities !== null
        ? Object.keys(agent.capabilities)
        : [],
      toolPermissions: typeof agent.toolPermissions === 'object' && agent.toolPermissions !== null
        ? agent.toolPermissions as Record<string, boolean>
        : {},
    } as Agent;
  }

  /**
   * Check if agent record is set
   */
  hasAgentRecord(): boolean {
    return this.agent !== undefined;
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

      // Get agent record for tool permissions
      if (!this.agent) {
        const agentRecord = await db.agent.findUnique({
          where: { id: context.agentId },
        });
        if (!agentRecord) {
          throw new Error(`Agent ${context.agentId} not found`);
        }
        this.setAgentRecord(agentRecord);
      }

      // Build the prompt with personality, task, and available tools
      const prompt = this.buildPrompt(context);

      // Log task start
      EventBus.emit("activity:log", {
        agentId: context.agentId,
        eventType: "task_started",
        eventData: { taskId: context.taskId, title: context.title },
      });

      console.log(`[${this.config.name}] Starting task: ${context.title}`);
      console.log(`[${this.config.name}] Prompt length: ${prompt.length} chars`);

      // Claude Agent SDK auto-detects credentials from ~/.claude/.credentials.json
      // No need to set ANTHROPIC_API_KEY manually
      const response = query({
        prompt,
        options: {
          model: "claude-sonnet-4-5",
          permissionMode: "default",
        },
      });

      // Process response and handle tool calls
      for await (const message of response) {
        if (message.type === "assistant") {
          const blocks = message.message.content;
          for (const block of blocks) {
            if (block.type === "text") {
              output += block.text;

              // Check for tool calls in the output
              const toolCall = this.extractToolCall(block.text);
              if (toolCall) {
                const toolContext = {
                  agentId: context.agentId,
                  agentName: this.config.name,
                  taskId: context.taskId,
                };

                const toolResult = await executeTool(toolCall, toolContext);
                toolsUsed.push(toolCall.name);

                // Add tool result to output
                output += `\n\n[Tool ${toolCall.name} executed: ${toolResult.success ? "success" : "failed"}]\n`;
                if (toolResult.error) {
                  output += `Error: ${toolResult.error}\n`;
                } else {
                  output += `Result: ${JSON.stringify(toolResult.result, null, 2)}\n`;
                }
              }
            }
          }
        }

        if (message.type === "result") {
          if (message.subtype !== "success") {
            throw new Error(message.errors.join("\n"));
          }

          // Final result might contain tool calls too
          const finalOutput = message.result || output;
          const toolCall = this.extractToolCall(finalOutput);
          if (toolCall) {
            const toolContext = {
              agentId: context.agentId,
              agentName: this.config.name,
              taskId: context.taskId,
            };

            const toolResult = await executeTool(toolCall, toolContext);
            toolsUsed.push(toolCall.name);
            output += `\n\n[Tool ${toolCall.name} executed: ${toolResult.success ? "success" : "failed"}]\n`;
          } else {
            output = finalOutput;
          }

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
        eventType: "task_completed",
        eventData: { taskId: context.taskId, duration: Date.now() - startTime },
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
        eventType: "task_failed",
        eventData: { taskId: context.taskId, error: errorMessage },
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
    // Sanitize input
    const sanitizedDescription = sanitizePromptInput(context.description);

    // Get available tools for this agent
    const availableTools = this.agent
      ? getToolsForAgent(this.agent)
      : [];
    const toolDescriptions =
      availableTools.length > 0 ? getToolDescriptions(availableTools) : "";

    return `${this.config.personalityPrompt}

---

You have been assigned the following task:

**Title:** ${context.title}

**Description:**
${sanitizedDescription}

**Priority:** ${context.priority}

---

${toolDescriptions ? `## Available Tools

You have access to the following tools. Use them when appropriate to complete your task:

${toolDescriptions}

To use a tool, include a JSON code block in your response with the tool name and input parameters.` : ""}

Please complete this task to the best of your ability.`;
  }

  /**
   * Extract tool call from agent output
   */
  protected extractToolCall(text: string): { name: string; input: Record<string, unknown> } | null {
    // Look for JSON code blocks with tool calls
    const jsonBlockRegex = /```json\s*\{[^}]*"tool"[^}]*\}\s*```/s;
    const match = text.match(jsonBlockRegex);

    if (match) {
      try {
        const jsonStr = match[0].replace(/```json\s*|\s*```/g, "");
        const parsed = JSON.parse(jsonStr);
        if (parsed.tool && parsed.input) {
          return {
            name: parsed.tool,
            input: parsed.input,
          };
        }
      } catch (e) {
        // Invalid JSON, ignore
      }
    }

    return null;
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
