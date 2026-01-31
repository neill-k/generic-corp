import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api-client.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { useActivityStore } from "../../store/activity-store.js";
import { ActivityStream } from "./ActivityStream.js";
import { TaskHistory } from "./TaskHistory.js";
import { getSocket } from "../../lib/socket.js";
import type { ApiAgentDetail, WsAgentEvent } from "@generic-corp/shared";

interface TaskSummary {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  costUsd: number | null;
  durationMs: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500",
  running: "bg-yellow-500",
  error: "bg-red-500",
  offline: "bg-slate-400",
};

export function AgentDetail({ agentId }: { agentId: string }) {
  const queryClient = useQueryClient();
  const appendEntry = useActivityStore((s) => s.appendEntry);
  const clearEntries = useActivityStore((s) => s.clearEntries);

  // Join agent room for live events
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_agent", agentId);
    clearEntries();

    return () => {
      socket.emit("leave_agent", agentId);
    };
  }, [agentId, clearEntries]);

  // Buffer live agent events
  useSocketEvent<WsAgentEvent>("agent_event", (event) => {
    if (event.agentId === agentId) {
      appendEntry({
        id: crypto.randomUUID(),
        agentId: event.agentId,
        taskId: event.taskId,
        event: event.event,
        timestamp: new Date().toISOString(),
      });
    }
  });

  useSocketEvent("agent_updated", () => {
    queryClient.invalidateQueries({ queryKey: ["agent", agentId] });
  });

  useSocketEvent("task_created", () => {
    queryClient.invalidateQueries({ queryKey: ["agent-tasks", agentId] });
  });

  useSocketEvent("task_status_changed", () => {
    queryClient.invalidateQueries({ queryKey: ["agent-tasks", agentId] });
  });

  useSocketEvent("task_updated", () => {
    queryClient.invalidateQueries({ queryKey: ["agent-tasks", agentId] });
  });

  const agentQuery = useQuery({
    queryKey: ["agent", agentId],
    queryFn: () => api.get<{ agent: ApiAgentDetail }>(`/agents/${agentId}`),
  });

  const tasksQuery = useQuery({
    queryKey: ["agent-tasks", agentId],
    queryFn: () => api.get<{ tasks: TaskSummary[] }>(`/agents/${agentId}/tasks`),
  });

  if (agentQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading agent...</p>;
  }

  if (agentQuery.isError || !agentQuery.data) {
    return <p className="text-sm text-red-500">Failed to load agent.</p>;
  }

  const agent = agentQuery.data.agent;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span
          className={`inline-block h-3 w-3 rounded-full ${STATUS_COLORS[agent.status] ?? "bg-slate-400"}`}
        />
        <div>
          <h2 className="text-xl font-semibold">{agent.displayName}</h2>
          <p className="text-sm text-slate-500">
            {agent.role} &middot; {agent.department}
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Live Activity
        </h3>
        <ActivityStream agentId={agentId} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          Task History
        </h3>
        <TaskHistory
          tasks={tasksQuery.data?.tasks ?? []}
          isLoading={tasksQuery.isLoading}
        />
      </section>
    </div>
  );
}
