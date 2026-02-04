import crypto from "node:crypto";

import type { Server as SocketIOServer } from "socket.io";
import type { PrismaClient } from "@prisma/client";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Options } from "@anthropic-ai/claude-agent-sdk";
import { MAIN_AGENT_NAME } from "@generic-corp/shared";
import type { MainAgentStreamEvent } from "@generic-corp/shared";

import { loadMainAgentContext } from "./main-agent-context.js";
import { DeltaBatcher } from "./delta-batcher.js";
import { buildSystemPrompt } from "./prompt-builder.js";
import { createGcMcpServer } from "../mcp/server.js";
import { createRuntime } from "../queue/workers.js";
import { appEventBus } from "./app-events.js";
import { ALL_SKILL_IDS } from "./skills.js";
import type { WorkspaceManager } from "./workspace-manager.js";

type SdkMessage = { [key: string]: unknown; type?: unknown };

interface ActiveStream {
  threadId: string;
  abortController: AbortController;
}

const MAX_HISTORY_MESSAGES = 50;

export class MainAgentStreamService {
  private activeStreams = new Map<string, ActiveStream>();

  constructor(private readonly workspaceManager: WorkspaceManager) {}

  async streamChat(
    io: SocketIOServer,
    orgSlug: string,
    prisma: PrismaClient,
    threadId: string,
    body: string,
  ): Promise<void> {
    // If there's an active stream on this thread, abort it
    this.interruptThread(threadId);

    const turnId = crypto.randomUUID();
    const room = `org:${orgSlug}:thread:${threadId}`;

    const emit = (event: MainAgentStreamEvent) => {
      io.to(room).emit("main_agent_stream", event);
    };

    // Look up the main agent
    const mainAgent = await prisma.agent.findUnique({
      where: { name: MAIN_AGENT_NAME },
      select: { id: true, name: true, displayName: true, role: true, department: true, personality: true, level: true },
    });

    if (!mainAgent) {
      emit({ type: "stream_error", turnId, threadId, error: "Main agent not found" });
      return;
    }

    // Persist user message
    const userMessage = await prisma.message.create({
      data: {
        fromAgentId: null,
        toAgentId: mainAgent.id,
        threadId,
        body,
        type: "chat",
        status: "delivered",
      },
      select: { id: true },
    });

    appEventBus.emit("message_created", {
      messageId: userMessage.id,
      threadId,
      fromAgentId: null,
      toAgentId: mainAgent.id,
      orgSlug,
    });

    // Set up abort controller
    const abortController = new AbortController();
    this.activeStreams.set(threadId, { threadId, abortController });

    const startTime = Date.now();

    try {
      // Load context
      const cwd = await this.workspaceManager.ensureAgentWorkspace(MAIN_AGENT_NAME);
      const context = await loadMainAgentContext(prisma, mainAgent.id, MAIN_AGENT_NAME, cwd);

      // Load conversation history
      const historyMessages = await prisma.message.findMany({
        where: { threadId },
        orderBy: { createdAt: "asc" },
        take: MAX_HISTORY_MESSAGES,
        select: {
          fromAgentId: true,
          body: true,
        },
      });

      const conversationHistory = historyMessages
        .map((m) => m.fromAgentId === null ? `[Human]: ${m.body}` : `[Assistant]: ${m.body}`)
        .join("\n\n");

      // Build system prompt with streaming mode
      const systemPrompt = buildSystemPrompt({
        agent: mainAgent,
        task: { id: `stream-${turnId}`, prompt: body, priority: 0, context: null, delegatorId: null, parentTaskId: null },
        streamingMode: true,
        conversationHistory,
        recentBoardItems: context.recentBoardItems,
        pendingResults: context.pendingResults,
        unreadMessageCount: context.unreadMessageCount,
        taskHistory: context.taskHistory,
        activeBlockers: context.activeBlockers,
        unreadMessagePreviews: context.unreadMessagePreviews,
        orgOverview: context.orgOverview,
        skills: ALL_SKILL_IDS,
      });

      // Create MCP server (agent still needs delegate_task, query_board, etc.)
      const runtime = createRuntime();
      const mcpServer = createGcMcpServer({
        prisma,
        orgSlug,
        agentId: MAIN_AGENT_NAME,
        taskId: `stream-${turnId}`,
        runtime,
      });

      // Emit turn_start
      emit({ type: "turn_start", turnId, threadId });

      // Set up batchers for text and thinking deltas
      const textBatcher = new DeltaBatcher((delta) => {
        emit({ type: "text_delta", turnId, threadId, delta });
      });

      const thinkingBatcher = new DeltaBatcher((delta) => {
        emit({ type: "thinking_delta", turnId, threadId, delta });
      });

      let fullText = "";
      let costUsd = 0;
      let durationMs = 0;

      // Track processed content blocks to avoid duplicates across
      // repeated assistant events for the same message
      let lastMsgId = "";
      let lastContentIdx = 0;
      const emittedToolUseIds = new Set<string>();

      // Call Agent SDK directly
      const stream = query({
        prompt: body,
        options: {
          systemPrompt,
          cwd,
          mcpServers: {
            "generic-corp": mcpServer,
          },
          permissionMode: "bypassPermissions",
          allowDangerouslySkipPermissions: true,
          model: "sonnet",
          abortController,
        } as unknown as Options,
      }) as AsyncIterable<unknown>;

      for await (const raw of stream) {
        // Check abort
        if (abortController.signal.aborted) break;

        if (!raw || typeof raw !== "object") continue;
        const msg = raw as SdkMessage;

        if (msg.type === "assistant") {
          // SDK emits assistant events with the full Anthropic message object.
          // message.content is an array of content blocks (text, tool_use, thinking).
          // The same message may be emitted multiple times as new blocks are added,
          // so we track by message ID and content index to only process new blocks.
          const message = msg["message"] as {
            id?: string;
            content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
          } | undefined;

          if (message && Array.isArray(message.content)) {
            const msgId = message.id ?? "";
            const startIdx = (msgId === lastMsgId) ? lastContentIdx : 0;

            for (let i = startIdx; i < message.content.length; i++) {
              const block = message.content[i];

              if (block.type === "text" && typeof block.text === "string") {
                fullText += block.text;
                textBatcher.append(block.text);
              } else if (block.type === "thinking" && typeof block.text === "string") {
                thinkingBatcher.append(block.text);
              } else if (block.type === "tool_use" && typeof block.name === "string") {
                const toolUseId = block.id ?? crypto.randomUUID();
                if (!emittedToolUseIds.has(toolUseId)) {
                  emittedToolUseIds.add(toolUseId);
                  textBatcher.flush();
                  thinkingBatcher.flush();
                  emit({
                    type: "tool_start",
                    turnId,
                    threadId,
                    toolUseId,
                    toolName: block.name,
                    input: block.input,
                  });
                }
              }
            }

            lastMsgId = msgId;
            lastContentIdx = message.content.length;
          }
        } else if (msg.type === "user") {
          // Tool result messages from the SDK contain tool_use_result array
          const toolResults = msg["tool_use_result"] as Array<{
            tool_use_id?: string;
            name?: string;
            content?: string;
            is_error?: boolean;
          }> | undefined;

          if (Array.isArray(toolResults)) {
            for (const tr of toolResults) {
              emit({
                type: "tool_result",
                turnId,
                threadId,
                toolUseId: tr.tool_use_id ?? crypto.randomUUID(),
                toolName: tr.name ?? "unknown",
                output: tr.content ?? "",
                isError: tr.is_error === true,
              });
            }
          }
        } else if (msg.type === "result") {
          costUsd = typeof msg["total_cost_usd"] === "number" ? msg["total_cost_usd"] : 0;
          durationMs = typeof msg["duration_ms"] === "number" ? msg["duration_ms"] : 0;
          // Use result text as fallback if no text was captured from assistant events
          if (fullText.length === 0 && typeof msg["result"] === "string") {
            fullText = msg["result"];
          }
        }
      }

      // Flush remaining batched content
      textBatcher.destroy();
      thinkingBatcher.destroy();



      if (abortController.signal.aborted) {
        // Stream was interrupted — still persist what we have
        if (fullText.length > 0) {
          const assistantMsg = await prisma.message.create({
            data: {
              fromAgentId: mainAgent.id,
              toAgentId: mainAgent.id,
              threadId,
              body: fullText + "\n\n*(interrupted)*",
              type: "chat",
              status: "delivered",
            },
            select: { id: true },
          });
          emit({
            type: "turn_complete",
            turnId,
            threadId,
            messageId: assistantMsg.id,
            fullText,
            costUsd,
            durationMs: Date.now() - startTime,
          });
        }
        return;
      }

      // Persist full assistant response
      const assistantMsg = await prisma.message.create({
        data: {
          fromAgentId: mainAgent.id,
          toAgentId: mainAgent.id,
          threadId,
          body: fullText,
          type: "chat",
          status: "delivered",
        },
        select: { id: true },
      });

      const finalDuration = durationMs || (Date.now() - startTime);

      emit({
        type: "turn_complete",
        turnId,
        threadId,
        messageId: assistantMsg.id,
        fullText,
        costUsd,
        durationMs: finalDuration,
      });

      // Emit message_created via eventBus for thread list updates in sidebar
      appEventBus.emit("message_created", {
        messageId: assistantMsg.id,
        threadId,
        fromAgentId: mainAgent.id,
        toAgentId: mainAgent.id,
        orgSlug,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Stream] Error in thread ${threadId}:`, message);
      emit({ type: "stream_error", turnId, threadId, error: message });
    } finally {
      this.activeStreams.delete(threadId);
    }
  }

  interruptThread(threadId: string): void {
    const active = this.activeStreams.get(threadId);
    if (active) {
      active.abortController.abort();
      this.activeStreams.delete(threadId);
    }
  }
}
