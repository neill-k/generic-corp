import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, ChevronDown, ChevronRight, FileText } from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryKeys } from "../../lib/query-keys.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { useActivityStore } from "../../store/activity-store.js";
import { ActivityStream } from "./ActivityStream.js";
import { TaskHistory } from "./TaskHistory.js";
import { AgentConfig } from "./AgentConfig.js";
import { AgentStatus } from "./AgentStatus.js";
import { getSocket } from "../../lib/socket.js";
import type { ApiAgentDetail as ApiAgentDetailType, WsAgentEvent } from "@generic-corp/shared";

interface TaskSummary {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  costUsd: number | null;
  durationMs: number | null;
}

interface ContextResponse {
  content: string | null;
}

interface ResultFile {
  file: string;
  content: string;
}

interface ResultsResponse {
  results: ResultFile[];
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500",
  running: "bg-yellow-500",
  error: "bg-red-500",
  offline: "bg-[#999]",
};

const TABS = ["Status", "Live Activity", "Tasks", "Context", "Results", "Config"] as const;
type Tab = (typeof TABS)[number];

// --- Context Tab ---
function AgentContext({ agentId }: { agentId: string }) {
  const contextQuery = useQuery({
    queryKey: queryKeys.agents.context(agentId),
    queryFn: () => api.get<ContextResponse>(`/agents/${agentId}/context`),
  });

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-black">
          Agent Context
        </span>
        <span className="text-[10px] text-[#999]">
          context.md (read-only)
        </span>
      </div>

      {contextQuery.isLoading ? (
        <p className="text-xs text-[#999]">Loading context...</p>
      ) : contextQuery.isError ? (
        <p className="text-xs text-[#E53935]">Failed to load context.</p>
      ) : contextQuery.data?.content ? (
        <div className="rounded-md border border-[#EEE] bg-[#F5F5F5] p-4 max-h-[600px] overflow-y-auto">
          <pre className="font-mono text-[11px] text-[#666] leading-6 whitespace-pre-wrap">
            {contextQuery.data.content}
          </pre>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-[#EEE] p-10">
          <span className="text-xs text-[#999]">
            No context.md found for this agent.
          </span>
        </div>
      )}
    </div>
  );
}

