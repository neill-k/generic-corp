import { useState } from "react";
import type { Agent, Task, TaskPriority } from "@generic-corp/shared";

// Priority options with colors
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; bgColor: string }[] = [
  { value: "low", label: "Low", color: "text-gray-400", bgColor: "bg-gray-700" },
  { value: "normal", label: "Normal", color: "text-blue-400", bgColor: "bg-blue-900" },
  { value: "high", label: "High", color: "text-yellow-400", bgColor: "bg-yellow-900" },
  { value: "urgent", label: "Urgent", color: "text-red-400", bgColor: "bg-red-900" },
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

interface AgentPanelProps {
  agent: Agent | null;
  tasks: Task[];
  onAssignTask: (title: string, description: string, priority: TaskPriority) => Promise<{ success: boolean; error?: string }>;
}

export function AgentPanel({ agent, tasks, onAssignTask }: AgentPanelProps) {
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("normal");
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tasks for this agent
  const agentTasks = agent ? tasks.filter((t) => t.agentId === agent.id) : [];

  const handleAssignTask = async () => {
    if (!agent || !taskTitle.trim()) return;

    setIsAssigning(true);
    setError(null);

    try {
      const result = await onAssignTask(taskTitle, taskDescription, taskPriority);

      if (result.success) {
        setTaskTitle("");
        setTaskDescription("");
        setTaskPriority("normal");
      } else {
        setError(result.error || "Failed to assign task");
      }
    } catch {
      setError("An error occurred while assigning the task");
    } finally {
      setIsAssigning(false);
    }
  };

  if (!agent) {
    return (
      <div className="p-3 bg-corp-dark rounded-lg text-center">
        <p className="text-gray-400 text-sm">Select an agent to view details</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-corp-dark rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold">{agent.name}</div>
        <StatusBadge status={agent.status} />
      </div>
      <div className="text-xs text-gray-400 mb-3">{agent.role}</div>

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="mb-3">
          <SectionLabel>Capabilities</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 6).map((cap) => (
              <span
                key={cap}
                className="px-2 py-0.5 bg-corp-mid text-[10px] text-gray-300 rounded"
              >
                {cap.replace(/_/g, " ")}
              </span>
            ))}
            {agent.capabilities.length > 6 && (
              <span className="px-2 py-0.5 text-[10px] text-gray-500">
                +{agent.capabilities.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Permissions */}
      {agent.toolPermissions && Object.keys(agent.toolPermissions).length > 0 && (
        <div className="mb-3">
          <SectionLabel>Permissions</SectionLabel>
          <div className="flex flex-wrap gap-1">
            {Object.entries(agent.toolPermissions)
              .filter(([, allowed]) => allowed)
              .slice(0, 5)
              .map(([permission]) => (
                <span
                  key={permission}
                  className="px-2 py-0.5 bg-green-900/50 text-[10px] text-green-300 rounded"
                >
                  {permission.replace(/_/g, " ")}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Agent's Tasks */}
      {agentTasks.length > 0 && (
        <div className="mb-3">
          <SectionLabel>Agent Tasks ({agentTasks.length})</SectionLabel>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {agentTasks.slice(0, 3).map((task) => {
              const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between text-[10px] p-1.5 bg-corp-mid rounded"
                >
                  <span className="truncate flex-1">{task.title}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                    {task.status === "in_progress" ? "working" : task.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Task Assignment */}
      <div className="space-y-2 pt-2 border-t border-corp-accent">
        <SectionLabel>Assign New Task</SectionLabel>

        {error && (
          <div className="p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Task title..."
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          disabled={isAssigning}
          className="w-full px-3 py-2 bg-corp-mid border border-corp-accent rounded text-sm focus:outline-none focus:border-corp-highlight disabled:opacity-50"
        />

        <textarea
          placeholder="Description..."
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          disabled={isAssigning}
          rows={2}
          className="w-full px-3 py-2 bg-corp-mid border border-corp-accent rounded text-sm resize-none focus:outline-none focus:border-corp-highlight disabled:opacity-50"
        />

        {/* Priority Selector */}
        <div>
          <SectionLabel>Priority</SectionLabel>
          <div className="flex gap-1">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setTaskPriority(option.value)}
                disabled={isAssigning}
                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-all ${
                  taskPriority === option.value
                    ? `${option.bgColor} ${option.color} ring-1 ring-current`
                    : "bg-corp-mid text-gray-400 hover:bg-corp-accent"
                } disabled:opacity-50`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleAssignTask}
          disabled={!taskTitle.trim() || isAssigning}
          className="w-full py-2 bg-corp-highlight text-white rounded text-sm font-medium hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isAssigning ? (
            <>
              <span className="animate-spin">&#8635;</span>
              Assigning...
            </>
          ) : (
            "Assign Task"
          )}
        </button>
      </div>
    </div>
  );
}

// Sub-components

function StatusBadge({ status }: { status: string }) {
  const getStatusClasses = (status: string) => {
    switch (status) {
      case "idle":
        return "bg-green-900 text-green-300";
      case "working":
        return "bg-yellow-900 text-yellow-300";
      case "blocked":
        return "bg-red-900 text-red-300";
      default:
        return "bg-gray-800 text-gray-400";
    }
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded ${getStatusClasses(status)}`}>
      {status}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
      {children}
    </div>
  );
}

export default AgentPanel;
