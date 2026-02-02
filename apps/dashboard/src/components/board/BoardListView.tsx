import { Ban, Link2 } from "lucide-react";

import type { BoardResponse, BoardTask, BoardColumnKey } from "./types.js";

const STATUS_LABELS: Record<BoardColumnKey, { label: string; color: string; bg: string }> = {
  backlog: { label: "Backlog", color: "#64748b", bg: "#f1f5f9" },
  in_progress: { label: "In Progress", color: "#1565C0", bg: "#E3F2FD" },
  review: { label: "Review", color: "#E65100", bg: "#FFF3E0" },
  done: { label: "Done", color: "#2E7D32", bg: "#E8F5E9" },
};

const BLOCKED_STATUS = { label: "Blocked", color: "#C62828", bg: "#FFEBEE" };

const PRIORITY_CONFIG: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#C62828", bg: "#FFEBEE", label: "P1" },
  2: { color: "#E65100", bg: "#FFF3E0", label: "P2" },
  3: { color: "#1565C0", bg: "#E3F2FD", label: "P3" },
};

interface BoardListViewProps {
  columns: BoardResponse["columns"];
  onTaskClick?: (taskId: string) => void;
}

interface FlatTask extends BoardTask {
  columnKey: BoardColumnKey;
}

export function BoardListView({ columns, onTaskClick }: BoardListViewProps) {
  const allTasks: FlatTask[] = [];

  for (const key of Object.keys(columns) as BoardColumnKey[]) {
    for (const task of columns[key].tasks) {
      allTasks.push({ ...task, columnKey: key });
    }
  }

  if (allTasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-[#CCC]">No tasks found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-[#EEE] text-[10px] uppercase tracking-wider text-[#999]">
            <th className="pb-2 pr-4 font-medium">Task</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Priority</th>
            <th className="pb-2 pr-4 font-medium">Assignee</th>
            <th className="pb-2 pr-4 font-medium">Tags</th>
          </tr>
        </thead>
        <tbody>
          {allTasks.map((task) => {
            const isBlocked = task.status === "blocked";
            const statusConfig = isBlocked
              ? BLOCKED_STATUS
              : STATUS_LABELS[task.columnKey];
            const priorityConfig = PRIORITY_CONFIG[task.priority] ?? {
              color: "#666",
              bg: "#f5f5f5",
              label: "P?",
            };
            const hasDelegation = !!task.parentTaskId;

            return (
              <tr
                key={task.id}
                onClick={() => onTaskClick?.(task.id)}
                className={`cursor-pointer border-b transition-colors hover:bg-[#F5F5F5] ${
                  isBlocked
                    ? "border-orange-100 bg-orange-50/30"
                    : "border-[#EEE]"
                }`}
              >
                {/* Task title */}
                <td className="max-w-sm py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {isBlocked && (
                      <Ban size={12} className="shrink-0 text-orange-500" />
                    )}
                    {hasDelegation && (
                      <Link2 size={12} className="shrink-0 text-[#5E35B1]" />
                    )}
                    <span className="truncate font-medium text-black">
                      {task.prompt}
                    </span>
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 pr-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      color: statusConfig.color,
                      backgroundColor: statusConfig.bg,
                    }}
                  >
                    {statusConfig.label}
                  </span>
                </td>

                {/* Priority */}
                <td className="py-3 pr-4">
                  {task.priority && (
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold"
                      style={{
                        color: priorityConfig.color,
                        backgroundColor: priorityConfig.bg,
                      }}
                    >
                      {priorityConfig.label}
                    </span>
                  )}
                </td>

                {/* Assignee */}
                <td className="py-3 pr-4">
                  {task.assignee ? (
                    <div className="flex items-center gap-1.5">
                      <div
                        className="flex h-5 w-5 items-center justify-center rounded-full"
                        style={{
                          backgroundColor:
                            task.assignee.avatarColor ?? "#64748b",
                        }}
                      >
                        <span className="text-[7px] font-semibold text-white">
                          {getInitials(
                            task.assignee.displayName ?? task.assignee.name,
                          )}
                        </span>
                      </div>
                      <span className="text-[#666]">
                        {task.assignee.displayName ?? task.assignee.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#CCC]">--</span>
                  )}
                </td>

                {/* Tags */}
                <td className="py-3 pr-4">
                  <div className="flex gap-1">
                    {task.tags?.map((tag) => (
                      <span
                        key={tag.label}
                        className="rounded px-1.5 py-0.5 font-mono text-[9px]"
                        style={{
                          color: tag.color,
                          backgroundColor: tag.bg,
                        }}
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.split(/[\s.]+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first) return "?";
  if (parts.length === 1 || !last) return first.charAt(0).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
