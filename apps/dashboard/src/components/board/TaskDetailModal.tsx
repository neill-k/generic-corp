import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  X,
  Loader2,
  AlertCircle,
  Clock,
  DollarSign,
  Hash,
  ArrowRight,
  Trash2,
  ChevronDown,
} from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryClient } from "../../lib/query-client.js";
import { queryKeys } from "../../lib/query-keys.js";
import { DelegationChain } from "./DelegationChain.js";
import { TASK_STATUSES } from "@generic-corp/shared";
import type { TaskStatus } from "@generic-corp/shared";

interface TaskDetail {
  id: string;
  parentTaskId: string | null;
  assigneeId: string | null;
  delegatorId: string | null;
  prompt: string;
  context: string | null;
  priority: number;
  status: TaskStatus;
  tags: Array<{ label: string; color: string; bg: string }>;
  result: string | null;
  learnings: string | null;
  costUsd: number | null;
  durationMs: number | null;
  numTurns: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "#64748b", bg: "#f1f5f9" },
  running: { label: "Running", color: "#1565C0", bg: "#E3F2FD" },
  review: { label: "Review", color: "#E65100", bg: "#FFF3E0" },
  completed: { label: "Completed", color: "#2E7D32", bg: "#E8F5E9" },
  failed: { label: "Failed", color: "#C62828", bg: "#FFEBEE" },
  blocked: { label: "Blocked", color: "#6A1B9A", bg: "#F3E5F5" },
};

