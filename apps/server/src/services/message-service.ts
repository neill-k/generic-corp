import { db } from "../db/index.js";
import { EventBus } from "./event-bus.js";
import type { MessageType, MessageStatus } from "@generic-corp/shared";

export interface CreateMessageParams {
  fromAgentId: string;
  toAgentId: string;
  subject: string;
  body: string;
  type?: MessageType;
  priority?: "low" | "normal" | "high";
}

export interface CreateDraftParams {
  fromAgentId: string;
  externalRecipient: string;
  subject: string;
  body: string;
}

export class MessageService {
  /**
   * Send an internal message between agents
   */
  static async send(params: CreateMessageParams) {
    const message = await db.message.create({
      data: {
        fromAgentId: params.fromAgentId,
        toAgentId: params.toAgentId,
        subject: params.subject,
        body: params.body,
        type: params.type || "direct",
        status: "pending",
        isExternalDraft: false,
      },
      include: {
        fromAgent: true,
        toAgent: true,
      },
    });

    // Emit event for WebSocket broadcast
    EventBus.emit("message:new", {
      toAgentId: params.toAgentId,
      message,
    });

    return message;
  }

  /**
   * Create an external draft that requires player approval
   */
  static async createDraft(params: CreateDraftParams) {
    const draft = await db.message.create({
      data: {
        fromAgentId: params.fromAgentId,
        toAgentId: params.fromAgentId, // Self-reference for drafts
        subject: params.subject,
        body: params.body,
        type: "external_draft",
        status: "pending",
        isExternalDraft: true,
        externalRecipient: params.externalRecipient,
      },
      include: {
        fromAgent: true,
      },
    });

    // Emit event for player notification
    EventBus.emit("draft:pending", {
      draftId: draft.id,
      fromAgent: params.fromAgentId,
      content: {
        recipient: params.externalRecipient,
        subject: params.subject,
        body: params.body,
      },
    });

    return draft;
  }

  /**
   * Get unread messages for an agent
   */
  static async getUnread(agentId: string) {
    return db.message.findMany({
      where: {
        toAgentId: agentId,
        status: { in: ["pending", "delivered"] },
        readAt: null,
        deletedAt: null,
      },
      include: {
        fromAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Mark a message as read
   */
  static async markAsRead(messageId: string, _agentId: string) {
    return db.message.update({
      where: { id: messageId },
      data: {
        status: "read" as MessageStatus,
        readAt: new Date(),
      },
    });
  }

  /**
   * Approve an external draft
   */
  static async approveDraft(draftId: string, approvedBy: string) {
    const draft = await db.message.update({
      where: { id: draftId },
      data: {
        status: "approved" as MessageStatus,
        approvedBy,
        approvedAt: new Date(),
      },
    });

    return draft;
  }

  /**
   * Reject an external draft
   */
  static async rejectDraft(draftId: string, reason?: string) {
    const draft = await db.message.update({
      where: { id: draftId },
      data: {
        status: "rejected" as MessageStatus,
      },
    });

    EventBus.emit("draft:rejected", {
      draftId,
      reason,
    });

    return draft;
  }
}
