import { useGameStore } from "../store/gameStore";
import { useSocket } from "../hooks/useSocket";
import { useState } from "react";

export function Dashboard() {
  const { agents, selectedAgentId, setSelectedAgent, budget, pendingDrafts } =
    useGameStore();
  const { assignTask, approveDraft, rejectDraft } = useSocket();
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  const handleAssignTask = async () => {
    if (!selectedAgentId || !taskTitle.trim()) return;

    const result = await assignTask(
      selectedAgent?.name || "",
      taskTitle,
      taskDescription
    );

    if (result.success) {
      setTaskTitle("");
      setTaskDescription("");
    } else {
      console.error("Failed to assign task:", result.error);
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
          Agents
        </div>
        <div className="space-y-1">
          {agents.map((agent) => (
            <button
              key={agent.id}
              onClick={() =>
                setSelectedAgent(agent.id === selectedAgentId ? null : agent.id)
              }
              className={`w-full p-2 rounded-lg text-left transition-colors ${
                agent.id === selectedAgentId
                  ? "bg-corp-accent"
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

      {/* Selected Agent Panel */}
      {selectedAgent && (
        <div className="mb-4 p-3 bg-corp-dark rounded-lg">
          <div className="text-sm font-semibold mb-2">{selectedAgent.name}</div>
          <div className="text-xs text-gray-400 mb-3">{selectedAgent.role}</div>

          {/* Task Assignment */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Task title..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2 bg-corp-mid border border-corp-accent rounded text-sm focus:outline-none focus:border-corp-highlight"
            />
            <textarea
              placeholder="Description..."
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-corp-mid border border-corp-accent rounded text-sm resize-none focus:outline-none focus:border-corp-highlight"
            />
            <button
              onClick={handleAssignTask}
              disabled={!taskTitle.trim()}
              className="w-full py-2 bg-corp-highlight text-white rounded text-sm font-medium hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Assign Task
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
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApproveDraft(draft.id)}
                    className="flex-1 py-1 bg-green-800 text-green-200 rounded text-xs hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRejectDraft(draft.id)}
                    className="flex-1 py-1 bg-red-900 text-red-200 rounded text-xs hover:bg-red-800"
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
