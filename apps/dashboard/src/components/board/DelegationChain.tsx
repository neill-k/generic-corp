import { useState, useEffect } from "react";
import { ChevronRight, Loader2, Link2 } from "lucide-react";

import { api } from "../../lib/api-client.js";

interface ChainTask {
  id: string;
  prompt: string;
  status: string;
  assignee?: { name: string; displayName?: string } | null;
}

interface DelegationChainProps {
  taskId?: string;
  parentTaskId?: string | null;
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending: { color: "#64748b", bg: "#f1f5f9" },
  running: { color: "#1565C0", bg: "#E3F2FD" },
  review: { color: "#E65100", bg: "#FFF3E0" },
  completed: { color: "#2E7D32", bg: "#E8F5E9" },
  failed: { color: "#C62828", bg: "#FFEBEE" },
  blocked: { color: "#C62828", bg: "#FFEBEE" },
};

export function DelegationChain({ parentTaskId }: DelegationChainProps) {
  const [chain, setChain] = useState<ChainTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parentTaskId) {
      setChain([]);
      return;
    }

    let cancelled = false;

    async function fetchChain() {
      setLoading(true);
      setError(null);
      const parents: ChainTask[] = [];
      let currentParentId: string | null | undefined = parentTaskId;

      try {
        while (currentParentId) {
          const task = await api.get<{
            id: string;
            prompt: string;
            status: string;
            parentTaskId?: string | null;
            assignee?: { name: string; displayName?: string } | null;
          }>(`/tasks/${currentParentId}`);

          if (cancelled) return;

          parents.unshift({
            id: task.id,
            prompt: task.prompt,
            status: task.status,
            assignee: task.assignee,
          });

          currentParentId = task.parentTaskId;
        }

        if (!cancelled) {
          setChain(parents);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load chain");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchChain();

    return () => {
      cancelled = true;
    };
  }, [parentTaskId]);

  if (!parentTaskId) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 size={12} className="animate-spin text-[#999]" />
        <span className="text-[11px] text-[#999]">Loading delegation chain...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-2 text-[11px] text-red-400">
        Failed to load delegation chain
      </div>
    );
  }

  if (chain.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Link2 size={12} className="text-[#999]" />
        <span className="text-[11px] font-medium text-[#999]">
          Delegation Chain
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {chain.map((task, index) => {
          const fallback = { color: "#64748b", bg: "#f1f5f9" };
          const statusStyle = STATUS_COLORS[task.status] ?? fallback;
          const label = task.assignee?.displayName ?? task.assignee?.name ?? "Human";
          return (
            <div key={task.id} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight size={10} className="text-[#CCC]" />
              )}
              <div
                className="flex items-center gap-1.5 rounded-full px-2 py-0.5"
                style={{ backgroundColor: statusStyle.bg }}
                title={`${task.prompt.slice(0, 80)} (${task.status})`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: statusStyle.color }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: statusStyle.color }}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}

        {/* Current task (this one) */}
        <ChevronRight size={10} className="text-[#CCC]" />
        <div className="flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-2 py-0.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-black" />
          <span className="text-[10px] font-medium text-black">
            Current
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Small inline indicator for board cards that shows delegation depth.
 * Used in BoardCard when a task has a parentTaskId.
 */
export function DelegationIndicator({ depth }: { depth?: number }) {
  return (
    <div
      className="flex items-center gap-1 rounded px-1.5 py-0.5"
      style={{ backgroundColor: "#EDE7F6" }}
      title={`Delegated task${depth ? ` (depth ${depth})` : ""}`}
    >
      <Link2 size={9} className="text-[#5E35B1]" />
      {depth !== undefined && depth > 0 && (
        <span className="font-mono text-[8px] font-semibold text-[#5E35B1]">
          D{depth}
        </span>
      )}
    </div>
  );
}
