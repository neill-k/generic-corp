import { useState } from "react";
import { FileText, Loader2, Trash2 } from "lucide-react";

import { api } from "../../lib/api-client.js";
import type { ApiThread } from "@generic-corp/shared";

interface ThreadListProps {
  threads: ApiThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
  onDeleteThread?: (threadId: string) => void;
  onSummaryReceived?: (threadId: string, summary: string) => void;
}

export function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onSummaryReceived,
}: ThreadListProps) {
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);

  const handleGetSummary = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setLoadingSummary(threadId);
    try {
      const result = await api.get<{ summary: string }>(
        `/threads/${threadId}/summary`,
      );
      onSummaryReceived?.(threadId, result.summary);
    } catch (error) {
      console.error("[Chat] Failed to get thread summary:", error);
    } finally {
      setLoadingSummary(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this thread and all its messages?")) {
      onDeleteThread?.(threadId);
    }
  };

  return (
    <div className="flex h-full w-[300px] flex-col border-r border-[#EEE] bg-white">
      <div className="flex h-14 items-center justify-between border-b border-[#EEE] px-5">
        <h3 className="text-[13px] font-medium text-[#666]">Threads</h3>
        <button
          onClick={onNewThread}
          className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#222]"
        >
          New Thread
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <div className="px-5 py-6 text-xs text-[#999]">
            <p>No conversations yet</p>
            <p className="mt-2 text-[#BBB]">Click "New Thread" to start a conversation with the CEO agent. Try asking for a standup report or delegating a task.</p>
          </div>
        )}
        {threads.map((thread) => {
          const isActive = thread.threadId === activeThreadId;
          const isSummarizing = loadingSummary === thread.threadId;

          return (
            <div
              key={thread.threadId}
              className={`group relative w-full border-b border-[#EEE] ${
                isActive ? "bg-[#F5F5F5]" : "hover:bg-[#FAFAFA]"
              }`}
            >
              <button
                onClick={() => onSelectThread(thread.threadId)}
                className="block w-full px-5 py-4 pr-16 text-left text-sm"
              >
                <span className={`block truncate font-medium ${isActive ? "text-black" : "text-[#222]"}`}>
                  {thread.agentName}
                </span>
                <span className="block truncate text-xs text-[#999]">{thread.preview}</span>
              </button>

              {/* Action buttons */}
              <div className={`absolute right-2 top-3 flex items-center gap-0.5 transition-opacity ${
                isSummarizing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}>
                <button
                  onClick={(e) => handleGetSummary(e, thread.threadId)}
                  disabled={isSummarizing}
                  className={`rounded p-1 ${
                    isActive
                      ? "text-[#999] hover:bg-[#EEE] hover:text-[#666]"
                      : "text-[#CCC] hover:bg-[#F5F5F5] hover:text-[#999]"
                  }`}
                  title="Get thread summary"
                >
                  {isSummarizing ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <FileText size={12} />
                  )}
                </button>
                <button
                  onClick={(e) => handleDelete(e, thread.threadId)}
                  className="rounded p-1 text-[#CCC] hover:bg-red-50 hover:text-red-500"
                  title="Delete thread"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
