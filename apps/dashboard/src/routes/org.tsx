import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, MessageSquare, Lightbulb } from "lucide-react";

import { OrgChart } from "../components/org/OrgChart.js";
import { AddAgentOverlay } from "../components/org/AddAgentOverlay.js";
import { api } from "../lib/api-client.js";
import { queryKeys } from "../lib/query-keys.js";
import type { ApiAgentSummary, ApiOrgNode } from "@generic-corp/shared";
import { MAIN_AGENT_NAME } from "@generic-corp/shared";

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
    (a) => !agentsInOrg.has(a.id) && a.name !== MAIN_AGENT_NAME,
  ) ?? [];

  const addNodeMutation = useMutation({
    mutationFn: (data: { agentId: string; parentNodeId?: string; positionX?: number; positionY?: number }) =>
      api.post<unknown>("/org/nodes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org"] });
      setShowAddForm(false);
    },
  });

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
            Drag nodes to reposition. Connect handles to set reporting relationships.
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

      {/* Org Chart Visualization (full remaining height) */}
      {!isEmpty && (
        <div className="relative mx-8 mb-4 flex-1">
          <OrgChart />
          {showAddForm && (
            <AddAgentOverlay
              availableAgents={availableAgents}
              allOrgNodes={allOrgNodes}
              onAdd={(agentId, parentNodeId, positionX, positionY) => {
                addNodeMutation.mutate({ agentId, parentNodeId, positionX, positionY });
              }}
              onClose={() => setShowAddForm(false)}
              isPending={addNodeMutation.isPending}
              error={
                addNodeMutation.isError
                  ? addNodeMutation.error instanceof Error
                    ? addNodeMutation.error.message
                    : "Unknown error"
                  : undefined
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
