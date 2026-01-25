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

/**
 * Reply to a message
 */
export async function messageReply(
  params: {
    messageId: string;
    body: string;
  },
  context: { agentId: string; agentName: string }
): Promise<{ success: boolean; messageId: string }> {
  // Get the original message
  const originalMessage = await db.message.findUnique({
    where: { id: params.messageId },
    include: {
      fromAgent: { select: { id: true, name: true } },
    },
  });

  if (!originalMessage) {
    throw new Error(`Message not found: ${params.messageId}`);
  }

  // Create reply - swap sender and recipient
  // Note: Message model doesn't have parentId - replies are tracked via subject prefix
  const reply = await db.message.create({
    data: {
      fromAgentId: context.agentId,
      toAgentId: originalMessage.fromAgentId,
      subject: originalMessage.subject.startsWith("Re: ")
        ? originalMessage.subject
        : `Re: ${originalMessage.subject}`,
      body: params.body,
      type: "direct",
      status: "pending",
      isExternalDraft: false,
    },
  });

  // Emit event for real-time notification
  EventBus.emit("message:new", {
    toAgentId: originalMessage.fromAgentId,
    message: reply,
  });

  return { success: true, messageId: reply.id };
}

/**
 * Delete a message (soft delete)
 */
export async function messageDelete(
  params: {
    messageId: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  const message = await db.message.findUnique({
    where: { id: params.messageId },
  });

  if (!message) {
    throw new Error(`Message not found: ${params.messageId}`);
  }

  // Only allow deleting own messages
  if (message.fromAgentId !== context.agentId && message.toAgentId !== context.agentId) {
    throw new Error("Cannot delete messages that don't belong to you");
  }

  await db.message.update({
    where: { id: params.messageId },
    data: { deletedAt: new Date() },
  });

  return { success: true };
}

/**
 * Approve an external draft (CEO action)
 */
export async function draftApprove(
  params: {
    draftId: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; messageId?: string }> {
  const draft = await db.message.findUnique({
    where: { id: params.draftId },
    include: { fromAgent: true },
  });

  if (!draft) {
    throw new Error(`Draft not found: ${params.draftId}`);
  }

  if (draft.type !== "external_draft") {
    throw new Error("Can only approve external drafts");
  }

  if (draft.status !== "pending") {
    throw new Error(`Draft is not pending: ${draft.status}`);
  }

  // Update draft status
  await db.message.update({
    where: { id: params.draftId },
    data: {
      status: "approved",
      approvedBy: context.agentId,
      approvedAt: new Date(),
    },
  });

  // Send the email via email service
  const { EmailService } = await import("../../services/email-service.js");
  const emailResult = await EmailService.sendEmail({
    to: draft.externalRecipient || "",
    subject: draft.subject,
    body: draft.body,
    from: draft.fromAgent?.name || "Generic Corp",
  });

  if (!emailResult.success) {
    // Revert status on failure
    await db.message.update({
      where: { id: params.draftId },
      data: { status: "pending", approvedBy: null, approvedAt: null },
    });
    throw new Error(emailResult.error || "Failed to send email");
  }

  // Log activity
  EventBus.emit("activity:log", {
    agentId: context.agentId,
    eventType: "draft_approved",
    eventData: {
      draftId: params.draftId,
      recipient: draft.externalRecipient,
      subject: draft.subject,
    },
  });

  return { success: true, messageId: emailResult.messageId };
}

/**
 * Reject an external draft (CEO action)
 */
export async function draftReject(
  params: {
    draftId: string;
    reason?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  const draft = await db.message.findUnique({
    where: { id: params.draftId },
  });

  if (!draft) {
    throw new Error(`Draft not found: ${params.draftId}`);
  }

  if (draft.type !== "external_draft") {
    throw new Error("Can only reject external drafts");
  }

  if (draft.status !== "pending") {
    throw new Error(`Draft is not pending: ${draft.status}`);
  }

  await db.message.update({
    where: { id: params.draftId },
    data: { status: "rejected" },
  });

  // Emit rejection event
  EventBus.emit("draft:rejected", {
    draftId: params.draftId,
    reason: params.reason,
  });

  // Log activity
  EventBus.emit("activity:log", {
    agentId: context.agentId,
    eventType: "draft_rejected",
    eventData: { draftId: params.draftId, reason: params.reason },
  });

  return { success: true };
}

/**
 * List drafts
 */
export async function draftList(params: {
  status?: "pending" | "approved" | "rejected";
}): Promise<{
  drafts: Array<{
    id: string;
    from: string;
    to: string;
    subject: string;
    body: string;
    status: string;
    createdAt: Date;
  }>;
}> {
  const whereClause: Record<string, unknown> = {
    type: "external_draft",
    deletedAt: null,
  };

  if (params.status) {
    whereClause.status = params.status;
  }

  const drafts = await db.message.findMany({
    where: whereClause,
    include: {
      fromAgent: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return {
    drafts: drafts.map((d) => ({
      id: d.id,
      from: d.fromAgent?.name || "Unknown",
      to: d.externalRecipient || "",
      subject: d.subject,
      body: d.body,
      status: d.status,
      createdAt: d.createdAt,
    })),
  };
}

/**
 * Update a pending draft
 */
export async function draftUpdate(
  params: {
    draftId: string;
    subject?: string;
    body?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const draft = await db.message.findUnique({
    where: { id: params.draftId },
  });

  if (!draft) {
    throw new Error(`Draft not found: ${params.draftId}`);
  }

  if (draft.type !== "external_draft") {
    throw new Error("Can only update external drafts");
  }

  if (draft.status !== "pending") {
    throw new Error(`Cannot update draft that is ${draft.status}`);
  }

  // Only allow the creator or CEO to update
  const agent = await db.agent.findUnique({
    where: { id: context.agentId },
    select: { role: true },
  });

  if (draft.fromAgentId !== context.agentId && agent?.role !== "ceo") {
    throw new Error("Only the draft creator or CEO can update drafts");
  }

  const updateData: Record<string, string> = {};
  if (params.subject !== undefined) {
    updateData.subject = params.subject;
  }
  if (params.body !== undefined) {
    updateData.body = params.body;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, message: "No updates provided" };
  }

  await db.message.update({
    where: { id: params.draftId },
    data: updateData,
  });

  EventBus.emit("draft:updated", {
    draftId: params.draftId,
    updatedBy: context.agentId,
  });

  return { success: true, message: "Draft updated successfully" };
}
