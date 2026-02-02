import { useState } from "react";
import { Plus } from "lucide-react";

import { BoardCard } from "./BoardCard.js";
import type { BoardTask, BoardColumnKey } from "./types.js";

const COLUMN_CONFIG: Record<
  BoardColumnKey,
  { label: string; dotColor: string }
> = {
  backlog: { label: "Backlog", dotColor: "#94a3b8" },
  in_progress: { label: "In Progress", dotColor: "#1565C0" },
  review: { label: "Review", dotColor: "#E65100" },
  done: { label: "Done", dotColor: "#2E7D32" },
};

const SHOW_MORE_THRESHOLD = 10;

interface BoardColumnProps {
  columnKey: BoardColumnKey;
  tasks: BoardTask[];
  count: number;
  onLoadMore?: () => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
  onDropTask?: (taskId: string, targetColumn: BoardColumnKey) => void;
  onTaskClick?: (taskId: string) => void;
}

export function BoardColumn({
  columnKey,
  tasks,
  count,
  onLoadMore,
  onDragStart,
  onDropTask,
  onTaskClick,
}: BoardColumnProps) {
  const config = COLUMN_CONFIG[columnKey];
  const faded = columnKey === "done";
  const hasMore = count > tasks.length;
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if leaving the column entirely (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId && onDropTask) {
      onDropTask(taskId, columnKey);
    }
  };

  return (
    <div
      className={`flex h-full min-w-0 flex-1 flex-col gap-3 rounded-lg transition-colors ${
        dragOver ? "bg-[#F5F5F5] ring-2 ring-[#DDD]" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className="flex w-full items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-black">
            {config.label}
          </span>
          <span className="rounded-[10px] bg-[#F5F5F5] px-2 py-0.5 font-mono text-[10px] font-medium text-[#999]">
            {count}
          </span>
        </div>
        <button
          className="rounded p-0.5 text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#666]"
          title={`Add task to ${config.label}`}
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.length === 0 && (
          <p className="py-8 text-center text-xs text-[#CCC]">
            {dragOver ? "Drop here" : "No tasks"}
          </p>
        )}
        {tasks.map((task) => (
          <BoardCard
            key={task.id}
            task={task}
            faded={faded}
            onDragStart={onDragStart}
            onClick={onTaskClick}
          />
        ))}

        {hasMore && (
          <button
            onClick={onLoadMore}
            className="rounded-md border border-dashed border-[#EEE] py-2 text-center text-[11px] text-[#999] transition-colors hover:border-[#DDD] hover:text-[#666]"
          >
            Show {count - tasks.length} more...
          </button>
        )}
      </div>
    </div>
  );
}

export { COLUMN_CONFIG, SHOW_MORE_THRESHOLD };
