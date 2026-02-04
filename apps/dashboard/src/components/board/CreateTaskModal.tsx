import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Loader2, ChevronDown } from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryClient } from "../../lib/query-client.js";
import { queryKeys } from "../../lib/query-keys.js";

interface CreateTaskModalProps {
  onClose: () => void;
}

export function CreateTaskModal({ onClose }: CreateTaskModalProps) {
  const [prompt, setPrompt] = useState("");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState(0);
  const [context, setContext] = useState("");

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: () =>
      api.get<{
        agents: Array<{ id: string; name: string; displayName?: string }>;
      }>("/agents"),
    staleTime: 60_000,
  });

  const agentOptions = useMemo(() => {
    const agents = agentsQuery.data?.agents ?? [];
    return [
      { value: "", label: "Default (Marcus)" },
      ...agents.map((a) => ({
        value: a.name,
        label: a.displayName ?? a.name,
      })),
    ];
  }, [agentsQuery.data]);

  const createMutation = useMutation({
    mutationFn: (data: {
      prompt: string;
      assignee?: string;
      priority?: number;
      context?: string;
    }) => api.post<{ id: string }>("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const payload: {
      prompt: string;
      assignee?: string;
      priority?: number;
      context?: string;
    } = {
      prompt: prompt.trim(),
    };

    if (assignee) payload.assignee = assignee;
    if (priority > 0) payload.priority = priority;
    if (context.trim()) payload.context = context.trim();

    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#EEE] px-5 py-4">
          <h2 className="text-sm font-semibold text-black">
            Create New Task
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#666]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
          {/* Prompt */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
              Task Prompt <span className="text-red-400">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what needs to be done..."
              rows={3}
              className="w-full resize-none rounded-md border border-[#EEE] bg-white px-3 py-2 text-xs text-black outline-none placeholder:text-[#999] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
              autoFocus
            />
          </div>

          {/* Assignee & Priority */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                Assignee
              </label>
              <div className="relative">
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  className="w-full appearance-none rounded-md border border-[#EEE] bg-white py-2 pl-3 pr-7 text-xs text-black outline-none transition-colors hover:border-[#DDD] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
                >
                  {agentOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#999]"
                />
              </div>
            </div>

            <div className="w-36">
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
                Priority
              </label>
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(Number(e.target.value))}
                  className="w-full appearance-none rounded-md border border-[#EEE] bg-white py-2 pl-3 pr-7 text-xs text-black outline-none transition-colors hover:border-[#DDD] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
                >
                  <option value={0}>Unset</option>
                  <option value={1}>P1 - Critical</option>
                  <option value={2}>P2 - High</option>
                  <option value={3}>P3 - Normal</option>
                </select>
                <ChevronDown
                  size={12}
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#999]"
                />
              </div>
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#999]">
              Context (optional)
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Additional context for the agent..."
              rows={2}
              className="w-full resize-none rounded-md border border-[#EEE] bg-white px-3 py-2 text-xs text-black outline-none placeholder:text-[#999] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
            />
          </div>

          {/* Error */}
          {createMutation.isError && (
            <p className="text-[11px] text-red-500">
              {createMutation.error instanceof Error
                ? createMutation.error.message
                : "Failed to create task"}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!prompt.trim() || createMutation.isPending}
              className="flex items-center gap-1.5 rounded-md bg-black px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#222] disabled:opacity-50"
            >
              {createMutation.isPending && (
                <Loader2 size={12} className="animate-spin" />
              )}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
