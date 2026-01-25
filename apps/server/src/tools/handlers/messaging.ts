import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";

/**
 * Send a message to another agent
 */
export async function messageSend(
  params: {
    toAgentId: string;
    subject: string;
    body: string;
  },
  context: { agentId: string; agentName: string }
): Promise<{ success: boolean; messageId: string }> {
  // Verify recipient exists
  const recipient = await db.agent.findUnique({
    where: { id: params.toAgentId },
  });

  if (!recipient) {
    throw new Error(`Recipient agent not found: ${params.toAgentId}`);
  }

  // Create the message
  const message = await db.message.create({
    data: {
      fromAgentId: context.agentId,
      toAgentId: params.toAgentId,
      subject: params.subject,
      body: params.body,
      type: "direct",
      status: "pending",
      isExternalDraft: false,
    },
  });

  // Emit event for real-time notification
  EventBus.emit("message:new", {
    toAgentId: params.toAgentId,
    message,
  });

  return { success: true, messageId: message.id };
}

/**
 * Check inbox for messages
 */
export async function messageCheckInbox(
  params: {
    unreadOnly?: boolean;
  },
  context: { agentId: string }
): Promise<{
  messages: Array<{
    id: string;
    from: string;
    subject: string;
    body: string;
    createdAt: Date;
    read: boolean;
  }>;
  unreadCount: number;
}> {
  // Build query
  const whereClause: Record<string, unknown> = {
    toAgentId: context.agentId,
  };

  if (params.unreadOnly) {
    whereClause.readAt = null;
  }

  // Get messages
  const messages = await db.message.findMany({
    where: whereClause,
    include: {
      fromAgent: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Get unread count
  const unreadCount = await db.message.count({
    where: {
      toAgentId: context.agentId,
      readAt: null,
    },
  });

  return {
    messages: messages.map((m) => ({
      id: m.id,
      from: m.fromAgent?.name || "Unknown",
      subject: m.subject,
      body: m.body,
      createdAt: m.createdAt,
      read: m.readAt !== null,
    })),
    unreadCount,
  };
}

/**
 * Mark messages as read
 */
export async function messageMarkRead(
  params: {
    messageIds: string[];
  },
  context: { agentId: string }
): Promise<{ success: boolean; count: number }> {
  const result = await db.message.updateMany({
    where: {
      id: { in: params.messageIds },
      toAgentId: context.agentId, // Only mark own messages
    },
    data: {
      readAt: new Date(),
      status: "read",
    },
  });

  return { success: true, count: result.count };
}

/**
 * Create an external email draft (requires CEO approval)
 */
export async function externalDraftEmail(
  params: {
    to: string;
    subject: string;
    body: string;
  },
  context: { agentId: string; agentName: string }
): Promise<{ success: boolean; draftId: string }> {
  // Create as external draft message
  const draft = await db.message.create({
    data: {
      fromAgentId: context.agentId,
      toAgentId: context.agentId, // Self-reference for drafts
      subject: params.subject,
      body: params.body,
      type: "external_draft",
      status: "pending",
      isExternalDraft: true,
      externalRecipient: params.to,
    },
  });

  // Emit event for CEO notification
  EventBus.emit("draft:pending", {
    draftId: draft.id,
    fromAgent: context.agentName,
    content: {
      to: params.to,
      subject: params.subject,
      body: params.body,
    },
  });

  return { success: true, draftId: draft.id };
}
