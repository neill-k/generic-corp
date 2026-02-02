import { Handle, Position } from "@xyflow/react";
import type { ApiAgentSummary } from "@generic-corp/shared";

export interface AgentNodeData {
  agent: ApiAgentSummary;
  orgNodeId: string;
  onClickAgent: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500",
  running: "bg-yellow-500",
  error: "bg-red-500",
  offline: "bg-[#999]",
};

const STATUS_MINIMAP: Record<string, string> = {
  idle: "#22c55e",
  running: "#eab308",
  error: "#ef4444",
  offline: "#999999",
};

export function getMinimapColor(data: AgentNodeData): string {
  return STATUS_MINIMAP[data.agent.status] ?? "#999999";
}

export function AgentNode({ data, selected }: { data: AgentNodeData; selected?: boolean }) {
  const { agent, onClickAgent } = data;

  return (
    <div
      className={`cursor-pointer rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${
        selected ? "border-blue-400 ring-2 ring-blue-200" : "border-[#EEE]"
      }`}
      onClick={() => onClickAgent(agent.id)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#DDD] !bg-white hover:!border-blue-400 hover:!bg-blue-50"
      />
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLORS[agent.status] ?? "bg-[#999]"}`}
        />
        <span className="text-sm font-semibold text-black">
          {agent.displayName}
        </span>
      </div>
      <p className="mt-1 text-xs text-[#666]">{agent.role}</p>
      <p className="text-xs text-[#999]">{agent.department}</p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !rounded-full !border-2 !border-[#DDD] !bg-white hover:!border-blue-400 hover:!bg-blue-50"
      />
    </div>
  );
}