// --- Results Tab ---
function AgentResults({ agentId }: { agentId: string }) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const resultsQuery = useQuery({
    queryKey: queryKeys.agents.results(agentId),
    queryFn: () => api.get<ResultsResponse>(`/agents/${agentId}/results`),
  });

  const toggleFile = (file: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(file)) {
        next.delete(file);
      } else {
        next.add(file);
      }
      return next;
    });
  };

  const results = resultsQuery.data?.results ?? [];

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-black">
          Results
        </span>
        <span className="text-[10px] text-[#999]">
          {results.length} file{results.length !== 1 ? "s" : ""}
        </span>
      </div>

      {resultsQuery.isLoading ? (
        <p className="text-xs text-[#999]">Loading results...</p>
      ) : resultsQuery.isError ? (
        <p className="text-xs text-[#E53935]">Failed to load results.</p>
      ) : results.length === 0 ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-[#EEE] p-10">
          <span className="text-xs text-[#999]">
            No result files found for this agent.
          </span>
        </div>
      ) : (
        <div className="flex flex-col rounded-lg overflow-hidden border border-[#EEE]">
          {results.map((result, i) => {
            const isExpanded = expandedFiles.has(result.file);
            const isLast = i === results.length - 1;
            return (
              <div
                key={result.file}
                className={!isLast ? "border-b border-[#EEE]" : ""}
              >
                <button
                  onClick={() => toggleFile(result.file)}
                  className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-[#F5F5F5] transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="shrink-0 text-[#999]" />
                  ) : (
                    <ChevronRight size={14} className="shrink-0 text-[#999]" />
                  )}
                  <FileText size={14} className="shrink-0 text-[#999]" />
                  <span className="font-mono text-xs font-medium text-black">
                    {result.file}
                  </span>
                </button>
                {isExpanded && (
                  <div className="border-t border-[#EEE] bg-[#F5F5F5] px-4 py-3">
                    <pre className="font-mono text-[11px] text-[#666] leading-6 whitespace-pre-wrap max-h-80 overflow-y-auto">
                      {result.content}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Message Input ---
function AgentMessageInput({ agentName }: { agentName: string }) {
  const [messageText, setMessageText] = useState("");

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      api.post<{ message: unknown }>("/messages", {
        agentName,
        body,
      }),
    onSuccess: () => {
      setMessageText("");
    },
  });

  const handleSend = () => {
    const text = messageText.trim();
    if (text) {
      sendMutation.mutate(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[#EEE] px-1 pt-3 pb-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${agentName}...`}
          disabled={sendMutation.isPending}
          className="flex-1 rounded-md border border-[#EEE] px-3 py-2.5 text-xs text-black placeholder:text-[#999] outline-none focus:border-[#999] disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={sendMutation.isPending || !messageText.trim()}
          className="flex items-center justify-center rounded-md bg-black p-2.5 text-white disabled:opacity-50 hover:bg-[#222] transition-colors"
          title="Send message"
        >
          <Send size={14} />
        </button>
      </div>
      {sendMutation.isError && (
        <p className="mt-1.5 text-[10px] text-red-500">
          Failed to send:{" "}
          {sendMutation.error instanceof Error
            ? sendMutation.error.message
            : "Unknown error"}
        </p>
      )}
      {sendMutation.isSuccess && (
        <p className="mt-1.5 text-[10px] text-green-600">
          Message sent. A task has been created for the agent.
        </p>
      )}
    </div>
  );
}

// --- Main Component ---
export function AgentDetail({ agentId }: { agentId: string }) {
  const queryClient = useQueryClient();
  const appendEntry = useActivityStore((s) => s.appendEntry);
  const clearEntries = useActivityStore((s) => s.clearEntries);
  const [activeTab, setActiveTab] = useState<Tab>("Status");

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
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.detail(agentId),
    });
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
    queryKey: queryKeys.agents.detail(agentId),
    queryFn: () =>
      api.get<{ agent: ApiAgentDetailType }>(`/agents/${agentId}`),
  });

  const tasksQuery = useQuery({
    queryKey: ["agent-tasks", agentId],
    queryFn: () =>
      api.get<{ tasks: TaskSummary[] }>(`/agents/${agentId}/tasks`),
  });

  if (agentQuery.isLoading) {
    return <p className="text-sm text-[#999]">Loading agent...</p>;
  }

  if (agentQuery.isError || !agentQuery.data) {
    return <p className="text-sm text-[#E53935]">Failed to load agent.</p>;
  }

  const agent = agentQuery.data.agent;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Agent Header */}
      <div className="flex items-center gap-3 px-1 pb-4">
        <span
          className={`inline-block h-3 w-3 rounded-full ${STATUS_COLORS[agent.status] ?? "bg-[#999]"}`}
        />
        <div>
          <h2 className="text-xl font-semibold text-black">{agent.displayName}</h2>
          <p className="text-sm text-[#666]">
            {agent.role} &middot; {agent.department}
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-end border-b border-[#EEE]">
        {TABS.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center h-10 px-3.5 text-xs transition-colors ${
                isActive
                  ? "border-b-2 border-black text-black font-medium"
                  : "border-b-2 border-transparent text-[#999] hover:text-[#666]"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden pt-5">
        {activeTab === "Status" && (
          <AgentStatus agentId={agentId} agentStatus={agent.status} />
        )}

        {activeTab === "Live Activity" && (
          <ActivityStream agentId={agentId} />
        )}

        {activeTab === "Tasks" && (
          <TaskHistory
            tasks={tasksQuery.data?.tasks ?? []}
            isLoading={tasksQuery.isLoading}
          />
        )}

        {activeTab === "Context" && (
          <AgentContext agentId={agentId} />
        )}

        {activeTab === "Results" && (
          <AgentResults agentId={agentId} />
        )}

        {activeTab === "Config" && (
          <AgentConfig agentId={agentId} agent={agent} />
        )}
      </div>

      {/* Persistent Message Input */}
      <AgentMessageInput agentName={agent.name} />
    </div>
  );
}
