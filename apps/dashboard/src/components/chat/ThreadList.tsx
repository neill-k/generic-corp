import type { ApiThread } from "@generic-corp/shared";

interface ThreadListProps {
  threads: ApiThread[];
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => void;
}

export function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
}: ThreadListProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        <h3 className="text-sm font-semibold text-slate-700">Threads</h3>
        <button
          onClick={onNewThread}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
        >
          New
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.length === 0 && (
          <p className="px-3 py-4 text-xs text-slate-400">No conversations yet</p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.threadId}
            onClick={() => onSelectThread(thread.threadId)}
            className={`block w-full px-3 py-2 text-left text-sm ${
              thread.threadId === activeThreadId
                ? "bg-blue-50 text-blue-700"
                : "text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="block truncate font-medium">{thread.agentName}</span>
            <span className="block truncate text-xs text-slate-500">{thread.preview}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
