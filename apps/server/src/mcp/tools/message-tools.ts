import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import crypto from "node:crypto";

import { appEventBus } from "../../services/app-events.js";
import { generateThreadSummary } from "../../services/chat-continuity.js";
import { getAgentByIdOrName } from "../helpers.js";
import type { McpServerDeps } from "../types.js";
import { toolText } from "../types.js";

export function messageTools(deps: McpServerDeps) {
  const { prisma, orgSlug, agentId, runtime } = deps;

  return [
    tool(
      "send_message",
      "Send a message to another agent or reply to a human user. Use toAgent='human' when replying to a human chat message.",
      {
        toAgent: z.string().describe("Name (slug) of the recipient agent, or 'human' for chat replies to users"),
        body: z.string().describe("Message content"),
        threadId: z.string().optional().describe("Thread ID to continue a conversation"),
        type: z.string().optional().describe("Message type (default: direct)"),
      },
      async (args) => {
        try {
          const sender = await getAgentByIdOrName(prisma, agentId);
          if (!sender) return toolText(`Unknown caller agent: ${agentId}`);

          const threadId = args.threadId ?? crypto.randomUUID();

          const isHumanReply = args.toAgent === "human";
          let recipientId: string;

          if (isHumanReply) {
            recipientId = sender.id;
          } else {
            const recipient = await prisma.agent.findUnique({
              where: { name: args.toAgent },
              select: { id: true, name: true },
            });
            if (!recipient) return toolText(`Unknown agent: ${args.toAgent}`);
            recipientId = recipient.id;
          }

          const message = await prisma.message.create({
            data: {
              fromAgentId: sender.id,
              toAgentId: recipientId,
              threadId,
              body: args.body,
              type: isHumanReply ? "chat" : (args.type ?? "direct"),
              status: "delivered",
            },
            select: { id: true, threadId: true },
          });

          appEventBus.emit("message_created", {
            messageId: message.id,
            threadId,
            fromAgentId: sender.id,
            toAgentId: recipientId,
            orgSlug,
          });

          return toolText(JSON.stringify({ messageId: message.id, threadId }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`send_message failed: ${msg}`);
        }
      },
    ),

    tool(
      "read_messages",
      "Read messages in a thread",
      {
        threadId: z.string().describe("Thread ID to read"),
      },
      async (args) => {
        try {
          const messages = await prisma.message.findMany({
            where: { threadId: args.threadId },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              fromAgentId: true,
              toAgentId: true,
              body: true,
              type: true,
              createdAt: true,
              sender: { select: { name: true } },
              recipient: { select: { name: true } },
            },
          });

          const formatted = messages.map((m) => ({
            id: m.id,
            from: m.sender?.name ?? "human",
            to: m.recipient.name,
            body: m.body,
            type: m.type,
            createdAt: m.createdAt.toISOString(),
          }));

          return toolText(JSON.stringify(formatted, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`read_messages failed: ${msg}`);
        }
      },
    ),

    tool(
      "list_threads",
      "List your message threads with latest message preview",
      {},
      async () => {
        try {
          const self = await getAgentByIdOrName(prisma, agentId);
          if (!self) return toolText(`Unknown caller agent: ${agentId}`);

          const latestMessages = await prisma.message.findMany({
            where: {
              OR: [
                { fromAgentId: self.id },
                { toAgentId: self.id },
              ],
              threadId: { not: null },
            },
            orderBy: { createdAt: "desc" },
            distinct: ["threadId"],
            select: {
              threadId: true,
              body: true,
              createdAt: true,
              sender: { select: { name: true } },
              recipient: { select: { name: true } },
            },
          });

          return toolText(JSON.stringify(latestMessages.map((m) => ({
            threadId: m.threadId,
            from: m.sender?.name ?? "human",
            to: m.recipient.name,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          })), null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_threads failed: ${msg}`);
        }
      },
    ),

    tool(
      "get_thread_summary",
      "Get a summary of new messages in a thread since a given time",
      {
        threadId: z.string().describe("Thread ID to summarize"),
        since: z.string().describe("ISO timestamp — summarize messages after this time"),
      },
      async (args) => {
        try {
          if (!runtime) return toolText("Runtime not available for summarization.");

          const summary = await generateThreadSummary({
            prisma,
            threadId: args.threadId,
            since: args.since,
            runtime,
          });

          return toolText(summary ?? "No new messages in this thread since the given time.");
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_thread_summary failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_thread",
      "Delete an entire thread and all its messages",
      {
        threadId: z.string().describe("Thread ID to delete"),
      },
      async (args) => {
        try {
          const self = await getAgentByIdOrName(prisma, agentId);
          if (!self) return toolText(`Unknown caller agent: ${agentId}`);

          const exists = await prisma.message.findFirst({
            where: { threadId: args.threadId },
            select: { id: true },
          });
          if (!exists) return toolText(`Thread not found: ${args.threadId}`);

          const isParticipant = await prisma.message.findFirst({
            where: {
              threadId: args.threadId,
              OR: [{ fromAgentId: self.id }, { toAgentId: self.id }],
            },
            select: { id: true },
          });
          if (!isParticipant) return toolText(`Not allowed to delete thread: ${args.threadId}`);

          const result = await prisma.message.deleteMany({ where: { threadId: args.threadId } });
          appEventBus.emit("thread_deleted", { threadId: args.threadId, messagesRemoved: result.count, orgSlug });

          return toolText(`Thread ${args.threadId} deleted (${result.count} messages removed).`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_thread failed: ${msg}`);
        }
      },
    ),

    tool(
      "mark_message_read",
      "Mark a message as read",
      {
        messageId: z.string().describe("ID of the message to mark as read"),
      },
      async (args) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: args.messageId },
            select: { id: true },
          });
          if (!message) return toolText(`Message not found: ${args.messageId}`);

          await prisma.message.update({
            where: { id: args.messageId },
            data: { status: "read", readAt: new Date() },
          });

          appEventBus.emit("message_updated", { messageId: args.messageId, orgSlug });

          return toolText(`Message ${args.messageId} marked as read.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`mark_message_read failed: ${msg}`);
        }
      },
    ),

    tool(
      "delete_message",
      "Delete a message",
      {
        messageId: z.string().describe("ID of the message to delete"),
      },
      async (args) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: args.messageId },
            select: { id: true },
          });
          if (!message) return toolText(`Message not found: ${args.messageId}`);

          await prisma.message.delete({ where: { id: args.messageId } });

          appEventBus.emit("message_deleted", { messageId: args.messageId, orgSlug });

          return toolText(`Message ${args.messageId} deleted.`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`delete_message failed: ${msg}`);
        }
      },
    ),
  ];
}
