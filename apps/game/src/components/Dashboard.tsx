import { useGameStore } from "../store/gameStore";
import { useSocket } from "../hooks/useSocket";
import { useState } from "react";
import type { TaskPriority } from "@generic-corp/shared";

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

export function Dashboard() {
  const { agents, selectedAgentId, setSelectedAgent, budget, pendingDrafts, tasks } =
    useGameStore();
  const { assignTask, approveDraft, rejectDraft } = useSocket();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("normal");
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Get tasks for selected agent
  const agentTasks = selectedAgent
    ? tasks.filter((t) => t.agentId === selectedAgent.id)
    : [];

  const handleAssignTask = async () => {
    if (!selectedAgentId || !taskTitle.trim()) return;

    setIsAssigning(true);
    setError(null);

    try {
      const result = await assignTask(
        selectedAgent?.name || "",
        taskTitle,
        taskDescription,
        taskPriority
      );

      if (result.success) {
        setTaskTitle("");
        setTaskDescription("");
        setTaskPriority("normal");
      } else {
        setError(result.error || "Failed to assign task");
      }
    } catch (err) {
      setError("An error occurred while assigning the task");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleApproveDraft = async (draftId: string) => {
    await approveDraft(draftId);
  };

  const handleRejectDraft = async (draftId: string) => {
    await rejectDraft(draftId, "Rejected by player");
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 border-b border-corp-accent">
      {/* Budget Display */}
      <div className="mb-4 p-3 bg-corp-dark rounded-lg">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
          Budget
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold text-corp-highlight">
            ${budget.remaining.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">/ ${budget.limit}</div>
        </div>
        <div className="mt-2 h-2 bg-corp-mid rounded-full overflow-hidden">
          <div
            className="h-full bg-corp-highlight transition-all duration-300"
            style={{ width: `${(budget.remaining / budget.limit) * 100}%` }}
          />
        </div>
      </div>

      {/* Agent List */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Agents ({agents.length})
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() =>
                setSelectedAgent(agent.id === selectedAgentId ? null : agent.id)
              }
              className={`w-full p-2 rounded-lg text-left transition-colors ${
                agent.id === selectedAgentId
                  ? "bg-corp-accent ring-1 ring-corp-highlight"
                  : "bg-corp-dark hover:bg-corp-mid"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{agent.name}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    agent.status === "idle"
                      ? "bg-green-900 text-green-300"
                      : agent.status === "working"
                      ? "bg-yellow-900 text-yellow-300"
                      : agent.status === "blocked"
                      ? "bg-red-900 text-red-300"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  {agent.status}
                </span>
              </div>
              <div className="text-xs text-gray-500">{agent.role}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Task Queue */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
          Task Queue
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {tasks.filter((t) => t.status !== "completed" && t.status !== "failed" && t.status !== "cancelled").length === 0 ? (
            <div className="text-xs text-gray-500 p-2 text-center">No active tasks</div>
          ) : (
            tasks
              .filter((t) => t.status !== "completed" && t.status !== "failed" && t.status !== "cancelled")
              .slice(0, 8)
              .map((task) => {
                const agent = agents.find((a) => a.id === task.agentId);
                const statusStyle = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
                const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === task.priority);

                return (
                  <div
                    key={task.id}
                    className="p-2 bg-corp-dark rounded text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium truncate flex-1">{task.title}</div>
                      <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${priorityOption?.bgColor} ${priorityOption?.color}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{agent?.name.split(" ")[0] || "Unknown"}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusStyle.bg} ${statusStyle.text}`}>
                        {task.status === "in_progress" ? "working" : task.status}
                      </span>
                    </div>
                    {/* Progress bar for in-progress tasks */}
                    {task.status === "in_progress" && task.progressPercent !== undefined && task.progressPercent > 0 && (
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

      {/* Selected Agent Panel */}
      {selectedAgent && (
        <div className="mb-4 p-3 bg-corp-dark rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">{selectedAgent.name}</div>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                selectedAgent.status === "idle"
                  ? "bg-green-900 text-green-300"
                  : selectedAgent.status === "working"
                  ? "bg-yellow-900 text-yellow-300"
                  : selectedAgent.status === "blocked"
                  ? "bg-red-900 text-red-300"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              {selectedAgent.status}
            </span>
          </div>
          <div className="text-xs text-gray-400 mb-3">{selectedAgent.role}</div>

          {/* Capabilities */}
          {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
                Capabilities
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedAgent.capabilities.slice(0, 6).map((cap) => (
                  <span
                    key={cap}
                    className="px-2 py-0.5 bg-corp-mid text-[10px] text-gray-300 rounded"
                  >
                    {cap.replace(/_/g, " ")}
                  </span>
                ))}
                {selectedAgent.capabilities.length > 6 && (
                  <span className="px-2 py-0.5 text-[10px] text-gray-500">
                    +{selectedAgent.capabilities.length - 6} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Permissions */}
          {selectedAgent.toolPermissions && Object.keys(selectedAgent.toolPermissions).length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
                Permissions
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(selectedAgent.toolPermissions)
                  .filter(([_, allowed]) => allowed)
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
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
                Agent Tasks ({agentTasks.length})
              </div>
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
            <div className="text-[10px] text-gray-500 uppercase tracking-wide">
              Assign New Task
            </div>

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
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">
                Priority
              </div>
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
                  <span className="animate-spin">⟳</span>
                  Assigning...
                </>
              ) : (
                "Assign Task"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Pending Drafts */}
      {pendingDrafts.length > 0 && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <div className="text-xs text-yellow-400 uppercase tracking-wide mb-2">
            Pending Approval ({pendingDrafts.length})
          </div>
          <div className="space-y-2">
            {pendingDrafts.slice(0, 3).map((draft) => (
              <div key={draft.id} className="p-2 bg-corp-dark rounded">
                <div className="text-xs text-gray-400 mb-1">
                  {draft.subject}
                </div>
                <div className="text-xs text-gray-500 truncate mb-2">
                  {draft.body}
                </div>
                {draft.externalRecipient && (
                  <div className="text-[10px] text-gray-600 mb-2">
                    To: {draft.externalRecipient}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDraft(draft.id)}
                    className="flex-1 py-1 bg-green-800 text-green-200 rounded text-xs hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectDraft(draft.id)}
                    className="flex-1 py-1 bg-red-900 text-red-200 rounded text-xs hover:bg-red-800 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
