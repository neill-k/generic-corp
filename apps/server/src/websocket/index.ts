import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { WS_EVENTS } from "@generic-corp/shared";

// Simple token-based authentication for WebSocket connections
// In production, this should use JWT with proper key management

// Valid session tokens (in production, use Redis or database-backed sessions)
const validTokens = new Map<string, { playerId: string; expiresAt: number }>();

/**
 * Generate a session token for WebSocket authentication
 */
export function generateWsToken(playerId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  validTokens.set(token, { playerId, expiresAt });
  return token;
}

/**
 * Validate a WebSocket authentication token
 */
function validateWsToken(token: string): { valid: boolean; playerId?: string } {
  const session = validTokens.get(token);
  if (!session) {
    return { valid: false };
  }
  if (Date.now() > session.expiresAt) {
    validTokens.delete(token);
    return { valid: false };
  }
  return { valid: true, playerId: session.playerId };
}

/**
 * Clean up expired tokens periodically
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, session] of validTokens.entries()) {
    if (now > session.expiresAt) {
      validTokens.delete(token);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

export function setupWebSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    // In development mode, allow unauthenticated connections if explicitly enabled
    if (process.env.NODE_ENV === "development" && process.env.WS_AUTH_DISABLED === "true") {
      (socket as any).playerId = "default";
      return next();
    }

    if (!token || typeof token !== "string") {
      return next(new Error("Authentication required: missing token"));
    }

    const validation = validateWsToken(token);
    if (!validation.valid) {
      return next(new Error("Authentication failed: invalid or expired token"));
    }

    // Attach playerId to socket for later use
    (socket as any).playerId = validation.playerId;
    next();
  });

  // ================== SERVER -> CLIENT EVENTS ==================

  EventBus.on("agent:status", (data) => {
    io.emit(WS_EVENTS.AGENT_STATUS, data);
  });

  EventBus.on("task:progress", (data) => {
    io.emit(WS_EVENTS.TASK_PROGRESS, data);
  });

  EventBus.on("task:completed", (data) => {
    io.emit(WS_EVENTS.TASK_COMPLETED, data);
  });

  EventBus.on("task:failed", (data) => {
    io.emit(WS_EVENTS.TASK_FAILED, data);
  });

  EventBus.on("message:new", (data) => {
    io.emit(WS_EVENTS.MESSAGE_NEW, data);
  });

  EventBus.on("draft:pending", (data) => {
    io.emit(WS_EVENTS.DRAFT_PENDING, data);
  });

  EventBus.on("activity:log", (data) => {
    io.emit(WS_EVENTS.ACTIVITY_LOG, data);
  });

  // FIXED: Budget updates were a "silent action" - now emit to UI
  EventBus.on("budget:updated", (data) => {
    io.emit(WS_EVENTS.BUDGET_UPDATED, data);
  });

  // FIXED: Session updates were a "silent action" - now emit to UI
  EventBus.on("agent:session-completed", (data) => {
    io.emit(WS_EVENTS.SESSION_COMPLETED, data);
  });

  // Task cancelled event
  EventBus.on("task:cancelled", (data) => {
    io.emit(WS_EVENTS.TASK_CANCELLED, data);
  });

  // ================== CLIENT -> SERVER COMMANDS ==================

  io.on("connection", async (socket) => {
    const playerId = (socket as any).playerId || "default";
    console.log(`[WebSocket] Client connected: ${socket.id} (player: ${playerId})`);

    // Send initial state
    await sendInitialState(socket);

    // Handle task assignment
    socket.on(WS_EVENTS.TASK_ASSIGN, async (data, callback) => {
      try {
        const { agentId, title, description, priority } = data;

        const agent = await db.agent.findFirst({
          where: { name: agentId },
        });

        if (!agent) {
          callback({ success: false, error: `Agent ${agentId} not found` });
          return;
        }

        const task = await db.task.create({
          data: {
            agentId: agent.id,
            createdById: agent.id, // For now, self-assigned
            title,
            description,
            priority: priority || "normal",
            status: "pending",
          },
        });

        // Emit event for queue to pick up
        EventBus.emit("task:queued", { agentId: agent.id, task });

        callback({ success: true, taskId: task.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle draft approval
    socket.on(WS_EVENTS.DRAFT_APPROVE, async (data, callback) => {
      try {
        const { draftId } = data;

        // Fetch the draft first
        const draft = await db.message.findUnique({
          where: { id: draftId },
          include: { fromAgent: true },
        });

        if (!draft) {
          throw new Error(`Draft ${draftId} not found`);
        }

        await db.message.update({
          where: { id: draftId },
          data: {
            status: "approved",
            approvedBy: "player",
            approvedAt: new Date(),
          },
        });

        // Send the email via email service
        const { EmailService } = await import("../services/email-service.js");
        const emailResult = await EmailService.sendEmail({
          to: draft.externalRecipient || "",
          subject: draft.subject,
          body: draft.body,
          from: draft.fromAgent?.name || "Generic Corp",
        });

        if (!emailResult.success) {
          throw new Error(emailResult.error || "Failed to send email");
        }

        callback({ success: true, messageId: emailResult.messageId });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle draft rejection
    socket.on(WS_EVENTS.DRAFT_REJECT, async (data, callback) => {
      try {
        const { draftId, reason } = data;

        await db.message.update({
          where: { id: draftId },
          data: { status: "rejected" },
        });

        EventBus.emit("draft:rejected", { draftId, reason });

        callback({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle message send from player
    socket.on(WS_EVENTS.MESSAGE_SEND, async (data, callback) => {
      try {
        const { toAgentId, subject, body } = data;

        const toAgent = await db.agent.findFirst({
          where: { name: toAgentId },
        });

        if (!toAgent) {
          callback({ success: false, error: `Agent ${toAgentId} not found` });
          return;
        }

        // Get "Marcus" as the sender (player's avatar)
        const marcus = await db.agent.findFirst({
          where: { name: "Marcus Bell" },
        });

        const message = await db.message.create({
          data: {
            fromAgentId: marcus?.id || toAgent.id,
            toAgentId: toAgent.id,
            subject,
            body,
            type: "direct",
            status: "pending",
          },
        });

        EventBus.emit("message:new", { toAgentId: toAgent.id, message });

        callback({ success: true, messageId: message.id });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle game state sync
    socket.on(WS_EVENTS.STATE_SYNC, async (data) => {
      await db.gameState.upsert({
        where: { playerId: "default" },
        update: {
          cameraPosition: data.camera,
          uiState: data.ui,
          lastSyncAt: new Date(),
        },
        create: {
          playerId: "default",
          cameraPosition: data.camera || {},
          uiState: data.ui || {},
          budgetRemainingUsd: 100,
          budgetLimitUsd: 100,
        },
      });
    });

    // Handle task cancellation (Action Parity - user can cancel tasks)
    socket.on(WS_EVENTS.TASK_CANCEL, async (data, callback) => {
      try {
        const { taskId, reason } = data;

        const task = await db.task.findUnique({
          where: { id: taskId },
        });

        if (!task) {
          callback({ success: false, error: `Task ${taskId} not found` });
          return;
        }

        if (!["pending", "in_progress", "blocked"].includes(task.status)) {
          callback({ success: false, error: `Cannot cancel task in status ${task.status}` });
          return;
        }

        await db.task.update({
          where: { id: taskId },
          data: {
            status: "cancelled",
            previousStatus: task.status,
            errorDetails: reason ? { cancelReason: reason } : undefined,
          },
        });

        EventBus.emit("task:cancelled", { taskId, agentId: task.agentId, reason });

        callback({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle task retry (Action Parity - user can retry failed tasks)
    socket.on(WS_EVENTS.TASK_RETRY, async (data, callback) => {
      try {
        const { taskId } = data;

        const task = await db.task.findUnique({
          where: { id: taskId },
        });

        if (!task) {
          callback({ success: false, error: `Task ${taskId} not found` });
          return;
        }

        if (task.status !== "failed") {
          callback({ success: false, error: `Can only retry failed tasks. Current status: ${task.status}` });
          return;
        }

        if (task.retryCount >= task.maxRetries) {
          callback({ success: false, error: `Task has exceeded maximum retries (${task.maxRetries})` });
          return;
        }

        await db.task.update({
          where: { id: taskId },
          data: {
            status: "pending",
            previousStatus: task.status,
            retryCount: { increment: 1 },
            errorDetails: Prisma.JsonNull,
            progressPercent: 0,
          },
        });

        // Re-queue the task
        EventBus.emit("task:queued", {
          agentId: task.agentId,
          task: { id: task.id },
        });

        callback({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle message mark read (Action Parity)
    socket.on(WS_EVENTS.MESSAGE_MARK_READ, async (data, callback) => {
      try {
        const { messageIds } = data;

        await db.message.updateMany({
          where: { id: { in: messageIds } },
          data: { readAt: new Date(), status: "read" },
        });

        callback({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  // Heartbeat
  setInterval(() => {
    io.emit(WS_EVENTS.HEARTBEAT, { timestamp: Date.now() });
  }, 30000);

  return io;
}

async function sendInitialState(socket: any) {
  const agents = await db.agent.findMany({
    where: { deletedAt: null },
    include: {
      assignedTasks: {
        where: {
          status: { in: ["pending", "in_progress", "blocked"] },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  const pendingDrafts = await db.message.findMany({
    where: {
      type: "external_draft",
      status: "pending",
    },
  });

  const gameState = await db.gameState.findUnique({
    where: { playerId: "default" },
  });

  // Fetch all active tasks for the UI
  const tasks = await db.task.findMany({
    where: {
      status: { in: ["pending", "in_progress", "blocked"] },
      deletedAt: null,
    },
    include: {
      assignedTo: true,
      createdBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Fetch recent messages for the message center
  const messages = await db.message.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      fromAgent: true,
      toAgent: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Convert Decimal to number for JSON serialization
  const serializedGameState = gameState ? {
    ...gameState,
    budgetRemainingUsd: typeof gameState.budgetRemainingUsd === "string"
      ? parseFloat(gameState.budgetRemainingUsd)
      : Number(gameState.budgetRemainingUsd),
    budgetLimitUsd: typeof gameState.budgetLimitUsd === "string"
      ? parseFloat(gameState.budgetLimitUsd)
      : Number(gameState.budgetLimitUsd),
  } : null;

  socket.emit(WS_EVENTS.INIT, {
    agents,
    pendingDrafts,
    tasks,
    messages,
    gameState: serializedGameState,
    timestamp: Date.now(),
  });
}
