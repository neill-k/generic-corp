interface TaskSummary {
  id: string;
  prompt: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  costUsd: number | null;
  durationMs: number | null;
}

interface TaskHistoryProps {
  tasks: TaskSummary[];
  isLoading: boolean;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  running: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  blocked: "bg-orange-100 text-orange-700",
};

export function TaskHistory({ tasks, isLoading }: TaskHistoryProps) {
  if (isLoading) {
    return <p className="text-xs text-slate-400">Loading tasks...</p>;
  }

  if (tasks.length === 0) {
    return <p className="text-xs text-slate-400">No tasks assigned yet.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded border border-slate-200 bg-white px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <p className="truncate text-sm text-slate-800">{task.prompt}</p>
            <span
              className={`ml-2 rounded px-2 py-0.5 text-xs ${STATUS_BADGE[task.status] ?? "bg-slate-100 text-slate-600"}`}
            >
              {task.status}
            </span>
          </div>
          <div className="mt-1 flex gap-3 text-xs text-slate-400">
            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
            {task.costUsd != null && (
              <span>${task.costUsd.toFixed(4)}</span>
            )}
            {task.durationMs != null && (
              <span>{(task.durationMs / 1000).toFixed(1)}s</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
