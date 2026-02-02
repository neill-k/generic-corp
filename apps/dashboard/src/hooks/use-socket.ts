import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";

export function useSocketEvent<T>(event: string, handler: (data: T) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    const callback = (data: T) => handlerRef.current(data);

    socket.on(event, callback);
    return () => {
      socket.off(event, callback);
    };
  }, [event]);
}

/**
 * Hook to set up WebSocket listeners that invalidate TanStack Query caches
 * when server-side mutations occur. Call once near the app root.
 */
export function useSocketQueryInvalidation(): void {
  useEffect(() => {
    const socket = getSocket();

    // Workspace
    const onWorkspaceUpdated = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspace.all });
    };

    // Tool permissions
    const onToolPermissionChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.toolPermissions.all });
    };

    // MCP servers
    const onMcpServerChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    };

    socket.on("workspace_updated", onWorkspaceUpdated);

    socket.on("tool_permission_created", onToolPermissionChanged);
    socket.on("tool_permission_updated", onToolPermissionChanged);
    socket.on("tool_permission_deleted", onToolPermissionChanged);

    socket.on("mcp_server_created", onMcpServerChanged);
    socket.on("mcp_server_updated", onMcpServerChanged);
    socket.on("mcp_server_deleted", onMcpServerChanged);
    socket.on("mcp_server_status_changed", onMcpServerChanged);

    // Agents
    const onAgentChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
    };

    socket.on("agent_updated", onAgentChanged);
    socket.on("agent_deleted", onAgentChanged);

    // Board items
    const onBoardItemChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boardItems.all });
    };

    socket.on("board_item_created", onBoardItemChanged);
    socket.on("board_item_updated", onBoardItemChanged);
    socket.on("board_item_archived", onBoardItemChanged);

    // Tasks
    const onTaskChanged = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    };

    socket.on("task_created", onTaskChanged);
    socket.on("task_updated", onTaskChanged);
    socket.on("task_status_changed", onTaskChanged);

    return () => {
      socket.off("workspace_updated", onWorkspaceUpdated);

      socket.off("tool_permission_created", onToolPermissionChanged);
      socket.off("tool_permission_updated", onToolPermissionChanged);
      socket.off("tool_permission_deleted", onToolPermissionChanged);

      socket.off("mcp_server_created", onMcpServerChanged);
      socket.off("mcp_server_updated", onMcpServerChanged);
      socket.off("mcp_server_deleted", onMcpServerChanged);
      socket.off("mcp_server_status_changed", onMcpServerChanged);

      socket.off("agent_updated", onAgentChanged);
      socket.off("agent_deleted", onAgentChanged);

      socket.off("board_item_created", onBoardItemChanged);
      socket.off("board_item_updated", onBoardItemChanged);
      socket.off("board_item_archived", onBoardItemChanged);

      socket.off("task_created", onTaskChanged);
      socket.off("task_updated", onTaskChanged);
      socket.off("task_status_changed", onTaskChanged);
    };
  }, []);
}
