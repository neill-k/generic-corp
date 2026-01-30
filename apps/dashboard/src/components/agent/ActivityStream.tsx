import { useActivityStore } from "../../store/activity-store.js";

const EVENT_LABELS: Record<string, string> = {
  thinking: "Thinking",
  tool_use: "Tool Use",
  tool_result: "Tool Result",
  message: "Message",
  result: "Result",
};

export function ActivityStream({ agentId }: { agentId: string }) {
  const entries = useActivityStore((s) =>
    s.entries.filter((e) => e.agentId === agentId),
  );

  if (entries.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-slate-400">
        No live activity yet. Events appear here when the agent is running.
      </p>
    );
  }

  return (
    <div className="max-h-96 space-y-2 overflow-y-auto">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-xs"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold text-slate-600">
              {EVENT_LABELS[entry.event.type] ?? entry.event.type}
            </span>
            <span className="text-slate-400">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-slate-700">
            {"content" in entry.event
              ? entry.event.content
              : "tool" in entry.event
                ? `${entry.event.tool}`
                : ""}
          </p>
        </div>
      ))}
    </div>
  );
}
