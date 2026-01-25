import type { Agent, Task, AgentStatus } from "@generic-corp/shared";

interface AgentPanelProps {
  agent: Agent | null;
  currentTask: Task | null;
  onAssignTask: (agentId: string) => void;
  onMessageAgent: (agentId: string) => void;
}

export function AgentPanel({
  agent,
  currentTask,
  onAssignTask,
  onMessageAgent,
}: AgentPanelProps) {
  // If no agent selected, show placeholder
  if (!agent) {
    return (
      <div className="bg-corp-dark rounded-lg p-4 h-full flex items-center justify-center">
        <p className="text-gray-400 text-sm">Select an agent to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-corp-dark rounded-lg p-4 h-full flex flex-col">
      {/* Header: Agent name and status */}
      <div className="flex items-center gap-3 mb-4">
        <AgentAvatar agent={agent} size="lg" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white truncate">{agent.name}</h2>
          <p className="text-gray-400 text-xs">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Current Task */}
      <div className="mb-4">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Current Task
        </h3>
        {currentTask ? (
          <TaskCard task={currentTask} />
        ) : (
          <p className="text-gray-500 text-xs italic">No active task</p>
        )}
      </div>

      {/* Agent Stats */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatCard
          label="Tasks Completed"
          value={agent.stats?.tasksCompleted ?? 0}
        />
        <StatCard
          label="Success Rate"
          value={`${agent.stats?.successRate ?? 0}%`}
        />
        <StatCard
          label="Tokens Used"
          value={formatNumber(agent.stats?.tokensUsed ?? 0)}
        />
        <StatCard
          label="Avg Response"
          value={`${agent.stats?.avgResponseTime ?? 0}s`}
        />
      </div>

      {/* Capabilities */}
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Capabilities
          </h3>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities.slice(0, 6).map((cap) => (
              <span
                key={cap}
                className="px-2 py-0.5 bg-corp-mid rounded text-[10px] text-gray-300"
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

      {/* Tools */}
      {agent.tools && agent.tools.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Available Tools
          </h3>
          <div className="flex flex-wrap gap-1">
            {agent.tools.map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 bg-blue-900/50 rounded text-[10px] text-blue-300"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto flex gap-2 pt-3 border-t border-corp-accent">
        <button
          onClick={() => onAssignTask(agent.id)}
          disabled={agent.status === "working" || agent.status === "offline"}
          className="flex-1 bg-corp-highlight hover:bg-opacity-80 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 px-3 rounded text-xs font-medium transition-colors"
        >
          Assign Task
        </button>
        <button
          onClick={() => onMessageAgent(agent.id)}
          className="flex-1 bg-corp-mid hover:bg-corp-accent text-white py-2 px-3 rounded text-xs font-medium transition-colors"
        >
          Message
        </button>
      </div>
    </div>
  );
}

// Sub-components

function AgentAvatar({
  agent,
  size,
}: {
  agent: Agent;
  size: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  // Generate a consistent color based on the agent name
  const colors = [
    "bg-blue-600",
    "bg-green-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-cyan-600",
    "bg-yellow-600",
    "bg-red-600",
  ];
  const colorIndex =
    agent.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={`${sizeClasses[size]} rounded-full overflow-hidden ${bgColor} flex-shrink-0`}
    >
      {agent.avatarUrl ? (
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold">
          {agent.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const statusConfig: Record<AgentStatus, { color: string; label: string }> = {
    idle: { color: "bg-green-900 text-green-300", label: "Idle" },
    working: { color: "bg-yellow-900 text-yellow-300", label: "Working" },
    blocked: { color: "bg-red-900 text-red-300", label: "Blocked" },
    offline: { color: "bg-gray-800 text-gray-400", label: "Offline" },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`px-2 py-1 rounded text-[10px] font-medium ${config.color}`}
    >
      {config.label}
    </span>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-corp-mid rounded p-3">
      <p className="text-white text-sm font-medium truncate">{task.title}</p>
      <p className="text-gray-400 text-xs mt-1 line-clamp-2">
        {task.description}
      </p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-gray-500">
          Started {formatTimeAgo(task.startedAt)}
        </span>
        {task.progressPercent !== undefined && task.progressPercent > 0 && (
          <span className="text-[10px] text-yellow-400">
            {task.progressPercent}%
          </span>
        )}
      </div>
      {/* Progress bar */}
      {task.progressPercent !== undefined && task.progressPercent > 0 && (
        <div className="mt-2 h-1 bg-corp-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 transition-all duration-300"
            style={{ width: `${task.progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-corp-mid rounded p-2">
      <p className="text-gray-500 text-[10px] uppercase">{label}</p>
      <p className="text-white text-sm font-semibold">{value}</p>
    </div>
  );
}

// Utility functions

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
