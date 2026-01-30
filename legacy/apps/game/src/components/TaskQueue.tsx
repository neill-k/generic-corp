import { useState } from "react";
import type { Agent, Task, TaskStatus, TaskPriority } from "@generic-corp/shared";

// Priority options with colors
const PRIORITY_OPTIONS: { value: TaskPriority; color: string; bgColor: string }[] = [
  { value: "low", color: "text-gray-400", bgColor: "bg-gray-700" },
  { value: "normal", color: "text-blue-400", bgColor: "bg-blue-900" },
  { value: "high", color: "text-yellow-400", bgColor: "bg-yellow-900" },
  { value: "urgent", color: "text-red-400", bgColor: "bg-red-900" },
];

// Status sections configuration
const STATUS_SECTIONS: { status: TaskStatus; label: string; color: string }[] = [
  { status: "in_progress", label: "In Progress", color: "bg-yellow-500" },
  { status: "pending", label: "Pending", color: "bg-gray-500" },
  { status: "blocked", label: "Blocked", color: "bg-red-500" },
];

// Status colors for task display
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-gray-800", text: "text-gray-300" },
  in_progress: { bg: "bg-yellow-900", text: "text-yellow-300" },
  blocked: { bg: "bg-red-900", text: "text-red-300" },
  completed: { bg: "bg-green-900", text: "text-green-300" },
  failed: { bg: "bg-red-950", text: "text-red-400" },
  cancelled: { bg: "bg-gray-900", text: "text-gray-500" },
};

interface TaskQueueProps {
  tasks: Task[];
  agents: Agent[];
  maxVisible?: number;
  onTaskClick?: (task: Task) => void;
  onCancelTask?: (taskId: string) => void;
}

export function TaskQueue({
  tasks,
  agents,
  maxVisible = 8,
  onTaskClick,
}: TaskQueueProps) {
  const [expandedSection, setExpandedSection] = useState<TaskStatus | null>("in_progress");

  // Filter out completed/cancelled/failed tasks and group by status
  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "failed" && t.status !== "cancelled"
  );

  const groupedTasks = groupTasksByStatus(activeTasks);

  if (activeTasks.length === 0) {
    return (
      <div className="mb-4">
        <SectionHeader title="Task Queue" />
        <div className="text-xs text-gray-500 p-2 text-center bg-corp-dark rounded">
          No active tasks
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <SectionHeader title="Task Queue" count={activeTasks.length} />
      <div className="space-y-1.5">
        {STATUS_SECTIONS.map(({ status, label, color }) => {
          const sectionTasks = groupedTasks[status] || [];
          if (sectionTasks.length === 0) return null;

          const isExpanded = expandedSection === status;

          return (
            <div key={status} className="bg-corp-dark rounded overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : status)}
                className="w-full flex items-center justify-between p-2 hover:bg-corp-mid transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-xs font-medium text-gray-300">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{sectionTasks.length}</span>
                  <ChevronIcon direction={isExpanded ? "down" : "right"} />
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="border-t border-corp-accent">
                  {sectionTasks.slice(0, maxVisible).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      agent={agents.find((a) => a.id === task.agentId)}
                      onClick={() => onTaskClick?.(task)}
                    />
                  ))}
                  {sectionTasks.length > maxVisible && (
                    <div className="p-2 text-center text-[10px] text-gray-500">
                      +{sectionTasks.length - maxVisible} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Flat list view (alternative to grouped)
export function TaskQueueFlat({
  tasks,
  agents,
  maxVisible = 8,
}: Omit<TaskQueueProps, "onCancelTask">) {
  // Filter out completed/cancelled/failed tasks
  const activeTasks = tasks.filter(
    (t) => t.status !== "completed" && t.status !== "failed" && t.status !== "cancelled"
  );

  return (
    <div className="mb-4">
      <SectionHeader title="Task Queue" />
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {activeTasks.length === 0 ? (
          <div className="text-xs text-gray-500 p-2 text-center">No active tasks</div>
        ) : (
          activeTasks.slice(0, maxVisible).map((task) => {
            const agent = agents.find((a) => a.id === task.agentId);
            const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
            const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === task.priority);

            return (
              <div key={task.id} className="p-2 bg-corp-dark rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium truncate flex-1">{task.title}</div>
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${priorityOption?.bgColor} ${priorityOption?.color}`}
                  >
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">
                    {agent?.name.split(" ")[0] || "Unknown"}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {task.status === "in_progress" ? "working" : task.status}
                  </span>
                </div>
                {/* Progress bar for in-progress tasks */}
                {task.status === "in_progress" &&
                  task.progressPercent !== undefined &&
                  task.progressPercent > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-yellow-400">{task.progressPercent}%</span>
                      </div>
                      <div className="h-1.5 bg-corp-mid rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 transition-all duration-300 ease-out"
                          style={{ width: `${task.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Sub-components

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
      {title}
      {count !== undefined && count > 0 && ` (${count})`}
    </div>
  );
}

function TaskRow({
  task,
  agent,
  onClick,
}: {
  task: Task;
  agent: Agent | undefined;
  onClick?: () => void;
}) {
  const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
  const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === task.priority);

  return (
    <div
      className={`p-2 hover:bg-corp-mid transition-colors ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-medium text-xs truncate flex-1">{task.title}</div>
        <span
          className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${priorityOption?.bgColor} ${priorityOption?.color}`}
        >
          {task.priority}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-gray-500">
          {agent?.name.split(" ")[0] || "Unassigned"}
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] ${statusStyle.bg} ${statusStyle.text}`}
        >
          {task.status === "in_progress" ? "working" : task.status}
        </span>
      </div>
      {/* Progress bar for in-progress tasks */}
      {task.status === "in_progress" &&
        task.progressPercent !== undefined &&
        task.progressPercent > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="text-yellow-400">{task.progressPercent}%</span>
            </div>
            <div className="h-1 bg-corp-mid rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all duration-300 ease-out"
                style={{ width: `${task.progressPercent}%` }}
              />
            </div>
          </div>
        )}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "right" | "down" }) {
  return (
    <svg
      className={`w-3 h-3 text-gray-500 transition-transform ${
        direction === "down" ? "rotate-90" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Utility functions

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  return tasks.reduce(
    (acc, task) => {
      const status = task.status;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(task);
      return acc;
    },
    {} as Record<TaskStatus, Task[]>
  );
}

export default TaskQueue;
