import { io, Socket } from "socket.io-client";
import { useOrgStore } from "../store/org-store";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const orgSlug = useOrgStore.getState().currentOrg?.slug;
    socket = io({
      transports: ["websocket", "polling"],
      query: orgSlug ? { orgSlug } : {},
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Disconnect and reconnect with the new org slug in the handshake query.
 * Call this when the user switches organizations.
 */
export function reconnectWithOrg(orgSlug: string): void {
  disconnectSocket();
  socket = io({
    transports: ["websocket", "polling"],
    query: { orgSlug },
  });
}
