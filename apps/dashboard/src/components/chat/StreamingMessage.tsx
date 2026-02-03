import type { StreamingMessage as StreamingMessageState } from "../../store/chat-store.js";
import { ToolCallChip } from "./ToolCallChip.js";

interface StreamingMessageProps {
  message: StreamingMessageState;
}

export function StreamingMessage({ message }: StreamingMessageProps) {
  const hasText = message.text.length > 0;
  const hasToolCalls = message.toolCalls.length > 0;
  const showThinking = message.isThinking && !hasText && !hasToolCalls;

  return (
    <div className="flex justify-start px-4 pb-3">
      <div className="max-w-[70%] space-y-2">
        {/* Thinking indicator */}
        {showThinking && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-[#999]">
            <span className="flex gap-0.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#999]" style={{ animationDelay: "0ms" }} />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#999]" style={{ animationDelay: "150ms" }} />
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#999]" style={{ animationDelay: "300ms" }} />
            </span>
            <span className="text-xs">Thinking</span>
          </div>
        )}

        {/* Tool calls */}
        {hasToolCalls && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc) => (
              <ToolCallChip key={tc.toolUseId} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Streaming text */}
        {hasText && (
          <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-black">
            <span className="whitespace-pre-wrap">{message.text}</span>
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-black" />
            )}
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Error: {message.error}
          </div>
        )}
      </div>
    </div>
  );
}
