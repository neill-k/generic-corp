import { useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  type OnConnect,
  type OnEdgesChange,
  type OnNodeDrag,
  type Connection,
  type IsValidConnection,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api-client.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { useAgentStore } from "../../store/agent-store.js";
import { AgentNode, getMinimapColor } from "./AgentNode.js";
import type { AgentNodeData } from "./AgentNode.js";
import type { ApiOrgNode, WsAgentStatusChanged } from "@generic-corp/shared";

const nodeTypes: NodeTypes = {
  agent: AgentNode as unknown as NodeTypes["agent"],
};

interface OrgResponse {
  org: ApiOrgNode[];
}

const X_SPACING = 250;
const Y_SPACING = 150;

function autoLayoutTree(
  orgNodes: ApiOrgNode[],
  onClickAgent: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let nextX = 0;

  function layout(orgNode: ApiOrgNode, depth: number): number {
    const nodeId = orgNode.nodeId;

    if (orgNode.children.length === 0) {
      const x = nextX * X_SPACING;
      const y = depth * Y_SPACING;
      nodes.push({
        id: nodeId,
        type: "agent",
        position: { x, y },
        draggable: true,
        data: { agent: orgNode.agent, orgNodeId: orgNode.nodeId, onClickAgent },
      });
      nextX++;

      if (orgNode.parentNodeId) {
        edges.push({
          id: `${orgNode.parentNodeId}-${nodeId}`,
          source: orgNode.parentNodeId,
          target: nodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        });
      }
      return x;
    }

    const childXPositions: number[] = [];
    for (const child of orgNode.children) {
      childXPositions.push(layout(child, depth + 1));
    }

    const minX = Math.min(...childXPositions);
    const maxX = Math.max(...childXPositions);
    const centerX = (minX + maxX) / 2;

    nodes.push({
      id: nodeId,
      type: "agent",
      position: { x: centerX, y: depth * Y_SPACING },
      draggable: true,
      data: { agent: orgNode.agent, orgNodeId: orgNode.nodeId, onClickAgent },
    });

    if (orgNode.parentNodeId) {
      edges.push({
        id: `${orgNode.parentNodeId}-${nodeId}`,
        source: orgNode.parentNodeId,
        target: nodeId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      });
    }

    return centerX;
  }

  // Find orphan nodes (those without parent that aren't in a tree root)
  const allFlat: ApiOrgNode[] = [];
  function flatten(n: ApiOrgNode) {
    allFlat.push(n);
    n.children.forEach(flatten);
  }
  orgNodes.forEach(flatten);

  orgNodes.forEach((root) => layout(root, 0));

  return { nodes, edges };
}

function buildFlowElements(
  orgNodes: ApiOrgNode[],
  onClickAgent: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Flatten tree to check if all positions are (0,0)
  const allFlat: ApiOrgNode[] = [];
  function flatten(n: ApiOrgNode) {
    allFlat.push(n);
    n.children.forEach(flatten);
  }
  orgNodes.forEach(flatten);

  // If all nodes are at (0,0), use auto-layout
  const allAtOrigin = allFlat.every((n) => n.positionX === 0 && n.positionY === 0);
  if (allAtOrigin && allFlat.length > 1) {
    return autoLayoutTree(orgNodes, onClickAgent);
  }

  // Use server-provided positions
  function traverse(orgNode: ApiOrgNode) {
    const nodeId = orgNode.nodeId;
    nodes.push({
      id: nodeId,
      type: "agent",
      position: { x: orgNode.positionX, y: orgNode.positionY },
      draggable: true,
      data: { agent: orgNode.agent, orgNodeId: orgNode.nodeId, onClickAgent },
    });

    if (orgNode.parentNodeId) {
      edges.push({
        id: `${orgNode.parentNodeId}-${nodeId}`,
        source: orgNode.parentNodeId,
        target: nodeId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      });
    }

    orgNode.children.forEach(traverse);
  }

  orgNodes.forEach(traverse);
  return { nodes, edges };
}

interface OrgChartProps {
  onClickAgent: (agentId: string) => void;
}

export function OrgChart({ onClickAgent }: OrgChartProps) {
  const queryClient = useQueryClient();
  const updateAgentStatus = useAgentStore((s) => s.updateAgentStatus);
  const isDraggingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const orgQuery = useQuery({
    queryKey: ["org"],
    queryFn: () => api.get<OrgResponse>("/org"),
  });

  // Build flow elements from server data
  useEffect(() => {
    if (!orgQuery.data?.org || isDraggingRef.current) return;
    const { nodes: newNodes, edges: newEdges } = buildFlowElements(
      orgQuery.data.org,
      onClickAgent,
    );
    setNodes(newNodes);
    setEdges(newEdges);
  }, [orgQuery.data, onClickAgent, setNodes, setEdges]);

  // WebSocket listeners
  useSocketEvent<WsAgentStatusChanged>("agent_status_changed", (event) => {
    updateAgentStatus(event.agentId, event.status);
    if (!isDraggingRef.current) {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    }
  });

  useSocketEvent("agent_updated", () => {
    if (!isDraggingRef.current) {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    }
  });

  useSocketEvent("agent_deleted", () => {
    if (!isDraggingRef.current) {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    }
  });

  useSocketEvent("org_changed", () => {
    if (!isDraggingRef.current) {
      queryClient.invalidateQueries({ queryKey: ["org"] });
    }
  });

  // Save all node positions to server
  const savePositions = useCallback((currentNodes: Node[]) => {
    const positions = currentNodes.map((n) => ({
      nodeId: n.id,
      positionX: n.position.x,
      positionY: n.position.y,
    }));
    api.put<unknown>("/org/nodes/positions", { positions }).catch((err) => {
      console.error("[OrgChart] Failed to save positions:", err);
    });
  }, []);

  // Debounced position save on drag stop
  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_event, _node, allNodes) => {
      isDraggingRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        savePositions(allNodes);
      }, 500);
    },
    [savePositions],
  );

  // Connect handler: set reporting relationship
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      // Remove existing edges to target (single parent rule)
      setEdges((eds) => {
        const filtered = eds.filter((e) => e.target !== connection.target);
        const newEdge: Edge = {
          id: `${connection.source}-${connection.target}`,
          source: connection.source!,
          target: connection.target!,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        };
        return [...filtered, newEdge];
      });

      // Persist: PATCH target org node with new parentNodeId
      api
        .patch<unknown>(`/org/nodes/${connection.target}`, {
          parentNodeId: connection.source,
        })
        .catch((err) => {
          console.error("[OrgChart] Failed to update parent:", err);
          // Revert on failure
          queryClient.invalidateQueries({ queryKey: ["org"] });
        });
    },
    [setEdges, queryClient],
  );

  // Validate connections: prevent self-loops and cycles
  const isValidConnection: IsValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (connection.source === connection.target) return false;

      // Walk the edge graph from source upward to detect cycles
      const visited = new Set<string>();
      let current: string | null = connection.source ?? null;

      while (current) {
        if (current === connection.target) return false;
        if (visited.has(current)) break;
        visited.add(current);

        const parentEdge = edges.find((e) => e.target === current);
        current = parentEdge?.source ?? null;
      }

      return true;
    },
    [edges],
  );

  // Edge deletion: unparent the child node
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      for (const change of changes) {
        if (change.type === "remove") {
          const removedEdge = edges.find((e) => e.id === change.id);
          if (removedEdge) {
            api
              .patch<unknown>(`/org/nodes/${removedEdge.target}`, {
                parentNodeId: null,
              })
              .catch((err) => {
                console.error("[OrgChart] Failed to unparent node:", err);
              });
          }
        }
      }
      onEdgesChange(changes);
    },
    [edges, onEdgesChange],
  );

  // Minimap node color based on status
  const minimapNodeColor = useCallback((node: Node) => {
    const data = node.data as unknown as AgentNodeData | undefined;
    if (!data) return "#999";
    return getMinimapColor(data);
  }, []);

  if (orgQuery.isLoading) {
    return <p className="text-sm text-[#999]">Loading org chart...</p>;
  }

  if (orgQuery.isError) {
    return <p className="text-sm text-red-500">Failed to load org chart.</p>;
  }

  return (
    <div className="relative h-full w-full rounded-lg border border-[#EEE] bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        isValidConnection={isValidConnection}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Controls position="top-left" />
        <MiniMap
          nodeColor={minimapNodeColor}
          position="bottom-right"
          pannable
          zoomable
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#E0E0E0" />
      </ReactFlow>
      <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded bg-white/90 px-3 py-2 text-xs text-[#666] shadow-sm">
        <span className="font-medium text-[#666]">Status:</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Idle</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-yellow-500" /> Running</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Error</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#999]" /> Offline</span>
      </div>
    </div>
  );
}
