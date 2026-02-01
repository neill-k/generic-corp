{/* Pencil frame: Chat (yCWGG) — 1440×960 */}
import AppLayout from "../../components/AppLayout";

const threads = [
  {
    id: 1,
    title: "Project kickoff discussion",
    time: "2 min ago",
    messages: "12 messages",
    preview: "Let's align on the Q2 roadmap priorities and...",
    active: true,
  },
  {
    id: 2,
    title: "API integration review",
    time: "1 hour ago",
    messages: "8 messages",
    preview: "The new endpoints are ready for testing...",
    active: false,
  },
  {
    id: 3,
    title: "Design system updates",
    time: "Yesterday",
    messages: "5 messages",
    preview: "Updated the color tokens and component...",
    active: false,
  },
  {
    id: 4,
    title: "Hiring pipeline status",
    time: "2 days ago",
    messages: "3 messages",
    preview: null,
    active: false,
  },
  {
    id: 5,
    title: "Sprint retrospective notes",
    time: "3 days ago",
    messages: "7 messages",
    preview: null,
    active: false,
  },
];

const suggestedPrompts = [
  ["Summarize recent threads", "Show team updates"],
  ["Draft a project brief", "Review board status"],
];

export default function Chat() {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center h-16 shrink-0 px-8 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[var(--red-primary)]" />
            <h1 className="text-xl font-semibold text-[var(--black-primary)]">
              Chat
            </h1>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex flex-1 min-h-0">
          {/* Thread Panel */}
          <div className="flex flex-col w-[300px] shrink-0 h-full border-r border-[var(--border-light)]">
            {/* Thread Header */}
            <div className="flex items-center justify-between h-14 shrink-0 px-5 border-b border-[var(--border-light)]">
              <span className="text-[13px] font-medium text-[var(--gray-600)]">
                Threads
              </span>
              <button className="flex items-center gap-2 h-8 px-4 bg-[var(--black-primary)] text-white">
                <span className="text-sm">+</span>
                <span className="text-xs font-medium">New Thread</span>
              </button>
            </div>

            {/* Thread List */}
            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
              {threads.map((thread) =>
                thread.active ? (
                  <div
                    key={thread.id}
                    className="flex bg-[var(--bg-surface)] border-b border-[var(--border-light)] overflow-hidden"
                  >
                    <div className="w-[3px] shrink-0 bg-[var(--red-primary)]" />
                    <div className="flex flex-col gap-1 py-4 px-5 min-w-0">
                      <span className="text-[13px] font-medium text-[var(--black-primary)]">
                        {thread.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[var(--gray-500)]">
                          {thread.time}
                        </span>
                        <span className="w-[3px] h-[3px] rounded-full bg-[var(--gray-300)]" />
                        <span className="font-mono text-[10px] text-[var(--gray-500)]">
                          {thread.messages}
                        </span>
                      </div>
                      {thread.preview && (
                        <span className="text-[11px] text-[var(--gray-500)] truncate">
                          {thread.preview}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    key={thread.id}
                    className="flex flex-col gap-1 py-4 px-5 border-b border-[var(--border-light)] overflow-hidden"
                  >
                    <span className="text-[13px] font-medium text-[var(--black-primary)]">
                      {thread.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">
                        {thread.time}
                      </span>
                      <span className="w-[3px] h-[3px] rounded-full bg-[var(--gray-300)]" />
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">
                        {thread.messages}
                      </span>
                    </div>
                    {thread.preview && (
                      <span className="text-[11px] text-[var(--gray-500)] truncate">
                        {thread.preview}
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Chat Panel (empty state + input) */}
          <div className="flex flex-col flex-1 min-w-0 h-full justify-between">
            {/* Message Area — Empty State */}
            <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-[60px] py-10">
              {/* Empty State */}
              <div className="flex flex-col items-center gap-6">
                <div className="w-3 h-3 rounded-full bg-[var(--red-primary)]" />
                <h2 className="text-xl font-semibold text-[var(--black-primary)]">
                  Start a conversation
                </h2>
                <p className="text-[13px] text-[var(--gray-500)] text-center max-w-[400px]">
                  Select a thread or start a new one to begin chatting with the
                  AI assistant.
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="flex flex-col items-center gap-4">
                <span className="font-mono text-[11px] text-[var(--gray-500)]">
                  Suggested prompts
                </span>
                {suggestedPrompts.map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {row.map((prompt) => (
                      <button
                        key={prompt}
                        className="flex items-center h-9 px-5 text-xs text-[var(--black-primary)] border border-[var(--border-light)]"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="flex flex-col gap-2 px-6 py-4 border-t border-[var(--border-light)] shrink-0">
              <div className="flex items-center gap-3 h-12 px-4 rounded border border-[var(--border-light)]">
                <span className="flex-1 text-[13px] text-[var(--gray-500)]">
                  Type a message...
                </span>
                <button className="flex items-center justify-center w-8 h-8 rounded bg-[var(--black-primary)] text-white text-base font-medium">
                  ↑
                </button>
              </div>
              <span className="font-mono text-[10px] text-[var(--gray-500)]">
                Press Enter to send · Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
