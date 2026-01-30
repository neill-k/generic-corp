import { Handle, Position } from "@xyflow/react";
import type { ApiAgentSummary } from "@generic-corp/shared";

interface AgentNodeData {
  agent: ApiAgentSummary;
  onClickAgent: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500",
  running: "bg-yellow-500",
  error: "bg-red-500",
  offline: "bg-slate-400",
};

export function AgentNode({ data }: { data: AgentNodeData }) {
  const { agent, onClickAgent } = data;

  return (
    <div
      className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md"
      onClick={() => onClickAgent(agent.id)}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-300" />
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLORS[agent.status] ?? "bg-slate-400"}`}
        />
        <span className="text-sm font-semibold text-slate-800">
          {agent.displayName}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{agent.role}</p>
      <p className="text-xs text-slate-400">{agent.department}</p>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300" />
    </div>
  );
}
