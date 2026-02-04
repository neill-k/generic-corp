import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Wrench,
  Radio,
  Timer,
  TriangleAlert,
  Server,
  X,
  Pencil,
  Activity,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import { api } from "../lib/api-client.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";

interface McpServer {
  id: string;
  name: string;
  protocol: string;
  uri: string;
  status: string;
  toolCount?: number;
  lastPing?: string;
  iconColor?: string;
  error?: string;
}

interface PingResult {
  status: string;
  latencyMs?: number;
  error?: string;
}

const PROTOCOL_COLORS: Record<string, string> = {
  stdio: "#24292E",
  sse: "#0052CC",
  http: "#4A154B",
};

function getServerIconColor(server: McpServer): string {
  return server.iconColor ?? PROTOCOL_COLORS[server.protocol] ?? "#78909C";
}

function formatLastPing(lastPing?: string): string {
  if (!lastPing) return "Never";
  const diff = Date.now() - new Date(lastPing).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `Last ping ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Last ping ${minutes}m ago`;
  return `Last ping ${Math.floor(minutes / 60)}h ago`;
}

export function SettingsMcpServersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServerId, setEditingServerId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", protocol: "stdio", uri: "" });
  const [pingResults, setPingResults] = useState<Record<string, PingResult>>({});
  const [newServer, setNewServer] = useState({
    name: "",
    protocol: "stdio",
    uri: "",
  });

  const { data: servers, isLoading } = useQuery({
    queryKey: queryKeys.mcpServers.list(),
    queryFn: () =>
      api
        .get<{ servers: McpServer[] }>("/mcp-servers")
        .then((res) => res.servers),
  });

  const addMutation = useMutation({
    mutationFn: (data: { name: string; protocol: string; uri: string }) =>
      api.post<McpServer>("/mcp-servers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      setShowAddForm(false);
      setNewServer({ name: "", protocol: "stdio", uri: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/mcp-servers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; protocol: string; uri: string } }) =>
      api.patch<McpServer>(`/mcp-servers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
      setEditingServerId(null);
    },
  });

  const pingMutation = useMutation({
    mutationFn: (id: string) =>
      api.post<PingResult>(`/mcp-servers/${id}/ping`, {}),
    onSuccess: (result, id) => {
      setPingResults((prev) => ({ ...prev, [id]: result }));
      queryClient.invalidateQueries({ queryKey: queryKeys.mcpServers.all });
    },
    onError: (error, id) => {
      setPingResults((prev) => ({
        ...prev,
        [id]: {
          status: "error",
          error: error instanceof Error ? error.message : "Ping failed",
        },
      }));
    },
  });

  const connectedCount =
    servers?.filter((s) => s.status === "connected").length ?? 0;
  const totalTools =
    servers?.reduce((sum, s) => sum + (s.toolCount ?? 0), 0) ?? 0;

  const handleAddServer = () => {
    if (newServer.name && newServer.uri) {
      addMutation.mutate(newServer);
    }
  };

  const startEditing = (server: McpServer) => {
    setEditingServerId(server.id);
    setEditForm({
      name: server.name,
      protocol: server.protocol,
      uri: server.uri,
    });
  };

  const handleSaveEdit = (serverId: string) => {
    if (editForm.name && editForm.uri) {
      updateMutation.mutate({ id: serverId, data: editForm });
    }
  };

  const handlePing = (serverId: string) => {
    // Clear previous result
    setPingResults((prev) => {
      const next = { ...prev };
      delete next[serverId];
      return next;
    });
    pingMutation.mutate(serverId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[13px] text-[var(--gray-500)]">Loading...</span>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            MCP Servers
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Connect external tool servers to extend agent capabilities.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white"
        >
          <Plus size={14} />
          Add Server
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Add Server Form */}
      {showAddForm && (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--border-light)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[var(--black-primary)]">
              Add New Server
            </span>
            <button onClick={() => setShowAddForm(false)}>
              <X size={16} className="text-[var(--gray-500)]" />
            </button>
          </div>
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Name
              </label>
              <input
                type="text"
                value={newServer.name}
                onChange={(e) =>
                  setNewServer({ ...newServer, name: e.target.value })
                }
                placeholder="e.g., GitHub"
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              />
            </div>
            <div className="flex w-32 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Protocol
              </label>
              <select
                value={newServer.protocol}
                onChange={(e) =>
                  setNewServer({ ...newServer, protocol: e.target.value })
                }
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              >
                <option value="stdio">stdio</option>
                <option value="sse">sse</option>
                <option value="http">http</option>
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                URI
              </label>
              <input
                type="text"
                value={newServer.uri}
                onChange={(e) =>
                  setNewServer({ ...newServer, uri: e.target.value })
                }
                placeholder="e.g., stdio://github-mcp-server"
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddServer}
              disabled={addMutation.isPending || !newServer.name || !newServer.uri}
              className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
            >
              {addMutation.isPending ? "Adding..." : "Add Server"}
            </button>
          </div>
          {addMutation.isError && (
            <span className="text-[11px] text-[#C62828]">
              Failed to add server:{" "}
              {addMutation.error instanceof Error
                ? addMutation.error.message
                : "Unknown error"}
            </span>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex w-full gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            {servers?.length ?? 0}
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Total Servers
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[#2E7D32]">
            {connectedCount}
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">Connected</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            {totalTools}
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Total Tools
          </span>
        </div>
      </div>

      {/* Server Cards */}
      {servers && servers.length > 0 ? (
        <div className="flex flex-col gap-4">
          {servers.map((server) => {
            const isConnected = server.status === "connected";
            const iconColor = getServerIconColor(server);
            const isEditing = editingServerId === server.id;
            const pingResult = pingResults[server.id];
            const isPinging = pingMutation.isPending && pingMutation.variables === server.id;

            return (
              <div
                key={server.id}
                className={`flex flex-col gap-4 rounded-lg border p-5 ${
                  isConnected
                    ? "border-[var(--border-light)]"
                    : "border-[#FFCDD2] bg-[#FFFBFB]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: iconColor }}
                    >
                      <Server size={22} className="text-white" />
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          className="rounded-md border border-[var(--border-light)] px-2 py-1 text-[13px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
                          placeholder="Name"
                        />
                        <select
                          value={editForm.protocol}
                          onChange={(e) =>
                            setEditForm({ ...editForm, protocol: e.target.value })
                          }
                          className="rounded-md border border-[var(--border-light)] px-2 py-1 text-[12px] text-[var(--black-primary)] outline-none"
                        >
                          <option value="stdio">stdio</option>
                          <option value="sse">sse</option>
                          <option value="http">http</option>
                        </select>
                        <input
                          type="text"
                          value={editForm.uri}
                          onChange={(e) =>
                            setEditForm({ ...editForm, uri: e.target.value })
                          }
                          className="rounded-md border border-[var(--border-light)] px-2 py-1 text-[12px] font-mono text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
                          placeholder="URI"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[14px] font-semibold text-[var(--black-primary)]">
                          {server.name}
                        </span>
                        <span className="font-mono text-[11px] text-[var(--gray-500)]">
                          {server.uri}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-[10px] px-2.5 py-1 text-[11px] font-medium ${
                        isConnected
                          ? "bg-[#E8F5E9] text-[#2E7D32]"
                          : "bg-[#FFEBEE] text-[#C62828]"
                      }`}
                    >
                      {isConnected ? "Connected" : "Disconnected"}
                    </span>

                    {/* Action buttons */}
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(server.id)}
                          disabled={updateMutation.isPending}
                          className="flex items-center gap-1 rounded-md bg-[#2E7D32] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#256b29] disabled:opacity-50"
                          title="Save changes"
                        >
                          <Check size={12} />
                          Save
                        </button>
                        <button
                          onClick={() => setEditingServerId(null)}
                          className="rounded-md border border-[var(--border-light)] px-2.5 py-1.5 text-[11px] text-[var(--gray-600)] transition-colors hover:bg-[#F5F5F5]"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(server)}
                          className="flex items-center gap-1 rounded-md border border-[var(--border-light)] px-2.5 py-1.5 text-[11px] text-[var(--gray-600)] transition-colors hover:bg-[#F5F5F5]"
                          title="Edit server"
                        >
                          <Pencil size={11} />
                          Edit
                        </button>
                        <button
                          onClick={() => handlePing(server.id)}
                          disabled={isPinging}
                          className="flex items-center gap-1 rounded-md border border-[var(--border-light)] px-2.5 py-1.5 text-[11px] text-[var(--gray-600)] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                          title="Ping server"
                        >
                          {isPinging ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Activity size={11} />
                          )}
                          Ping
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete server "${server.name}"?`)) {
                              deleteMutation.mutate(server.id);
                            }
                          }}
                          className="flex items-center gap-1 rounded-md border border-[#FFCDD2] px-2.5 py-1.5 text-[11px] text-[#C62828] transition-colors hover:bg-[#FFEBEE]"
                          title="Delete server"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Ping result banner */}
                {pingResult && (
                  <div
                    className={`flex items-center gap-2 rounded-md px-3.5 py-2.5 ${
                      pingResult.status === "error"
                        ? "bg-[#FFEBEE]"
                        : "bg-[#E8F5E9]"
                    }`}
                  >
                    <Activity
                      size={14}
                      className={
                        pingResult.status === "error"
                          ? "shrink-0 text-[#C62828]"
                          : "shrink-0 text-[#2E7D32]"
                      }
                    />
                    <span
                      className={`text-[11px] ${
                        pingResult.status === "error"
                          ? "text-[#C62828]"
                          : "text-[#2E7D32]"
                      }`}
                    >
                      {pingResult.status === "error"
                        ? `Ping failed: ${pingResult.error}`
                        : `Ping OK${pingResult.latencyMs !== undefined ? ` (${pingResult.latencyMs}ms)` : ""}`}
                    </span>
                  </div>
                )}

                {/* Error banner for disconnected servers */}
                {!isConnected && server.error && (
                  <div className="flex items-center gap-2 rounded-md bg-[#FFF3E0] px-3.5 py-2.5">
                    <TriangleAlert
                      size={14}
                      className="shrink-0 text-[#E65100]"
                    />
                    <span className="text-[11px] text-[#E65100]">
                      {server.error}
                    </span>
                  </div>
                )}

                {/* Update error */}
                {updateMutation.isError && editingServerId === server.id && (
                  <span className="text-[11px] text-[#C62828]">
                    Failed to update:{" "}
                    {updateMutation.error instanceof Error
                      ? updateMutation.error.message
                      : "Unknown error"}
                  </span>
                )}

                <div className="flex items-center gap-6">
                  {server.toolCount !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <Wrench size={13} className="text-[var(--gray-500)]" />
                      <span className="text-[12px] text-[var(--gray-600)]">
                        {server.toolCount} tools
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Radio size={13} className="text-[var(--gray-500)]" />
                    <span className="text-[12px] text-[var(--gray-600)]">
                      {server.protocol}
                    </span>
                  </div>
                  {server.lastPing && (
                    <div className="flex items-center gap-1.5">
                      <Timer size={13} className="text-[var(--gray-500)]" />
                      <span className="text-[12px] text-[var(--gray-600)]">
                        {formatLastPing(server.lastPing)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-light)] py-12">
          <Server size={24} className="mb-2 text-[var(--gray-500)]" />
          <span className="text-[13px] text-[var(--gray-500)]">
            No MCP servers configured yet.
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Add a server to extend agent capabilities.
          </span>
        </div>
      )}
    </>
  );
}
