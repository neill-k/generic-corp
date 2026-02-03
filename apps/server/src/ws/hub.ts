import type { Server as SocketIOServer, Socket } from "socket.io";

import type { EventBus } from "../services/event-bus.js";
import type { AppEventMap } from "../services/app-events.js";
import type { Unsubscribe } from "../services/event-bus.js";

export interface WebSocketHub {
  stop(): void;
}

/**
 * Events forwarded to the org-scoped broadcast room.
 * Each event payload must include `orgSlug` (enforced by TenantEventBase).
 */
const BROADCAST_EVENTS = [
  "agent_status_changed",
  "task_status_changed",
  "task_created",
  "message_created",
  "board_item_created",
  "board_item_updated",
  "board_item_archived",
  "agent_updated",
  "agent_deleted",
  "message_updated",
  "message_deleted",
  "thread_deleted",
  "task_updated",
  "org_changed",
  "workspace_updated",
  "tool_permission_created",
  "tool_permission_updated",
  "tool_permission_deleted",
  "mcp_server_created",
  "mcp_server_updated",
  "mcp_server_deleted",
  "mcp_server_status_changed",
] as const satisfies readonly (keyof AppEventMap)[];

export function createWebSocketHub(
  io: SocketIOServer,
  eventBus: EventBus<AppEventMap>,
): WebSocketHub {
  const unsubs: Unsubscribe[] = [];

  io.on("connection", (socket: Socket) => {
    // --- Extract orgSlug from handshake query ---
    const orgSlug = (socket.handshake.query["orgSlug"] as string) || "default";

    // Join the org-scoped broadcast room
    void socket.join(`org:${orgSlug}`);

    socket.emit("snapshot", { type: "snapshot", serverTime: new Date().toISOString() });

    // --- Agent-specific rooms (org-scoped) ---
    socket.on("join_agent", (agentId: string) => {
      void socket.join(`org:${orgSlug}:agent:${agentId}`);
    });

    socket.on("leave_agent", (agentId: string) => {
      void socket.leave(`org:${orgSlug}:agent:${agentId}`);
    });

    // --- Switch org: leave old rooms, join new org room ---
    socket.on("switch_org", (newOrgSlug: string) => {
      // Leave all org-prefixed rooms for the current org
      for (const room of socket.rooms) {
        if (room.startsWith(`org:`)) {
          void socket.leave(room);
        }
      }
      // Join the new org broadcast room
      void socket.join(`org:${newOrgSlug}`);
    });
  });

  // --- Table-driven event forwarding for broadcast events ---
  for (const event of BROADCAST_EVENTS) {
    unsubs.push(
      eventBus.on(event, (payload) => {
        const slug = (payload as { orgSlug: string }).orgSlug;
        io.to(`org:${slug}`).emit(event, payload);
      }),
    );
  }

  // --- agent_event: emit to org-scoped agent rooms ---
  unsubs.push(
    eventBus.on("agent_event", (payload) => {
      const slug = payload.orgSlug;
      io.to(`org:${slug}:agent:${payload.agentId}`).emit("agent_event", payload);
      if ("agentDbId" in payload && typeof payload.agentDbId === "string") {
        io.to(`org:${slug}:agent:${payload.agentDbId}`).emit("agent_event", payload);
      }
    }),
  );

  return {
    stop() {
      for (const unsub of unsubs) unsub();
      unsubs.length = 0;
    },
  };
}
