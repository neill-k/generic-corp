import { useMemo, useCallback } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { api } from "../../lib/api-client.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { useAgentStore } from "../../store/agent-store.js";
import { AgentNode } from "./AgentNode.js";
import type { ApiOrgNode, WsAgentStatusChanged } from "@generic-corp/shared";
import { useQueryClient } from "@tanstack/react-query";

const nodeTypes: NodeTypes = {
  agent: AgentNode as NodeTypes["agent"],
};

interface OrgResponse {
  org: ApiOrgNode[];
}

function flattenOrgTree(
  orgNodes: ApiOrgNode[],
  onClickAgent: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const Y_SPACING = 120;
  const X_SPACING = 200;

  function traverse(orgNode: ApiOrgNode, depth: number, siblingIndex: number) {
    const nodeId = orgNode.agent.id;
    nodes.push({
      id: nodeId,
      type: "agent",
      position: { x: siblingIndex * X_SPACING, y: depth * Y_SPACING },
      data: { agent: orgNode.agent, onClickAgent },
    });

    if (orgNode.parentAgentId) {
      edges.push({
        id: `${orgNode.parentAgentId}-${nodeId}`,
        source: orgNode.parentAgentId,
        target: nodeId,
      });
    }

    orgNode.children.forEach((child, i) => traverse(child, depth + 1, siblingIndex + i));
  }

  orgNodes.forEach((root, i) => traverse(root, 0, i));

  return { nodes, edges };
}

export function OrgChart() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateAgentStatus = useAgentStore((s) => s.updateAgentStatus);

  const orgQuery = useQuery({
    queryKey: ["org"],
    queryFn: () => api.get<OrgResponse>("/org"),
  });

  useSocketEvent<WsAgentStatusChanged>("agent_status_changed", (event) => {
    updateAgentStatus(event.agentId, event.status);
    queryClient.invalidateQueries({ queryKey: ["org"] });
  });

  useSocketEvent("agent_updated", () => {
    queryClient.invalidateQueries({ queryKey: ["org"] });
  });

  useSocketEvent("agent_deleted", () => {
    queryClient.invalidateQueries({ queryKey: ["org"] });
  });

  useSocketEvent("org_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["org"] });
  });

  const handleClickAgent = useCallback(
    (id: string) => {
      void navigate({ to: "/agents/$id", params: { id } });
    },
    [navigate],
  );

  const { nodes, edges } = useMemo(() => {
    if (!orgQuery.data?.org) return { nodes: [], edges: [] };
    return flattenOrgTree(orgQuery.data.org, handleClickAgent);
  }, [orgQuery.data, handleClickAgent]);

  if (orgQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading org chart...</p>;
  }

  if (orgQuery.isError) {
    return <p className="text-sm text-red-500">Failed to load org chart.</p>;
  }

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full rounded-lg border border-slate-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      />
      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm">
        <span className="font-medium text-slate-600">Status:</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Idle</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Running</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Error</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-slate-400" /> Offline</span>
      </div>
    </div>
  );
}
