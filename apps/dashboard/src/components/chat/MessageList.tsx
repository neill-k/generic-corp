import type { ApiMessage } from "@generic-corp/shared";

interface MessageListProps {
  messages: ApiMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[#999]">
        No messages yet. Start the conversation below.
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4">
      {messages.map((msg) => {
        const isUser = msg.fromAgentId === null;
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                isUser
                  ? "bg-black text-white"
                  : "bg-[#F5F5F5] text-black"
              }`}
            >
              {msg.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
