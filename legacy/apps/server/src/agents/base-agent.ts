import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { sanitizePromptInput } from "../services/security.js";
import { CliRunner } from "../workers/cli/cli-runner.js";
import { GenericCliAdapter } from "../workers/cli/adapters/generic-adapter.js";
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
  private readonly cliRunner = new CliRunner();
  private readonly cliAdapter = new GenericCliAdapter();

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

      const cliResult = await this.cliRunner.run(this.cliAdapter, {
        tool: "generic",
        prompt,
        timeoutMs: 120_000,
      });

      const parsed = this.cliAdapter.parseResult(cliResult);
      output = parsed.output;
      toolsUsed.push(...(parsed.toolsUsed ?? []));
      if (parsed.tokensUsed) {
        tokensUsed.input = parsed.tokensUsed.input;
        tokensUsed.output = parsed.tokensUsed.output;
      }

      console.log(`[${this.config.name}] Task complete. Tools used: ${toolsUsed.join(", ") || "none"}`);

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

    return `${this.config.personalityPrompt}

---

## Your Team at Generic Corp

You work with these colleagues (use send_message to contact them):
- **Marcus Bell** - CEO, coordinates team efforts
- **Sable Chen** - Principal Engineer, architecture & code review expert
- **DeVonte Jackson** - Full-Stack Developer, rapid prototyper
- **Yuki Tanaka** - SRE, infrastructure & reliability
- **Graham Sutton** - Data Engineer, analytics & pipelines

---

## Current Task

**Title:** ${context.title}

**Description:**
${sanitizedDescription}

**Priority:** ${context.priority}

---

## Instructions

1. Complete the task using your available tools (file operations, bash, messaging)
2. Use send_message to coordinate with teammates when needed
3. Use report_progress to update the CEO on your status
4. Use check_inbox to see if anyone has sent you relevant info

Complete this task to the best of your ability.`;
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
