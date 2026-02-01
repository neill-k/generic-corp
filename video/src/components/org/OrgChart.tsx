import React from "react";
import { AGENTS } from "../../data/agents";
import type { AgentStatus } from "../../data/agents";
import { ORG_POSITIONS, ORG_EDGES, getPosition } from "../../data/org-layout";
import { OrgNode } from "./OrgNode";
import { OrgEdge } from "./OrgEdge";
import { UserNode } from "./UserNode";
import { USER_POSITION } from "../../data/org-layout";

type OrgChartProps = {
  nodeOpacities: Record<string, number>;
  nodeStatuses: Record<string, AgentStatus>;
  showUser?: boolean;
  showEdges?: boolean;
};

export const OrgChart: React.FC<OrgChartProps> = ({
  nodeOpacities,
  nodeStatuses,
  showUser = false,
  showEdges = true,
}) => {
  return (
    <>
      {/* Edges (SVG layer) */}
      {showEdges && (
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          {ORG_EDGES.map((edge) => {
            const from = getPosition(edge.from);
            const to = getPosition(edge.to);
            const edgeOpacity = Math.min(
              nodeOpacities[edge.from] ?? 0,
              nodeOpacities[edge.to] ?? 0,
            );
            const isActive =
              (nodeStatuses[edge.from] === "working" ||
                nodeStatuses[edge.from] === "complete") &&
              (nodeStatuses[edge.to] === "working" ||
                nodeStatuses[edge.to] === "complete");

            return (
              <OrgEdge
                key={`${edge.from}-${edge.to}`}
                fromX={from.x}
                fromY={from.y}
                toX={to.x}
                toY={to.y}
                opacity={edgeOpacity}
                active={isActive}
              />
            );
          })}
        </svg>
      )}

      {/* User node */}
      {showUser && (
        <UserNode
          x={USER_POSITION.x}
          y={USER_POSITION.y}
          opacity={nodeOpacities["user"] ?? 0}
        />
      )}

      {/* Agent nodes */}
      {AGENTS.map((agent) => {
        const pos = getPosition(agent.id);
        return (
          <OrgNode
            key={agent.id}
            name={agent.name}
            title={agent.title}
            color={agent.color}
            x={pos.x}
            y={pos.y}
            status={nodeStatuses[agent.id] ?? "idle"}
            opacity={nodeOpacities[agent.id] ?? 0}
          />
        );
      })}
    </>
  );
};
