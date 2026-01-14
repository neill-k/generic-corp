import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import { db } from "../db/index.js";
import { EventBus } from "../services/event-bus.js";
import { WS_EVENTS } from "@generic-corp/shared";

export function setupWebSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
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

  // ================== CLIENT -> SERVER COMMANDS ==================

  io.on("connection", async (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

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

        await db.message.update({
          where: { id: draftId },
          data: {
            status: "approved",
            approvedBy: "player",
            approvedAt: new Date(),
          },
        });

        // TODO: Actually send the email when email service is implemented

        callback({ success: true });
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

  socket.emit(WS_EVENTS.INIT, {
    agents,
    pendingDrafts,
    gameState,
    timestamp: Date.now(),
  });
}
