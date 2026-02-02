import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Users, MessageSquare, Lightbulb } from "lucide-react";

import { OrgChart } from "../components/org/OrgChart.js";
import { api } from "../lib/api-client.js";
import { queryKeys } from "../lib/query-keys.js";
import type { ApiAgentSummary, ApiOrgNode } from "@generic-corp/shared";

interface OrgResponse {
  org: ApiOrgNode[];
}

function flattenNodes(nodes: ApiOrgNode[]): ApiOrgNode[] {
  const result: ApiOrgNode[] = [];
  function walk(node: ApiOrgNode) {
    result.push(node);
    node.children.forEach(walk);
  }
  nodes.forEach(walk);
  return result;
}

export function OrgPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedParentNodeId, setSelectedParentNodeId] = useState("");
  const queryClient = useQueryClient();

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: () =>
      api.get<{ agents: ApiAgentSummary[] }>("/agents"),
    staleTime: 60_000,
  });

  const orgQuery = useQuery({
    queryKey: ["org"],
    queryFn: () => api.get<OrgResponse>("/org"),
  });

  const allOrgNodes = orgQuery.data?.org ? flattenNodes(orgQuery.data.org) : [];

  // Agents not yet in the org chart
  const agentsInOrg = new Set(allOrgNodes.map((n) => n.agent.id));
  const availableAgents = agentsQuery.data?.agents.filter(
    (a) => !agentsInOrg.has(a.id),
  ) ?? [];

  const addNodeMutation = useMutation({
    mutationFn: (data: { agentId: string; parentNodeId?: string }) =>
      api.post<unknown>("/org/nodes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
      setShowAddForm(false);
      setSelectedAgentId("");
      setSelectedParentNodeId("");
    },
  });

  const deleteNodeMutation = useMutation({
    mutationFn: (nodeId: string) =>
      api.delete<unknown>(`/org/nodes/${nodeId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    },
  });

  const moveNodeMutation = useMutation({
    mutationFn: ({ nodeId, parentNodeId }: { nodeId: string; parentNodeId: string | null }) =>
      api.patch<unknown>(`/org/nodes/${nodeId}`, { parentNodeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    },
  });

  const handleAddToOrg = () => {
    if (!selectedAgentId) return;
    addNodeMutation.mutate({
      agentId: selectedAgentId,
      parentNodeId: selectedParentNodeId || undefined,
    });
  };

  const isEmpty = orgQuery.isSuccess && allOrgNodes.length === 0;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-5 w-1 rounded-sm bg-[#E53935]" />
            <h2 className="text-xl font-semibold text-black">Org Chart</h2>
          </div>
          <p className="mt-1 pl-[16px] text-[13px] text-[#999]">
            Agent hierarchy and reporting structure
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#222]"
        >
          <Plus size={14} />
          Add Agent to Org
        </button>
      </div>

      {/* Add to Org Form */}
      {showAddForm && (
        <div className="mx-8 flex flex-col gap-4 rounded-lg border border-[#EEE] bg-white p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-black">
              Add Agent to Org Chart
            </span>
            <button onClick={() => setShowAddForm(false)}>
              <X size={16} className="text-[#999]" />
            </button>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#666]">
                Agent
              </label>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="rounded-md border border-[#EEE] px-3 py-2 text-xs text-black outline-none focus:border-[#999]"
              >
                <option value="">Select an agent...</option>
                {availableAgents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.displayName} ({a.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-[11px] font-medium text-[#666]">
                Reports To (Parent Node)
              </label>
              <select
                value={selectedParentNodeId}
                onChange={(e) => setSelectedParentNodeId(e.target.value)}
                className="rounded-md border border-[#EEE] px-3 py-2 text-xs text-black outline-none focus:border-[#999]"
              >
                <option value="">None (Top Level)</option>
                {allOrgNodes.map((n) => (
                  <option key={n.agent.id} value={n.agent.id}>
                    {n.agent.displayName} ({n.agent.role})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddToOrg}
              disabled={!selectedAgentId || addNodeMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {addNodeMutation.isPending ? "Adding..." : "Add"}
            </button>
          </div>
          {addNodeMutation.isError && (
            <span className="text-[11px] text-red-500">
              Failed:{" "}
              {addNodeMutation.error instanceof Error
                ? addNodeMutation.error.message
                : "Unknown error"}
            </span>
          )}
        </div>
      )}

      {/* Org Node Management List */}
      {allOrgNodes.length > 0 && (
        <div className="mx-8 rounded-lg border border-[#EEE] bg-white">
          <div className="border-b border-[#EEE] px-4 py-2.5">
            <span className="text-xs font-semibold text-[#999]">
              Org Members ({allOrgNodes.length})
            </span>
          </div>
          <div className="divide-y divide-[#EEE]">
            {allOrgNodes.map((node) => (
              <OrgNodeRow
                key={node.agent.id}
                node={node}
                allNodes={allOrgNodes}
                onDelete={(nodeId) => {
                  if (window.confirm(`Remove "${node.agent.displayName}" from the org chart?`)) {
                    deleteNodeMutation.mutate(nodeId);
                  }
                }}
                onMove={(nodeId, parentNodeId) => {
                  moveNodeMutation.mutate({ nodeId, parentNodeId });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state with capability hints */}
      {isEmpty && (
        <div className="mx-8 flex flex-1 flex-col items-center justify-center gap-4 rounded-lg border border-[#EEE] bg-white py-16">
          <Users size={32} className="text-[#DDD]" />
          <div className="text-center">
            <p className="text-sm font-medium text-[#666]">No agents in the org chart</p>
            <p className="mt-1 max-w-sm text-xs text-[#999]">
              Add agents to the org chart to define the corporate hierarchy.
              Agents delegate work up and down through this structure.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <div className="flex items-center gap-1.5 rounded-full border border-[#EEE] bg-white px-3 py-1.5 text-xs text-[#666]">
              <Users size={12} />
              <span>Define reporting structure</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#EEE] bg-white px-3 py-1.5 text-xs text-[#666]">
              <MessageSquare size={12} />
              <span>Agents communicate through the hierarchy</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#EEE] bg-white px-3 py-1.5 text-xs text-[#666]">
              <Lightbulb size={12} />
              <span>Work delegation follows org structure</span>
            </div>
          </div>
        </div>
      )}

      {/* Org Chart Visualization */}
      {!isEmpty && <OrgChart />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Org Node Row                                                        */
/* ------------------------------------------------------------------ */

interface OrgNodeRowProps {
  node: ApiOrgNode;
  allNodes: ApiOrgNode[];
  onDelete: (nodeId: string) => void;
  onMove: (nodeId: string, parentNodeId: string | null) => void;
}

function OrgNodeRow({ node, allNodes, onDelete, onMove }: OrgNodeRowProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const STATUS_COLORS: Record<string, string> = {
    idle: "bg-green-500",
    running: "bg-yellow-500",
    error: "bg-red-500",
    offline: "bg-[#999]",
  };

  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-2 w-2 rounded-full ${STATUS_COLORS[node.agent.status] ?? "bg-[#999]"}`}
        />
        <div>
          <span className="text-xs font-medium text-black">
            {node.agent.displayName}
          </span>
          <span className="ml-2 text-[10px] text-[#999]">
            {node.agent.role} / {node.agent.department}
          </span>
        </div>
        {node.parentAgentId && (
          <span className="text-[10px] text-[#CCC]">
            reports to {allNodes.find((n) => n.agent.id === node.parentAgentId)?.agent.displayName ?? "..."}
          </span>
        )}
      </div>
      <div className="relative flex items-center gap-1">
        <button
          onClick={() => setShowMoveMenu(!showMoveMenu)}
          className="rounded px-2 py-1 text-[10px] text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#666]"
        >
          Move
        </button>
        <button
          onClick={() => onDelete(node.agent.id)}
          className="rounded px-2 py-1 text-[10px] text-[#E53935] transition-colors hover:bg-[#FFF5F5] hover:text-[#C62828]"
        >
          Remove
        </button>

        {showMoveMenu && (
          <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-[#EEE] bg-white py-1 shadow-lg">
            <button
              onClick={() => {
                onMove(node.agent.id, null);
                setShowMoveMenu(false);
              }}
              className="block w-full px-3 py-1.5 text-left text-[11px] text-[#666] hover:bg-[#F5F5F5]"
            >
              Top Level (no parent)
            </button>
            {allNodes
              .filter((n) => n.agent.id !== node.agent.id)
              .map((n) => (
                <button
                  key={n.agent.id}
                  onClick={() => {
                    onMove(node.agent.id, n.agent.id);
                    setShowMoveMenu(false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-[11px] text-[#666] hover:bg-[#F5F5F5]"
                >
                  Under {n.agent.displayName}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
