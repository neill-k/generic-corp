import { useMemo, useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  Columns3,
  List,
  Plus,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  Clipboard,
  MessageSquare,
  Lightbulb,
  StickyNote,
} from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryClient } from "../../lib/query-client.js";
import { queryKeys } from "../../lib/query-keys.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { useBoardStore } from "../../store/board-store.js";
import { BoardColumn } from "./BoardColumn.js";
import { BoardListView } from "./BoardListView.js";
import { BoardItemsPanel } from "./BoardItemsPanel.js";
import { TaskDetailModal } from "./TaskDetailModal.js";
import { CreateTaskModal } from "./CreateTaskModal.js";
import type { BoardResponse, BoardColumnKey } from "./types.js";

const COLUMN_ORDER: BoardColumnKey[] = [
  "backlog",
  "in_progress",
  "review",
  "done",
];

/** Maps kanban column keys to the task status sent to the API */
const COLUMN_TO_STATUS: Record<BoardColumnKey, string> = {
  backlog: "pending",
  in_progress: "running",
  review: "review",
  done: "completed",
};

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "p1", label: "P1 - Critical" },
  { value: "p2", label: "P2 - High" },
  { value: "p3", label: "P3 - Normal" },
];

const DEPARTMENT_OPTIONS = [
  { value: "", label: "All Departments" },
  { value: "engineering", label: "Engineering" },
  { value: "operations", label: "Operations" },
  { value: "sales", label: "Sales" },
];

