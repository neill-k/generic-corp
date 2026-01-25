import { query, createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { sanitizePromptInput } from "../services/security.js";
import { MessageService } from "../services/message-service.js";
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
   * Create custom MCP server with game-specific tools
   */
  protected createGameToolsServer(agentId: string, _agentName: string, taskId: string) {
    return createSdkMcpServer({
      name: "game-tools",
      version: "1.0.0",
      tools: [
        tool(
          "send_message",
          "Send a message to another team member at Generic Corp",
          {
            to: z.string().describe("Recipient name (e.g., 'Sable Chen', 'Marcus Bell')"),
            subject: z.string().describe("Brief subject line"),
            body: z.string().describe("Message content"),
          },
          async (args) => {
            try {
              const recipient = await db.agent.findFirst({
                where: {
                  name: { contains: args.to, mode: "insensitive" },
                  deletedAt: null,
                },
              });

              if (!recipient) {
                return {
                  content: [{ type: "text", text: `Error: Agent "${args.to}" not found. Available team members: Marcus Bell, Sable Chen, DeVonte Jackson, Yuki Tanaka, Graham Sutton` }],
                };
              }

              const message = await MessageService.send({
                fromAgentId: agentId,
                toAgentId: recipient.id,
                subject: args.subject,
                body: args.body,
                type: "direct",
              });

              EventBus.emit("activity:log", {
                agentId,
                eventType: "message_sent",
                eventData: { to: recipient.name, subject: args.subject, messageId: message.id },
              });

              return {
                content: [{ type: "text", text: `✓ Message sent to ${recipient.name} (ID: ${message.id})` }],
              };
            } catch (error) {
              return {
                content: [{ type: "text", text: `Error sending message: ${error instanceof Error ? error.message : "Unknown error"}` }],
              };
            }
          }
        ),

        tool(
          "check_inbox",
          "Check your inbox for unread messages from team members",
          {},
          async () => {
            try {
              const messages = await MessageService.getUnread(agentId);

              if (messages.length === 0) {
                return {
                  content: [{ type: "text", text: "📭 No unread messages" }],
                };
              }

              // Mark messages as read
              for (const msg of messages) {
                await MessageService.markAsRead(msg.id, agentId);
              }

              const formatted = messages.map(
                (m) => `From: ${m.fromAgent?.name || "Unknown"}\nSubject: ${m.subject}\n${m.body}\n---`
              ).join("\n");

              return {
                content: [{ type: "text", text: `📬 ${messages.length} message(s):\n\n${formatted}` }],
              };
            } catch (error) {
              return {
                content: [{ type: "text", text: `Error checking inbox: ${error instanceof Error ? error.message : "Unknown error"}` }],
              };
            }
          }
        ),

        tool(
          "draft_external_email",
          "Draft an email to be sent externally. IMPORTANT: This creates a draft that requires CEO approval before sending.",
          {
            recipient: z.string().email().describe("External email address"),
            subject: z.string().describe("Email subject"),
            body: z.string().describe("Email body"),
          },
          async (args) => {
            try {
              const draft = await MessageService.createDraft({
                fromAgentId: agentId,
                externalRecipient: args.recipient,
                subject: args.subject,
                body: args.body,
              });

              return {
                content: [{ type: "text", text: `📝 Draft created (ID: ${draft.id}). Sent to CEO for approval. The email will NOT be sent until approved.` }],
              };
            } catch (error) {
              return {
                content: [{ type: "text", text: `Error creating draft: ${error instanceof Error ? error.message : "Unknown error"}` }],
              };
            }
          }
        ),

        tool(
          "report_progress",
          "Report progress on the current task to the system",
          {
            percent: z.number().min(0).max(100).describe("Progress percentage (0-100)"),
            message: z.string().describe("Status message"),
          },
          async (args) => {
            EventBus.emit("task:progress", {
              taskId,
              progress: args.percent,
              details: { message: args.message },
            });
            return {
              content: [{ type: "text", text: `Progress reported: ${args.percent}% - ${args.message}` }],
            };
          }
        ),
      ],
    });
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

      // Create custom MCP server with game-specific tools
      const gameToolsServer = this.createGameToolsServer(
        context.agentId,
        this.config.name,
        context.taskId
      );

      // Create async generator for streaming input (required for MCP servers)
      // Use the Claude Agent SDK with:
      // - bypassPermissions: Agents can work autonomously without prompts
      // - Native tools: Read, Write, Edit, Bash, Glob, Grep
      // - Custom MCP tools: send_message, check_inbox, draft_external_email, report_progress
      const response = query({
        prompt,
        options: {
          model: "claude-sonnet-4-5",
          permissionMode: "bypassPermissions",
          mcpServers: {
            "game-tools": gameToolsServer,
          },
          maxTurns: 10, // Allow multiple tool use turns
        },
      });

      // Process streaming response
      for await (const message of response) {
        if (message.type === "assistant") {
          const blocks = message.message.content;
          for (const block of blocks) {
            if (block.type === "text") {
              output += block.text;
            }
            if (block.type === "tool_use") {
              toolsUsed.push(block.name);
              console.log(`[${this.config.name}] Using tool: ${block.name}`);

              // Emit progress for tool use
              EventBus.emit("task:progress", {
                taskId: context.taskId,
                progress: Math.min(80, toolsUsed.length * 15),
                details: { message: `Using ${block.name}`, tool: block.name },
              });
            }
          }
        }

        if (message.type === "result") {
          if (message.subtype !== "success") {
            throw new Error(message.errors.join("\n"));
          }

          // Use final result
          if (message.result) {
            output = message.result;
          }

          tokensUsed.input = message.usage.input_tokens;
          tokensUsed.output = message.usage.output_tokens;
          break;
        }
      }

      console.log(`[${this.config.name}] Task complete. Tools used: ${toolsUsed.join(", ") || "none"}`);
      console.log(`[${this.config.name}] Tokens: ${tokensUsed.input} input, ${tokensUsed.output} output`);

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
