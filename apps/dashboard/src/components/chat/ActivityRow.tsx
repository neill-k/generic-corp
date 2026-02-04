import { Loader2, Check, X } from "lucide-react";
import type { StreamingToolCall } from "../../store/chat-store.js";
import { getToolLabel } from "./tool-labels.js";

interface ActivityRowProps {
  toolCall: StreamingToolCall;
}

function getDescription(toolCall: StreamingToolCall): string | null {
  if (!toolCall.input || typeof toolCall.input !== "object") return null;
  const input = toolCall.input as Record<string, unknown>;
  if (typeof input.description === "string") return input.description;
  if (typeof input.query === "string") return input.query;
  if (typeof input.body === "string") return input.body;
  return null;
}

export function ActivityRow({ toolCall }: ActivityRowProps) {
  const isRunning = toolCall.status === "running";
  const label = getToolLabel(toolCall.toolName, toolCall.status);
  const description = getDescription(toolCall);

  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      {isRunning ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[#999]" />
      ) : toolCall.isError ? (
        <X className="h-3.5 w-3.5 shrink-0 text-red-500" />
      ) : (
        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      )}
      <span className={isRunning ? "text-[#666]" : "text-[#999]"}>
        {label}
        {description && (
          <span className="ml-1 text-[#BBB]">— {description}</span>
        )}
      </span>
    </div>
  );
}
