{/* Pencil frame: Chat — Active Conversation (zxlr9) — 1440×960 */}
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

const bulletItems = [
  {
    title: "Platform Reliability",
    desc: "Reduce P0 incidents by 40% through improved monitoring and automated failover.",
  },
  {
    title: "User Onboarding V2",
    desc: "Redesign the first-run experience with guided tours and role-based defaults.",
  },
  {
    title: "API v3 Migration",
    desc: "Deprecate v1 endpoints and migrate all integrations to the new schema by end of Q2.",
  },
  {
    title: "Analytics Dashboard",
    desc: "Ship real-time usage metrics with drill-down views for team leads.",
  },
];

const tableRows = [
  { initiative: "Platform Reliability", timeline: "Apr \u2013 May", status: "On track", statusColor: "#4CAF50" },
  { initiative: "User Onboarding V2", timeline: "May \u2013 Jun", status: "On track", statusColor: "#4CAF50" },
  { initiative: "API v3 Migration", timeline: "Apr \u2013 Jun", status: "Blocked", statusColor: "#FF9800" },
  { initiative: "Analytics Dashboard", timeline: "May \u2013 Jun", status: "On track", statusColor: "#4CAF50" },
];

export default function ChatConversation() {
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

          {/* Chat Panel (messages + input) */}
          <div className="flex flex-col flex-1 min-w-0 h-full justify-between">
            {/* Message Area */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex flex-col gap-6 overflow-y-auto px-10 py-8">
                {/* User Message 1 */}
                <div className="flex gap-4 w-full">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-[var(--black-primary)]">
                    <span className="text-[11px] font-semibold text-white">NK</span>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-[var(--black-primary)]">You</span>
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">10:24 AM</span>
                    </div>
                    <p className="text-[13px] text-[var(--gray-dark)] leading-[1.6]">
                      Can you pull together a summary of the Q2 roadmap priorities? I need to share it with the leadership team before Friday.
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-[var(--border-light)]" />

                {/* Agent Message 1 */}
                <div className="flex gap-4 w-full">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-[var(--red-primary)]">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-[var(--red-primary)]">Assistant</span>
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">10:24 AM</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      <p className="text-[13px] text-[var(--gray-dark)] leading-[1.6]">
                        Here's the Q2 roadmap summary based on the latest planning threads and board items:
                      </p>

                      <h3 className="text-base font-bold text-[var(--black-primary)]">
                        Q2 2026 — Roadmap Priorities
                      </h3>

                      {/* Bullet List */}
                      <div className="flex flex-col gap-2.5 pl-2">
                        {bulletItems.map((item) => (
                          <div key={item.title} className="flex gap-3">
                            <div className="flex items-center justify-center w-[5px] shrink-0 pt-[6px]">
                              <div className="w-[5px] h-[5px] rounded-full bg-[var(--red-primary)]" />
                            </div>
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="text-[13px] font-bold text-[var(--black-primary)]">{item.title}</span>
                              <span className="text-[13px] text-[var(--gray-dark)] leading-[1.5]">{item.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <p className="text-[13px] text-[var(--gray-dark)] leading-[1.6]">
                        I've compiled these into a PDF for easy sharing. Let me know if you'd like to adjust anything before sending it out.
                      </p>

                      {/* File Attachment */}
                      <div className="flex items-center gap-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] py-3.5 px-5">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[#E53935] shrink-0">
                          <span className="font-mono text-[10px] font-bold text-white">PDF</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-medium text-[var(--black-primary)]">Q2-2026-Roadmap-Priorities.pdf</span>
                          <span className="font-mono text-[10px] text-[var(--gray-500)]">PDF · 142 KB</span>
                        </div>
                        <svg className="ml-auto w-4 h-4 text-[var(--gray-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-[var(--border-light)]" />

                {/* User Message 2 */}
                <div className="flex gap-4 w-full">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-[var(--black-primary)]">
                    <span className="text-[11px] font-semibold text-white">NK</span>
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-[var(--black-primary)]">You</span>
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">10:26 AM</span>
                    </div>
                    <p className="text-[13px] text-[var(--gray-dark)] leading-[1.6]">
                      This looks great. Can you also add an estimated timeline for each item? And flag anything that's currently blocked.
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-[var(--border-light)]" />

                {/* Agent Message 2 */}
                <div className="flex gap-4 w-full">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-[var(--red-primary)]">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[13px] font-semibold text-[var(--red-primary)]">Assistant</span>
                      <span className="font-mono text-[10px] text-[var(--gray-500)]">10:27 AM</span>
                    </div>
                    <div className="flex flex-col gap-4">
                      <p className="text-[13px] text-[var(--gray-dark)] leading-[1.6]">
                        Updated with timelines and blockers. Here's the breakdown:
                      </p>

                      {/* Markdown Table */}
                      <div className="w-full rounded-md border border-[var(--border-light)] overflow-hidden">
                        {/* Table Header */}
                        <div className="flex items-center h-10 px-4 bg-[var(--bg-surface)]">
                          <span className="flex-1 text-[11px] font-semibold text-[var(--gray-600)]">Initiative</span>
                          <span className="w-[120px] text-[11px] font-semibold text-[var(--gray-600)]">Timeline</span>
                          <span className="w-[100px] text-[11px] font-semibold text-[var(--gray-600)]">Status</span>
                        </div>
                        {/* Table Rows */}
                        {tableRows.map((row, i) => (
                          <div
                            key={row.initiative}
                            className={`flex items-center h-10 px-4${i < tableRows.length - 1 ? " border-b border-[var(--border-light)]" : ""}`}
                          >
                            <span className="flex-1 text-xs text-[var(--black-primary)]">{row.initiative}</span>
                            <span className="w-[120px] font-mono text-[11px] text-[var(--gray-dark)]">{row.timeline}</span>
                            <div className="flex items-center gap-1.5 w-[100px]">
                              <div
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: row.statusColor }}
                              />
                              <span className="text-[11px]" style={{ color: row.statusColor }}>
                                {row.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Blocker Callout */}
                      <div className="flex gap-3 w-full rounded-md border border-[#FFE082] bg-[#FFF8E1] p-3 px-4">
                        <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#FF9800]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86l-8.58 14.86A1 1 0 002.57 20h18.86a1 1 0 00.86-1.28L13.71 3.86a1 1 0 00-1.72 0z" />
                        </svg>
                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <span className="text-xs font-semibold text-[#E65100]">Blocked: API v3 Migration</span>
                          <span className="text-xs text-[#BF360C] leading-[1.5]">
                            Waiting on the auth team to finalize the new OAuth scope definitions. ETA from their side is April 15.
                          </span>
                        </div>
                      </div>

                      <p className="text-[13px] text-[var(--gray-dark)] leading-[1.6]">
                        I've updated the PDF with timelines included. Want me to draft a Slack message to the leadership channel?
                      </p>
                    </div>
                  </div>
                </div>
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
