import { MarkdownContent } from "./MarkdownContent.js";
import type { ApiMessage } from "@generic-corp/shared";

interface MessageListProps {
  messages: ApiMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-[#999]">
        No messages yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {messages.map((msg) => {
        const isUser = msg.fromAgentId === null && msg.toAgentId !== "system";
        const isSystem = msg.toAgentId === "system";
        const isAgent = !isUser && !isSystem;
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                isUser
                  ? "bg-black text-white"
                  : "bg-[#F5F5F5] text-black"
              }`}
            >
              {isAgent || isSystem ? (
                <MarkdownContent content={msg.body} />
              ) : (
                <span className="whitespace-pre-wrap">{msg.body}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
