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
      <p className="py-4 text-center text-xs text-[#999]">
        No live activity yet. Events appear here when the agent is running.
      </p>
    );
  }

  return (
    <div className="max-h-96 space-y-2 overflow-y-auto">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="rounded border border-[#EEE] bg-[#F5F5F5] px-3 py-2 text-xs"
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="font-semibold text-[#666]">
              {EVENT_LABELS[entry.event.type] ?? entry.event.type}
            </span>
            <span className="text-[#999]">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-black">
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
