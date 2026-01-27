import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { WS_EVENTS } from "@generic-corp/shared";
import {
  ConnectionTracker,
  wsEventsReceived,
  wsEventErrors,
  recordEventDelivery,
  wsInitialStateLatency,
} from "../services/metrics.js";
import { getRedisPubClient, getRedisSubClient } from "../services/redis-client.js";

export function setupWebSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Configure Redis adapter for horizontal scaling
  const pubClient = getRedisPubClient();
  const subClient = getRedisSubClient();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[WebSocket] Redis adapter configured for horizontal scaling");

  // ================== SERVER -> CLIENT EVENTS ==================

  EventBus.on("agent:status", (data: any) => {
    io.emit(WS_EVENTS.AGENT_STATUS, data);
    if (data._emitTimestamp) {
      recordEventDelivery("agent:status", data._emitTimestamp);
    }
  });

  EventBus.on("task:progress", (data: any) => {
    io.emit(WS_EVENTS.TASK_PROGRESS, data);
    if (data._emitTimestamp) {
      recordEventDelivery("task:progress", data._emitTimestamp);
    }
  });

  EventBus.on("task:completed", (data: any) => {
    io.emit(WS_EVENTS.TASK_COMPLETED, data);
    if (data._emitTimestamp) {
      recordEventDelivery("task:completed", data._emitTimestamp);
    }
  });

  EventBus.on("task:failed", (data: any) => {
    io.emit(WS_EVENTS.TASK_FAILED, data);
    if (data._emitTimestamp) {
      recordEventDelivery("task:failed", data._emitTimestamp);
    }
  });

  EventBus.on("message:new", (data: any) => {
    io.emit(WS_EVENTS.MESSAGE_NEW, data);
    if (data._emitTimestamp) {
      recordEventDelivery("message:new", data._emitTimestamp);
    }
  });

  EventBus.on("draft:pending", (data: any) => {
    io.emit(WS_EVENTS.DRAFT_PENDING, data);
    if (data._emitTimestamp) {
      recordEventDelivery("draft:pending", data._emitTimestamp);
    }
  });

  EventBus.on("activity:log", (data: any) => {
    io.emit(WS_EVENTS.ACTIVITY_LOG, data);
    if (data._emitTimestamp) {
      recordEventDelivery("activity:log", data._emitTimestamp);
    }
  });

  // Claude Code events broadcasting
  const setupClaudeEventsBroadcast = async () => {
    try {
      const { claudeEventsService } = await import("../services/claudeEvents.js");
      claudeEventsService.on("event", (event) => {
        io.emit("claude:event", event);
      });
      console.log("[WebSocket] Claude events broadcasting enabled");
    } catch (error) {
      console.error("[WebSocket] Failed to setup Claude events:", error);
    }
  };
  setupClaudeEventsBroadcast();

  // ================== CLIENT -> SERVER COMMANDS ==================

  io.on("connection", async (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Track connection lifecycle
    const connectionTracker = new ConnectionTracker();

    // Send initial state
    await sendInitialState(socket);

    // Handle task assignment
    socket.on(WS_EVENTS.TASK_ASSIGN, async (data, callback) => {
      wsEventsReceived.inc({ event_type: "task_assign" });
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
        wsEventErrors.inc({ event_type: "task_assign" });
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle draft approval
    socket.on(WS_EVENTS.DRAFT_APPROVE, async (data, callback) => {
      wsEventsReceived.inc({ event_type: "draft_approve" });
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
        wsEventErrors.inc({ event_type: "draft_approve" });
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle draft rejection
    socket.on(WS_EVENTS.DRAFT_REJECT, async (data, callback) => {
      wsEventsReceived.inc({ event_type: "draft_reject" });
      try {
        const { draftId, reason } = data;

        await db.message.update({
          where: { id: draftId },
          data: { status: "rejected" },
        });

        EventBus.emit("draft:rejected", { draftId, reason });

        callback({ success: true });
      } catch (error) {
        wsEventErrors.inc({ event_type: "draft_reject" });
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle message send from player
    socket.on(WS_EVENTS.MESSAGE_SEND, async (data, callback) => {
      wsEventsReceived.inc({ event_type: "message_send" });
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
        wsEventErrors.inc({ event_type: "message_send" });
        const message = error instanceof Error ? error.message : "Unknown error";
        callback({ success: false, error: message });
      }
    });

    // Handle game state sync
    socket.on(WS_EVENTS.STATE_SYNC, async (data) => {
      wsEventsReceived.inc({ event_type: "state_sync" });
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

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      connectionTracker.disconnect();
    });
  });

  // Heartbeat
  setInterval(() => {
    io.emit(WS_EVENTS.HEARTBEAT, { timestamp: Date.now() });
  }, 30000);

  return io;
}

async function sendInitialState(socket: any) {
  const startTime = Date.now();

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

  // Fetch recent Claude Code events
  let claudeEvents: any[] = [];
  try {
    const { claudeEventsService } = await import("../services/claudeEvents.js");
    claudeEvents = await claudeEventsService.getRecentEvents(100);
  } catch (error) {
    console.error("[WebSocket] Failed to fetch Claude events for initial state:", error);
  }

  socket.emit(WS_EVENTS.INIT, {
    agents,
    pendingDrafts,
    tasks,
    messages,
    gameState: serializedGameState,
    timestamp: Date.now(),
  });

  // Send Claude events history separately
  if (claudeEvents.length > 0) {
    socket.emit("claude:events:history", claudeEvents);
  }

  // Record initial state latency
  const latency = Date.now() - startTime;
  wsInitialStateLatency.observe(latency);
}
