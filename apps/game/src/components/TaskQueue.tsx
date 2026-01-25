import { useState, useMemo } from "react";
import type { Task, TaskStatus, Agent, TaskPriority } from "@generic-corp/shared";

interface TaskQueueProps {
  tasks: Task[];
  agents: Agent[];
  onTaskClick: (task: Task) => void;
  onCancelTask: (taskId: string) => void;
}

export function TaskQueue({
  tasks,
  agents,
  onTaskClick,
  onCancelTask,
}: TaskQueueProps) {
  const [expandedSection, setExpandedSection] = useState<TaskStatus | null>(
    "in_progress"
  );

  // Memoize expensive task grouping and sorting computation
  // Only recalculates when tasks array changes
  const groupedTasks = useMemo(() => groupTasksByStatus(tasks), [tasks]);

  const sections: { status: TaskStatus; label: string; color: string }[] = [
    { status: "in_progress", label: "In Progress", color: "bg-yellow-500" },
    { status: "pending", label: "Pending", color: "bg-gray-500" },
    { status: "blocked", label: "Blocked", color: "bg-red-500" },
    { status: "completed", label: "Completed", color: "bg-green-500" },
    { status: "failed", label: "Failed", color: "bg-red-700" },
  ];

  return (
    <div className="bg-corp-dark rounded-lg p-3 h-full overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-white">Task Queue</h2>
        <span className="text-[10px] text-gray-500">
          {tasks.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1">
        {sections.map(({ status, label, color }) => {
          const sectionTasks = groupedTasks[status] || [];
          const isExpanded = expandedSection === status;

          return (
            <div key={status} className="border border-corp-accent rounded">
              {/* Section Header */}
              <button
                onClick={() =>
                  setExpandedSection(isExpanded ? null : status)
                }
                className="w-full flex items-center justify-between p-2 hover:bg-corp-mid transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${color}`} />
                  <span className="text-white text-xs font-medium">
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">
                    {sectionTasks.length}
                  </span>
                  <ChevronIcon direction={isExpanded ? "down" : "right"} />
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && sectionTasks.length > 0 && (
                <div className="border-t border-corp-accent">
                  {sectionTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      agent={agents.find((a) => a.id === task.agentId)}
                      onClick={() => onTaskClick(task)}
                      onCancel={() => onCancelTask(task.id)}
                    />
                  ))}
                </div>
              )}

              {isExpanded && sectionTasks.length === 0 && (
                <div className="p-2 text-gray-500 text-[10px] italic border-t border-corp-accent">
                  No tasks
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-components

interface TaskRowProps {
  task: Task;
  agent: Agent | undefined;
  onClick: () => void;
  onCancel: () => void;
}

function TaskRow({ task, agent, onClick, onCancel }: TaskRowProps) {
  return (
    <div
      className="flex items-center gap-2 p-2 hover:bg-corp-mid cursor-pointer group transition-colors"
      onClick={onClick}
    >
      {/* Priority indicator */}
      <PriorityIndicator priority={task.priority} />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          {agent && <span>{agent.name.split(" ")[0]}</span>}
          {task.deadline && <span>Due {formatDate(task.deadline)}</span>}
        </div>
      </div>

      {/* Progress for in-progress tasks */}
      {task.status === "in_progress" &&
        task.progressPercent !== undefined &&
        task.progressPercent > 0 && (
          <span className="text-[10px] text-yellow-400 font-medium">
            {task.progressPercent}%
          </span>
        )}

      {/* Cancel button (only for pending/in_progress) */}
      {(task.status === "pending" || task.status === "in_progress") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-1 transition-opacity"
          title="Cancel task"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}

function PriorityIndicator({ priority }: { priority: TaskPriority }) {
  const colors: Record<TaskPriority, string> = {
    urgent: "bg-red-500",
    high: "bg-orange-500",
    normal: "bg-blue-500",
    low: "bg-gray-500",
  };

  return (
    <div
      className={`w-0.5 h-6 rounded ${colors[priority] || colors.normal}`}
      title={`Priority: ${priority}`}
    />
  );
}

function ChevronIcon({ direction }: { direction: "right" | "down" }) {
  return (
    <svg
      className={`w-3 h-3 text-gray-400 transform transition-transform ${
        direction === "down" ? "rotate-90" : ""
      }`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// Utility functions

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    pending: [],
    in_progress: [],
    blocked: [],
    completed: [],
    failed: [],
    cancelled: [],
  };

  for (const task of tasks) {
    if (groups[task.status]) {
      groups[task.status].push(task);
    }
  }

  // Sort each group by priority (urgent first)
  const priorityOrder: Record<TaskPriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  for (const status of Object.keys(groups) as TaskStatus[]) {
    groups[status].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  return groups;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor(
    (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  return d.toLocaleDateString();
}