export function BoardView() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const {
    view,
    search,
    assignee,
    priority,
    department,
    setView,
    setSearch,
    setAssignee,
    setPriority,
    setDepartment,
    resetFilters,
  } = useBoardStore();

  const filters = useMemo(
    () => ({ search, assignee, priority, department }),
    [search, assignee, priority, department],
  );

  const hasActiveFilters = search || assignee || priority || department;

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (assignee) params.set("assignee", assignee);
    if (priority) params.set("priority", priority);
    if (department) params.set("department", department);
    params.set("limit", "25");
    return params.toString();
  }, [search, assignee, priority, department]);

  const boardQuery = useQuery({
    queryKey: queryKeys.tasks.board(filters),
    queryFn: () =>
      api.get<BoardResponse>(
        `/tasks/board${queryParams ? `?${queryParams}` : ""}`,
      ),
    refetchInterval: 30_000,
  });

  // Invalidate board on task-related socket events
  useSocketEvent("task_created", () => {
    boardQuery.refetch();
  });
  useSocketEvent("task_updated", () => {
    boardQuery.refetch();
  });

  // Fetch agents for the assignee filter dropdown
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(),
    queryFn: () =>
      api.get<{ agents: Array<{ id: string; name: string; displayName?: string }> }>(
        "/agents",
      ),
    staleTime: 60_000,
  });

  const assigneeOptions = useMemo(() => {
    const agents = agentsQuery.data?.agents ?? [];
    return [
      { value: "", label: "All Assignees" },
      ...agents.map((a) => ({
        value: a.id,
        label: a.displayName ?? a.name,
      })),
    ];
  }, [agentsQuery.data]);

  // ---- Drag-and-drop: move task to new column ----
  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      api.patch<unknown>(`/tasks/${taskId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });

  const handleDragStart = useCallback((_e: React.DragEvent, _taskId: string) => {
    // Optional: track dragging state in the future
  }, []);

  const handleDropTask = useCallback(
    (taskId: string, targetColumn: BoardColumnKey) => {
      const newStatus = COLUMN_TO_STATUS[targetColumn];
      moveTaskMutation.mutate({ taskId, status: newStatus });
    },
    [moveTaskMutation],
  );

  // Check if board is entirely empty (all columns zero)
  const totalTasks = boardQuery.data
    ? COLUMN_ORDER.reduce((sum, key) => sum + boardQuery.data.columns[key].count, 0)
    : 0;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
      {/* Board Header */}
      <div className="flex flex-col gap-5 px-8 pt-6">
        {/* Title row */}
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="h-5 w-1 rounded-sm bg-[#E53935]" />
              <h1 className="text-xl font-semibold text-black">
                Task Board
              </h1>
            </div>
            <p className="pl-[16px] text-[13px] text-[#999]">
              Track and manage tasks across all agents
            </p>
          </div>
          <button
            onClick={() => setShowCreateTask(true)}
            className="flex items-center gap-1.5 rounded-md bg-black px-4 py-2 transition-colors hover:bg-[#222]"
          >
            <Plus size={14} className="text-white" />
            <span className="text-xs font-medium text-white">New Task</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex w-full items-center justify-between">
          {/* Left: search + filters */}
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="flex items-center gap-2 rounded-md border border-[#EEE] px-3 py-2">
              <Search size={14} className="text-[#999]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="w-40 bg-transparent text-xs text-black outline-none placeholder:text-[#999]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="text-[#CCC] hover:text-[#666]"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Priority filter */}
            <FilterDropdown
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={setPriority}
            />

            {/* Assignee filter */}
            <FilterDropdown
              value={assignee}
              options={assigneeOptions}
              onChange={setAssignee}
            />

            {/* Department filter */}
            <FilterDropdown
              value={department}
              options={DEPARTMENT_OPTIONS}
              onChange={setDepartment}
            />

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] text-[#999] transition-colors hover:bg-[#F5F5F5] hover:text-[#666]"
              >
                <X size={10} />
                Clear
              </button>
            )}
          </div>

          {/* Right: view toggles */}
          <div className="flex items-center gap-0.5 rounded-md border border-[#EEE]">
            <button
              onClick={() => setView("board")}
              className={`flex items-center gap-1 rounded-l-md px-3 py-1.5 transition-colors ${
                view === "board"
                  ? "bg-[#F5F5F5] text-black"
                  : "text-[#999] hover:text-[#666]"
              }`}
            >
              <Columns3 size={14} />
              <span className="text-[11px] font-medium">Board</span>
            </button>
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${
                view === "list"
                  ? "bg-[#F5F5F5] text-black"
                  : "text-[#999] hover:text-[#666]"
              }`}
            >
              <List size={14} />
              <span className="text-[11px] font-medium">List</span>
            </button>
            <button
              onClick={() => setView("items")}
              className={`flex items-center gap-1 rounded-r-md px-3 py-1.5 transition-colors ${
                view === "items"
                  ? "bg-[#F5F5F5] text-black"
                  : "text-[#999] hover:text-[#666]"
              }`}
            >
              <StickyNote size={14} />
              <span className="text-[11px] font-medium">Items</span>
            </button>
          </div>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex flex-1 overflow-hidden px-8 pb-6 pt-4">
        {view !== "items" && boardQuery.isLoading && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#DDD]" />
          </div>
        )}

        {view !== "items" && boardQuery.isError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <AlertCircle size={24} className="text-[#E53935]" />
            <p className="text-sm text-[#666]">Failed to load board.</p>
            <button
              onClick={() => boardQuery.refetch()}
              className="text-xs text-[#E53935] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {boardQuery.isSuccess && totalTasks === 0 && !hasActiveFilters && view !== "items" && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <Clipboard size={32} className="text-[#DDD]" />
            <div className="text-center">
              <p className="text-sm font-medium text-[#666]">No tasks yet</p>
              <p className="mt-1 max-w-sm text-xs text-[#999]">
                Tasks appear here when you delegate work via Chat. Try asking the CEO agent to take on a task, or create one with the "New Task" button above.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <CapabilityHint icon={<MessageSquare size={12} />} text="Delegate work via Chat" />
              <CapabilityHint icon={<Clipboard size={12} />} text="Track task progress" />
              <CapabilityHint icon={<Lightbulb size={12} />} text="Drag cards between columns to update status" />
            </div>
          </div>
        )}

        {boardQuery.isSuccess && (totalTasks > 0 || hasActiveFilters) && view === "board" && (
          <div className="flex flex-1 gap-4 overflow-hidden">
            {COLUMN_ORDER.map((key) => {
              const col = boardQuery.data.columns[key];
              return (
                <BoardColumn
                  key={key}
                  columnKey={key}
                  tasks={col.tasks}
                  count={col.count}
                  onDragStart={handleDragStart}
                  onDropTask={handleDropTask}
                  onTaskClick={setSelectedTaskId}
                />
              );
            })}
          </div>
        )}

        {boardQuery.isSuccess && (totalTasks > 0 || hasActiveFilters) && view === "list" && (
          <BoardListView columns={boardQuery.data.columns} onTaskClick={setSelectedTaskId} />
        )}

        {view === "items" && (
          <BoardItemsPanel />
        )}
      </div>

      {/* Task Detail Slide-over */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <CreateTaskModal onClose={() => setShowCreateTask(false)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Capability Hint                                                     */
/* ------------------------------------------------------------------ */

function CapabilityHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#EEE] bg-white px-3 py-1.5 text-xs text-[#666]">
      {icon}
      <span>{text}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter Dropdown                                                    */
/* ------------------------------------------------------------------ */

interface FilterDropdownProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function FilterDropdown({ value, options, onChange }: FilterDropdownProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md border border-[#EEE] bg-white py-1.5 pl-3 pr-7 text-[11px] text-[#666] outline-none transition-colors hover:border-[#DDD] focus:border-[#999]"
      >
        {options.map((opt) => (
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
  );
}
