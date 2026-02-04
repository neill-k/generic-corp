import type { StreamingToolCall } from "../../store/chat-store.js";

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  delegate_task: "Delegating task",
  get_task: "Checking task",
  list_tasks: "Listing tasks",
  query_board: "Searching board",
  post_board_item: "Posting to board",
  send_message: "Sending message",
  get_my_org: "Checking org",
  list_agents: "Listing agents",
  get_agent_status: "Checking agent",
  create_agent: "Creating agent",
  update_agent: "Updating agent",
  read_messages: "Reading messages",
  list_threads: "Listing threads",
};

function getToolLabel(toolName: string, status: "running" | "complete"): string {
  const base = TOOL_DISPLAY_NAMES[toolName] ?? toolName;
  if (status === "complete") {
    const done = base.replace(/ing\b/, "ed").replace(/Listing/, "Listed").replace(/Checking/, "Checked").replace(/Searching/, "Searched");
    return done;
  }
  return `${base}...`;
}

interface ToolCallChipProps {
  toolCall: StreamingToolCall;
}

export function ToolCallChip({ toolCall }: ToolCallChipProps) {
  const isRunning = toolCall.status === "running";
  const label = getToolLabel(toolCall.toolName, toolCall.status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isRunning
          ? "bg-amber-50 text-amber-700"
          : toolCall.isError
            ? "bg-red-50 text-red-700"
            : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {isRunning ? (
        <span className="inline-block h-2 w-2 animate-spin rounded-full border border-amber-400 border-t-transparent" />
      ) : toolCall.isError ? (
        <span className="text-[10px]">&#x2717;</span>
      ) : (
        <span className="text-[10px]">&#x2713;</span>
      )}
      {label}
    </span>
  );
}