export function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const taskQuery = useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => api.get<{ task: TaskDetail }>(`/tasks/${taskId}`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { status?: string; priority?: number; context?: string }) =>
      api.patch<{ task: TaskDetail }>(`/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>(`/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      onClose();
    },
  });

  const task = taskQuery.data?.task;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEE] px-6 py-4">
          <h2 className="text-sm font-semibold text-black">
            Task Detail
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#666]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {taskQuery.isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-[#CCC]" />
            </div>
          )}

          {taskQuery.isError && (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <AlertCircle size={20} className="text-red-400" />
              <p className="text-xs text-[#666]">Failed to load task.</p>
              <button
                onClick={() => taskQuery.refetch()}
                className="text-xs text-[#E53935] hover:text-[#C62828]"
              >
                Retry
              </button>
            </div>
          )}

          {task && (
            <div className="flex flex-col gap-6">
              {/* Prompt */}
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                  Prompt
                </label>
                <p className="text-sm leading-relaxed text-black">
                  {task.prompt}
                </p>
              </div>

              {/* Delegation Chain */}
              {task.parentTaskId && (
                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Delegation Chain
                  </label>
                  <DelegationChain
                    taskId={task.id}
                    parentTaskId={task.parentTaskId}
                  />
                </div>
              )}

              {/* Status & Priority row */}
              <div className="flex gap-4">
                {/* Status */}
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        updateMutation.mutate({ status: e.target.value })
                      }
                      disabled={updateMutation.isPending}
                      className="w-full appearance-none rounded-md border border-[#EEE] bg-white py-2 pl-3 pr-7 text-xs text-black outline-none transition-colors hover:border-[#DDD] focus:border-[#999] focus:ring-1 focus:ring-[#EEE] disabled:opacity-50"
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_CONFIG[s]?.label ?? s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={12}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#999]"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Priority
                  </label>
                  <div className="relative">
                    <select
                      value={task.priority}
                      onChange={(e) =>
                        updateMutation.mutate({
                          priority: Number(e.target.value),
                        })
                      }
                      disabled={updateMutation.isPending}
                      className="w-full appearance-none rounded-md border border-[#EEE] bg-white py-2 pl-3 pr-7 text-xs text-black outline-none transition-colors hover:border-[#DDD] focus:border-[#999] focus:ring-1 focus:ring-[#EEE] disabled:opacity-50"
                    >
                      <option value={1}>P1 - Critical</option>
                      <option value={2}>P2 - High</option>
                      <option value={3}>P3 - Normal</option>
                      <option value={0}>Unset</option>
                    </select>
                    <ChevronDown
                      size={12}
                      className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#999]"
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded px-2 py-0.5 font-mono text-[10px]"
                        style={{ color: tag.color, backgroundColor: tag.bg }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Context */}
              {task.context && (
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Context
                  </label>
                  <div className="rounded-md border border-[#EEE] bg-[#F5F5F5] p-3">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-black">
                      {task.context}
                    </p>
                  </div>
                </div>
              )}

              {/* Result */}
              {task.result && (
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Result
                  </label>
                  <div className="rounded-md border border-green-200 bg-green-50 p-3">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-black">
                      {task.result}
                    </p>
                  </div>
                </div>
              )}

              {/* Learnings */}
              {task.learnings && (
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Learnings
                  </label>
                  <div className="rounded-md border border-[#EEE] bg-[#F5F5F5] p-3">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-black">
                      {task.learnings}
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata grid */}
              <div>
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                  Details
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Task ID */}
                  <MetadataItem
                    icon={<Hash size={12} />}
                    label="Task ID"
                    value={task.id.slice(0, 12)}
                    mono
                  />

                  {/* Parent Task */}
                  {task.parentTaskId && (
                    <MetadataItem
                      icon={<ArrowRight size={12} />}
                      label="Parent Task"
                      value={task.parentTaskId.slice(0, 12)}
                      mono
                    />
                  )}

                  {/* Cost */}
                  {task.costUsd != null && (
                    <MetadataItem
                      icon={<DollarSign size={12} />}
                      label="Cost"
                      value={`$${task.costUsd.toFixed(4)}`}
                    />
                  )}

                  {/* Duration */}
                  {task.durationMs != null && (
                    <MetadataItem
                      icon={<Clock size={12} />}
                      label="Duration"
                      value={formatDuration(task.durationMs)}
                    />
                  )}

                  {/* Turns */}
                  {task.numTurns != null && (
                    <MetadataItem
                      icon={<Hash size={12} />}
                      label="Turns"
                      value={String(task.numTurns)}
                    />
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                  Timeline
                </label>
                <div className="flex flex-col gap-1.5">
                  <TimestampRow label="Created" value={task.createdAt} />
                  {task.startedAt && (
                    <TimestampRow label="Started" value={task.startedAt} />
                  )}
                  {task.completedAt && (
                    <TimestampRow label="Completed" value={task.completedAt} />
                  )}
                </div>
              </div>

              {/* Delegation chain */}
              {(task.delegatorId || task.assigneeId) && (
                <div>
                  <label className="mb-2 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                    Assignment
                  </label>
                  <div className="flex items-center gap-2 text-xs text-[#666]">
                    {task.delegatorId && (
                      <>
                        <span className="font-mono text-[10px] text-[#666]">
                          {task.delegatorId.slice(0, 8)}
                        </span>
                        <ArrowRight size={12} className="text-[#CCC]" />
                      </>
                    )}
                    {task.assigneeId && (
                      <span className="font-mono text-[10px] text-[#666]">
                        {task.assigneeId.slice(0, 8)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {task && (
          <div className="flex items-center justify-between border-t border-[#EEE] px-6 py-3">
            {updateMutation.isError && (
              <span className="text-[11px] text-red-500">Update failed</span>
            )}
            {updateMutation.isPending && (
              <span className="flex items-center gap-1 text-[11px] text-[#999]">
                <Loader2 size={10} className="animate-spin" />
                Saving...
              </span>
            )}
            {!updateMutation.isError && !updateMutation.isPending && (
              <div />
            )}

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#666]">
                  Are you sure?
                </span>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md px-2.5 py-1 text-[11px] text-[#666] hover:bg-[#F5F5F5]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-[11px] text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteMutation.isPending && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] text-red-500 transition-colors hover:bg-[#FFF5F5]"
              >
                <Trash2 size={12} />
                Delete Task
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetadataItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-[#EEE] bg-[#F5F5F5] px-3 py-2">
      <span className="text-[#999]">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[9px] uppercase tracking-wider text-[#999]">
          {label}
        </span>
        <span
          className={`text-xs text-black ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function TimestampRow({ label, value }: { label: string; value: string }) {
  const date = new Date(value);
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#999]">{label}</span>
      <span className="font-mono text-[11px] text-[#666]">
        {date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}{" "}
        {date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours}h ${remainingMin}m`;
}
