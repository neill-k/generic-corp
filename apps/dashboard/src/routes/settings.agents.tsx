import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { api } from "../lib/api-client.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";

interface Agent {
  id: string;
  name: string;
  displayName: string;
  role: string;
  department?: string;
  level?: string;
  status: string;
  avatarColor?: string;
  costMtd?: number;
}

interface AgentsResponse {
  agents: Agent[];
}

const LEVEL_OPTIONS = [
  { value: "ic", label: "Individual Contributor" },
  { value: "lead", label: "Lead" },
  { value: "manager", label: "Manager" },
  { value: "vp", label: "VP" },
  { value: "c-suite", label: "C-Suite" },
];

const INITIAL_FORM = {
  name: "",
  displayName: "",
  role: "",
  department: "",
  level: "ic",
  personality: "",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(name: string): string {
  const colors = [
    "#000000",
    "#5C6BC0",
    "#26A69A",
    "#EF5350",
    "#FF9800",
    "#78909C",
    "#7E57C2",
    "#42A5F5",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] ?? "#78909C";
}

export function SettingsAgentsPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAgent, setNewAgent] = useState(INITIAL_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: () => api.get<AgentsResponse>("/agents"),
  });

  const agents = data?.agents ?? [];

  const createMutation = useMutation({
    mutationFn: (body: typeof INITIAL_FORM) =>
      api.post<{ agent: Agent }>("/agents", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      setShowAddForm(false);
      setNewAgent(INITIAL_FORM);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete<{ deleted: boolean }>(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      setConfirmDeleteId(null);
    },
  });

  const onlineCount =
    agents.filter((a) => a.status === "active" || a.status === "idle").length;
  const totalCost = agents.reduce((sum, a) => sum + (a.costMtd ?? 0), 0);

  const handleCreate = () => {
    if (newAgent.name && newAgent.displayName && newAgent.role && newAgent.department) {
      createMutation.mutate(newAgent);
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
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
            Agents
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Manage agent configurations, roles, and permissions.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white"
        >
          <Plus size={14} />
          Add Agent
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Add Agent Form */}
      {showAddForm && (
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--border-light)] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[var(--black-primary)]">
              Add New Agent
            </span>
            <button onClick={() => setShowAddForm(false)}>
              <X size={16} className="text-[var(--gray-500)]" />
            </button>
          </div>

          {/* Row 1: Name + Display Name */}
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Name (slug)
              </label>
              <input
                type="text"
                value={newAgent.name}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, name: e.target.value })
                }
                placeholder="e.g., alex-frontend"
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              />
              <span className="text-[10px] text-[var(--gray-500)]">
                Lowercase letters, numbers, and hyphens only
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Display Name
              </label>
              <input
                type="text"
                value={newAgent.displayName}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, displayName: e.target.value })
                }
                placeholder="e.g., Alex Frontend"
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              />
            </div>
          </div>

          {/* Row 2: Role + Department + Level */}
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Role
              </label>
              <input
                type="text"
                value={newAgent.role}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, role: e.target.value })
                }
                placeholder="e.g., Frontend Engineer"
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Department
              </label>
              <input
                type="text"
                value={newAgent.department}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, department: e.target.value })
                }
                placeholder="e.g., Engineering"
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              />
            </div>
            <div className="flex w-48 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[var(--gray-600)]">
                Level
              </label>
              <select
                value={newAgent.level}
                onChange={(e) =>
                  setNewAgent({ ...newAgent, level: e.target.value })
                }
                className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Personality */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Personality (optional)
            </label>
            <textarea
              value={newAgent.personality}
              onChange={(e) =>
                setNewAgent({ ...newAgent, personality: e.target.value })
              }
              rows={3}
              placeholder="Describe the agent's personality and communication style..."
              className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] leading-5 outline-none focus:border-[var(--gray-500)] resize-y"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={
                createMutation.isPending ||
                !newAgent.name ||
                !newAgent.displayName ||
                !newAgent.role ||
                !newAgent.department
              }
              className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Agent"}
            </button>
          </div>
          {createMutation.isError && (
            <span className="text-[11px] text-[#C62828]">
              Failed to create agent:{" "}
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Unknown error"}
            </span>
          )}
        </div>
      )}

      {/* Stats Row */}
      <div className="flex w-full gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            {agents.length}
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Total Agents
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[#2E7D32]">
            {onlineCount}
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">Online</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            ${totalCost.toFixed(2)}
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">MTD Spend</span>
        </div>
      </div>

      {/* Agent List */}
      {agents.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
          {agents.map((agent, index) => {
            const isLast = index === agents.length - 1;
            const isOnline =
              agent.status === "active" || agent.status === "idle";
            const initials = getInitials(agent.displayName || agent.name);
            const avatarColor = agent.avatarColor ?? getAvatarColor(agent.name);
            const isConfirmingDelete = confirmDeleteId === agent.id;
            return (
              <div
                key={agent.id}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  !isLast ? "border-b border-[var(--border-light)]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: avatarColor }}
                  >
                    <span className="text-[12px] font-semibold text-white">
                      {initials}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-[var(--black-primary)]">
                      {agent.displayName || agent.name}
                    </span>
                    <span className="text-[11px] text-[var(--gray-500)]">
                      {agent.role}
                      {agent.department ? ` - ${agent.department}` : ""}
                      {agent.level ? ` (${agent.level})` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`rounded-[10px] px-2 py-[3px] text-[10px] font-medium ${
                      isOnline
                        ? "bg-[#E8F5E9] text-[#2E7D32]"
                        : "bg-[var(--bg-surface)] text-[var(--gray-500)]"
                    }`}
                  >
                    {isOnline ? "Online" : "Offline"}
                  </span>
                  {agent.costMtd !== undefined && (
                    <span className="font-mono text-[11px] text-[var(--gray-500)]">
                      ${agent.costMtd.toFixed(2)}
                    </span>
                  )}
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(agent.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-md bg-[#C62828] px-2.5 py-1 text-[10px] font-medium text-white disabled:opacity-50"
                      >
                        {deleteMutation.isPending ? "Deleting..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-md bg-[var(--bg-surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--gray-600)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(agent.id)}
                      title="Delete agent"
                      className="rounded p-1 text-[var(--gray-500)] hover:bg-[var(--bg-surface)] hover:text-[#C62828] transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-light)] py-12">
          <span className="text-[13px] text-[var(--gray-500)]">
            No agents configured yet.
          </span>
        </div>
      )}

      {/* Delete Error */}
      {deleteMutation.isError && (
        <span className="text-[11px] text-[#C62828]">
          Failed to delete agent:{" "}
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "Unknown error"}
        </span>
      )}
    </>
  );
}
