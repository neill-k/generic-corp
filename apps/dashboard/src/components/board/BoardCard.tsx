import { Ban, Link2 } from "lucide-react";

import type { BoardTask } from "./types.js";

interface BoardCardProps {
  task: BoardTask;
  faded?: boolean;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onClick?: (taskId: string) => void;
}

export function BoardCard({ task, faded, onDragStart, onClick }: BoardCardProps) {
  const isBlocked = task.status === "blocked";
  const hasDelegation = !!task.parentTaskId;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(e, task.id);
  };

  const handleClick = () => {
    onClick?.(task.id);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={`flex w-full cursor-grab flex-col gap-2.5 rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm active:cursor-grabbing${
        faded ? " opacity-70" : ""
      }${
        isBlocked
          ? " border-orange-300 bg-orange-50/50"
          : " border-[#EEE]"
      }`}
    >
      {/* Blocked banner */}
      {isBlocked && (
        <div className="flex items-center gap-1.5 rounded bg-orange-100 px-2 py-1">
          <Ban size={10} className="text-orange-600" />
          <span className="text-[9px] font-semibold text-orange-600">BLOCKED</span>
        </div>
      )}

      {/* Title */}
      <p
        className={`text-xs font-medium leading-[1.4]${faded ? " text-[#999]" : " text-black"}`}
      >
        {task.prompt}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        {task.priority && (
          <PriorityTag priority={task.priority} />
        )}
        {hasDelegation && (
          <DelegationBadge />
        )}
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

      {/* Footer */}
      <div className="flex w-full items-center justify-between">
        {task.assignee ? (
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-5 w-5 items-center justify-center rounded-full"
              style={{ backgroundColor: task.assignee.avatarColor ?? "#64748b" }}
            >
              <span className="text-[7px] font-semibold text-white">
                {getInitials(task.assignee.displayName ?? task.assignee.name)}
              </span>
            </div>
            <span className="text-[10px] text-[#999]">
              {task.assignee.displayName ?? task.assignee.name}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-[#CCC]">Unassigned</span>
        )}
        <span className="font-mono text-[9px] text-[#999]">
          {task.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}

const DEFAULT_PRIORITY_CONFIG = { color: "#666666", bg: "#F5F5F5", label: "P?" };

const priorityConfig: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#C62828", bg: "#FFEBEE", label: "P1" },
  2: { color: "#E65100", bg: "#FFF3E0", label: "P2" },
  3: { color: "#1565C0", bg: "#E3F2FD", label: "P3" },
};

function PriorityTag({ priority }: { priority: number }) {
  const config = priorityConfig[priority] ?? DEFAULT_PRIORITY_CONFIG;
  return (
    <span
      className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      {config.label}
    </span>
  );
}

function DelegationBadge() {
  return (
    <span
      className="flex items-center gap-0.5 rounded px-1.5 py-0.5"
      style={{ backgroundColor: "#EDE7F6" }}
      title="Delegated task"
    >
      <Link2 size={9} className="text-[#5E35B1]" />
      <span className="font-mono text-[9px] font-semibold text-[#5E35B1]">
        Delegated
      </span>
    </span>
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
