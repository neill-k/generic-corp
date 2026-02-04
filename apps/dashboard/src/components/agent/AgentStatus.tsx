import { useQuery } from "@tanstack/react-query";
import { Clock, CheckCircle, DollarSign, ListOrdered } from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryKeys } from "../../lib/query-keys.js";
import type { AgentStatus as AgentStatusType } from "@generic-corp/shared";

interface CurrentTask {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
}

interface AgentMetrics {
  uptime: string;
  tasksCompleted: number;
  spendToday: string;
  currentTask: CurrentTask | null;
  queueDepth: number;
}

interface AgentMetricsResponse {
  metrics: AgentMetrics;
}

interface StatusDisplayInfo {
  label: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
}

const OFFLINE_STATUS: StatusDisplayInfo = {
  label: "Offline",
  dotClass: "bg-[#999]",
  bgClass: "bg-[#F5F5F5]",
  textClass: "text-[#666]",
};

const STATUS_DISPLAY: Record<string, StatusDisplayInfo> = {
  idle: {
    label: "Online",
    dotClass: "bg-green-500",
    bgClass: "bg-green-50",
    textClass: "text-green-700",
  },
  running: {
    label: "Active",
    dotClass: "bg-green-500",
    bgClass: "bg-green-50",
    textClass: "text-green-700",
  },
  error: {
    label: "Error",
    dotClass: "bg-red-500",
    bgClass: "bg-red-50",
    textClass: "text-red-700",
  },
  offline: OFFLINE_STATUS,
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export function AgentStatus({
  agentId,
  agentStatus,
}: {
  agentId: string;
  agentStatus: AgentStatusType;
}) {
  const metricsQuery = useQuery({
    queryKey: queryKeys.agents.metrics(agentId),
    queryFn: () =>
      api.get<AgentMetricsResponse>(`/agents/${agentId}/metrics`),
    refetchInterval: 30_000,
  });

  const statusInfo: StatusDisplayInfo = STATUS_DISPLAY[agentStatus] ?? OFFLINE_STATUS;
  const metrics = metricsQuery.data?.metrics;

  const statCards = [
    {
      label: "UPTIME",
      value: metrics?.uptime ?? "--",
      icon: Clock,
    },
    {
      label: "TASKS COMPLETED",
      value: metrics ? String(metrics.tasksCompleted) : "--",
      icon: CheckCircle,
    },
    {
      label: "SPEND TODAY",
      value: metrics?.spendToday ?? "--",
      icon: DollarSign,
    },
    {
      label: "QUEUE DEPTH",
      value: metrics ? String(metrics.queueDepth) : "--",
      icon: ListOrdered,
    },
  ];

  return (
    <div className="flex-1 flex flex-col gap-5 overflow-y-auto">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-black">
          Agent Status
        </span>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${statusInfo.bgClass}`}
        >
          <div className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
          <span className={`text-[11px] font-medium ${statusInfo.textClass}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      {metricsQuery.isLoading ? (
        <p className="text-xs text-[#999]">Loading metrics...</p>
      ) : metricsQuery.isError ? (
        <p className="text-xs text-red-500">Failed to load metrics.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex flex-col gap-1 rounded-lg bg-[#F5F5F5] p-4"
                >
                  <div className="flex items-center gap-1.5">
                    <Icon size={10} className="text-[#999]" />
                    <span className="text-[10px] font-medium text-[#999] tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <span className="font-mono text-xl font-semibold text-black">
                    {stat.value}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current Task */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] font-semibold text-[#999] tracking-widest">
              CURRENT TASK
            </span>
            {metrics?.currentTask ? (
              <div className="flex flex-col gap-2 rounded-lg border border-[#EEE] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-black">
                    {metrics.currentTask.prompt}
                  </span>
                  <span className="rounded bg-yellow-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-yellow-700">
                    {metrics.currentTask.status}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] text-[#999]">
                    Started {formatRelativeTime(metrics.currentTask.createdAt)}
                  </span>
                  <span className="text-[10px] text-[#CCC]">&middot;</span>
                  <span className="font-mono text-[10px] text-[#999]">
                    ID: {metrics.currentTask.id.slice(0, 8)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-[#EEE] p-6">
                <span className="text-xs text-[#999]">
                  No active task running.
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
