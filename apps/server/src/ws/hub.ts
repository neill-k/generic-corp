import type { Server as SocketIOServer, Socket } from "socket.io";

import type { EventBus } from "../services/event-bus.js";
import type { AppEventMap } from "../services/app-events.js";
import type { Unsubscribe } from "../services/event-bus.js";

export interface WebSocketHub {
  stop(): void;
}

export function createWebSocketHub(
  io: SocketIOServer,
  eventBus: EventBus<AppEventMap>,
): WebSocketHub {
  const unsubs: Unsubscribe[] = [];

  io.on("connection", (socket: Socket) => {
    void socket.join("broadcast");
    socket.emit("snapshot", { type: "snapshot", serverTime: new Date().toISOString() });

    socket.on("join_agent", (agentId: string) => {
      void socket.join(`agent:${agentId}`);
    });

    socket.on("leave_agent", (agentId: string) => {
      void socket.leave(`agent:${agentId}`);
    });
  });

  unsubs.push(
    eventBus.on("agent_event", (payload) => {
      io.to(`agent:${payload.agentId}`).emit("agent_event", payload);
    }),
  );

  unsubs.push(
    eventBus.on("agent_status_changed", (payload) => {
      io.to(`agent:${payload.agentId}`).emit("agent_status_changed", payload);
      io.to("broadcast").emit("agent_status_changed", payload);
    }),
  );

  unsubs.push(
    eventBus.on("task_status_changed", (payload) => {
      io.to("broadcast").emit("task_status_changed", payload);
    }),
  );

  unsubs.push(
    eventBus.on("task_created", (payload) => {
      io.to("broadcast").emit("task_created", payload);
    }),
  );

  unsubs.push(
    eventBus.on("message_created", (payload) => {
      io.to("broadcast").emit("message_created", payload);
    }),
  );

  unsubs.push(
    eventBus.on("board_item_created", (payload) => {
      io.to("broadcast").emit("board_item_created", payload);
    }),
  );

  unsubs.push(
    eventBus.on("board_item_updated", (payload) => {
      io.to("broadcast").emit("board_item_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("board_item_archived", (payload) => {
      io.to("broadcast").emit("board_item_archived", payload);
    }),
  );

  unsubs.push(
    eventBus.on("agent_updated", (payload) => {
      io.to("broadcast").emit("agent_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("agent_deleted", (payload) => {
      io.to("broadcast").emit("agent_deleted", payload);
    }),
  );

  unsubs.push(
    eventBus.on("message_updated", (payload) => {
      io.to("broadcast").emit("message_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("message_deleted", (payload) => {
      io.to("broadcast").emit("message_deleted", payload);
    }),
  );

  unsubs.push(
    eventBus.on("thread_deleted", (payload) => {
      io.to("broadcast").emit("thread_deleted", payload);
    }),
  );

  unsubs.push(
    eventBus.on("task_updated", (payload) => {
      io.to("broadcast").emit("task_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("org_changed", () => {
      io.to("broadcast").emit("org_changed", {});
    }),
  );

  unsubs.push(
    eventBus.on("workspace_updated", (payload) => {
      io.to("broadcast").emit("workspace_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("tool_permission_created", (payload) => {
      io.to("broadcast").emit("tool_permission_created", payload);
    }),
  );

  unsubs.push(
    eventBus.on("tool_permission_updated", (payload) => {
      io.to("broadcast").emit("tool_permission_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("tool_permission_deleted", (payload) => {
      io.to("broadcast").emit("tool_permission_deleted", payload);
    }),
  );

  unsubs.push(
    eventBus.on("mcp_server_created", (payload) => {
      io.to("broadcast").emit("mcp_server_created", payload);
    }),
  );

  unsubs.push(
    eventBus.on("mcp_server_updated", (payload) => {
      io.to("broadcast").emit("mcp_server_updated", payload);
    }),
  );

  unsubs.push(
    eventBus.on("mcp_server_deleted", (payload) => {
      io.to("broadcast").emit("mcp_server_deleted", payload);
    }),
  );

  unsubs.push(
    eventBus.on("mcp_server_status_changed", (payload) => {
      io.to("broadcast").emit("mcp_server_status_changed", payload);
    }),
  );

  return {
    stop() {
      for (const unsub of unsubs) unsub();
      unsubs.length = 0;
    },
  };
}
