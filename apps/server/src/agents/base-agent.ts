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
      // This now includes dynamic context injection (dependencies, budget, team status)
      const prompt = await this.buildPrompt(context);

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


  protected async buildPrompt(context: TaskContext): Promise<string> {
    // Sanitize input
    const sanitizedDescription = sanitizePromptInput(context.description);

    // Get available tools for this agent
    const availableTools = this.agent
      ? getToolsForAgent(this.agent)
      : [];
    const toolDescriptions =
      availableTools.length > 0 ? getToolDescriptions(availableTools) : "";

    // CONTEXT INJECTION: Automatic context refresh at session start
    // This provides fresh system state without requiring explicit refresh_context call
    // Addresses agent-native audit requirement for automatic context injection
    const contextSections: string[] = [];

    // Session start marker with timestamp for context freshness
    contextSections.push(`## Session Context (Auto-Refreshed)
**Session Start:** ${new Date().toISOString()}
**Task ID:** ${context.taskId}
This context was automatically injected at session start. Use \`refresh_context\` tool if you need updated data mid-session.`);

    // 1. Inject task dependencies
    const dependencies = await db.taskDependency.findMany({
      where: { taskId: context.taskId },
      include: {
        dependsOn: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (dependencies.length > 0) {
      const blockingDeps = dependencies.filter(d => d.dependsOn.status !== "completed");
      contextSections.push(`## Task Dependencies
${dependencies.map(d => `- ${d.dependsOn.title} (${d.dependsOn.status})${d.dependsOn.status !== "completed" ? " ⚠️ BLOCKING" : " ✓"}`).join("\n")}
${blockingDeps.length > 0 ? `\n**Warning:** ${blockingDeps.length} blocking dependencies not yet completed.` : ""}`);
    }

    // 2. Inject budget information
    const gameState = await db.gameState.findFirst({
      where: { playerId: "default" },
    });

    if (gameState) {
      const remaining = Number(gameState.budgetRemainingUsd);
      const limit = Number(gameState.budgetLimitUsd);
      const percentUsed = limit > 0 ? ((limit - remaining) / limit) * 100 : 0;
      contextSections.push(`## Budget Context
- Remaining: $${remaining.toFixed(2)} / $${limit.toFixed(2)}
- Used: ${percentUsed.toFixed(1)}%
${percentUsed > 80 ? "⚠️ Budget is running low. Be efficient with token usage." : ""}`);
    }

    // 3. Inject acceptance criteria if present in task
    // Note: Acceptance criteria is extracted directly from sanitizedDescription
    // since task.description is the same as what we already have

    // Extract acceptance criteria from description if present
    const acceptanceCriteriaMatch = sanitizedDescription.match(/## Acceptance Criteria\n([\s\S]*?)(?=\n##|$)/);
    if (acceptanceCriteriaMatch) {
      contextSections.push(`## Success Criteria
Review these acceptance criteria and ensure your work meets them:
${acceptanceCriteriaMatch[1].trim()}`);
    }

    // 4. Inject team context (other agents' status)
    const otherAgents = await db.agent.findMany({
      where: {
        id: { not: context.agentId },
        deletedAt: null,
      },
      select: {
        name: true,
        role: true,
        status: true,
        currentTaskId: true,
      },
      take: 5,
    });

    if (otherAgents.length > 0) {
      const workingAgents = otherAgents.filter(a => a.status === "working");
      if (workingAgents.length > 0) {
        contextSections.push(`## Team Status
${workingAgents.map(a => `- ${a.name} (${a.role}): ${a.status}`).join("\n")}
Coordinate with team members if your task requires collaboration.`);
      }
    }

    // 5. Inject recent activity for this task
    const recentActivity = await db.activityLog.findMany({
      where: { taskId: context.taskId },
      orderBy: { timestamp: "desc" },
      take: 3,
    });

    if (recentActivity.length > 0) {
      contextSections.push(`## Recent Activity
${recentActivity.map(a => `- ${a.action}: ${JSON.stringify(a.details)}`).join("\n")}`);
    }

    // 6. Inject relevant prompt template for task execution guidance
    // This loads from prompt templates (prompt-native approach)
    const { promptTemplates } = require("../tools/definitions/index.js");
    const executionTemplate = promptTemplates.task_execution;
    if (executionTemplate) {
      contextSections.push(`## Task Execution Guidelines
${executionTemplate.template}

Use the help tool if you need guidance on available capabilities.`);
    }

    // 7. Inject tool access summary for this agent (prompt-native)
    if (this.agent) {
      const { toolPermissions } = require("../tools/definitions/index.js");
      const role = this.agent.role?.toLowerCase().replace(/\s+/g, "_") || "default";
      const allowedToolNames: string[] = toolPermissions[role] || toolPermissions.default || [];

      // Group tools by category
      const taskTools = allowedToolNames.filter((t: string) => t.startsWith("task_"));
      const messageTools = allowedToolNames.filter((t: string) => t.startsWith("message_") || t.startsWith("draft_"));
      const configTools = allowedToolNames.filter((t: string) => t.startsWith("config_") || t.startsWith("prompt_"));
      const storageTools = allowedToolNames.filter((t: string) => t.startsWith("store_") || t.startsWith("context_"));

      contextSections.push(`## Your Capabilities Summary
You have access to ${allowedToolNames.length} tools:
- Task Management: ${taskTools.length} tools (${taskTools.slice(0, 3).join(", ")}${taskTools.length > 3 ? "..." : ""})
- Messaging: ${messageTools.length} tools
- Storage: ${storageTools.length} tools
- Configuration: ${configTools.length} tools (can query configs, templates)

Use 'capabilities_list' for full details or 'suggest_tool' for recommendations.`);
    }

    // 8. Inject session history for continuity
    const recentSessions = await db.agentSession.findMany({
      where: { agentId: context.agentId },
      orderBy: { startedAt: "desc" },
      take: 3,
      select: {
        taskId: true,
        status: true,
        tokensUsed: true,
        startedAt: true,
      },
    });

    if (recentSessions.length > 0) {
      contextSections.push(`## Session History
Your last ${recentSessions.length} sessions:
${recentSessions.map(s => {
        const tokens = s.tokensUsed as { input?: number; output?: number } | null;
        const tokenInfo = tokens ? ` (${tokens.input || 0} in, ${tokens.output || 0} out)` : "";
        return `- ${s.status}${tokenInfo} - ${new Date(s.startedAt).toLocaleDateString()}`;
      }).join("\n")}

This context helps maintain continuity across sessions.`);
    }

    // 9. Inject collaboration guidelines from prompt template
    const collabTemplate = promptTemplates.collaboration;
    const teamMembers = await db.agent.findMany({
      where: { deletedAt: null, id: { not: this.agent?.id } },
      select: { name: true, role: true },
      take: 5,
    });

    if (teamMembers.length > 0) {
      const collabGuidelines = collabTemplate ? collabTemplate.template : `When collaborating:
- Use message_send for async communication
- Be specific about requests and deadlines
- Share learnings in context_write for future reference`;

      contextSections.push(`## Team Collaboration
Your team members: ${teamMembers.map(a => `${a.name} (${a.role})`).join(", ")}

${collabGuidelines}`);
    }

    // 10. Inject prompt-native configuration awareness
    // This tells agents that behavior is defined by queryable configs, not hardcoded
    const { taskStatusTransitions, workflowConfigs } = require("../tools/definitions/index.js");
    contextSections.push(`## Prompt-Native Configuration
Your behavior is guided by queryable configurations, not hardcoded rules:

**Task Status Transitions** (query: \`config_get_status_transitions\`):
${Object.entries(taskStatusTransitions).map(([from, to]) => `- ${from} → ${(to as string[]).join(", ") || "(terminal)"}`).join("\n")}

**Available Workflows** (query: \`config_get_workflow\`):
${Object.keys(workflowConfigs).join(", ")}

**Prompt Templates** (query: \`prompt_template_list\`):
Task execution, draft review, escalation, task prioritization, collaboration

Use these config tools to understand and adapt to current system rules.`);

    const contextSection = contextSections.length > 0
      ? `\n---\n\n# Context\n\n${contextSections.join("\n\n")}\n`
      : "";

    return `${this.config.personalityPrompt}

---

You have been assigned the following task:

**Title:** ${context.title}

**Description:**
${sanitizedDescription}

**Priority:** ${context.priority}
${contextSection}
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
