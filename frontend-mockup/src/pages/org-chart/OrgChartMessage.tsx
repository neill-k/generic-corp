import AppLayout from "../../components/AppLayout";
import AgentDetailModal from "./AgentDetailModal";
import { Send } from "lucide-react";

const messages = [
  {
    name: "You",
    initials: "Y",
    avatarBg: "#E3F2FD",
    initialsColor: "#1565C0",
    time: "10:14 AM",
    text: "Can you review the staging deployment pipeline and check if there are any bottlenecks? Generate a report when done.",
  },
  {
    name: "Marcus Rivera",
    initials: "MR",
    avatarBg: "var(--black-primary)",
    initialsColor: "#FFFFFF",
    time: "10:14 AM",
    text: "Got it. I'll run a full deployment check on the staging environment and analyze the CI/CD pipeline configuration. I'll have a report ready shortly.",
  },
  {
    name: "Marcus Rivera",
    initials: "MR",
    avatarBg: "var(--black-primary)",
    initialsColor: "#FFFFFF",
    time: "10:27 AM",
    text: "Report complete. All services healthy \u2014 api-gateway at 142ms latency, 99.97% uptime. I've attached the full staging deployment report to the thread.",
  },
];

const hints = ["Assign task", "Ask question", "Request report"];

export default function OrgChartMessage() {
  return (
    <AppLayout>
      <AgentDetailModal activeTab="Message">
        {/* Message Header */}
        <div className="flex items-center justify-between">
          <span className="font-ui text-sm font-semibold text-[var(--black-primary)]">
            Direct Message
          </span>
          <span className="font-ui text-[11px] text-[var(--gray-500)]">
            Send a task or instruction directly
          </span>
        </div>

        {/* Message History */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className="flex gap-2.5">
              <div
                className="flex items-center justify-center shrink-0 rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: msg.avatarBg,
                }}
              >
                <span
                  className="font-ui font-semibold"
                  style={{
                    fontSize: msg.initials.length > 1 ? 9 : 11,
                    color: msg.initialsColor,
                  }}
                >
                  {msg.initials}
                </span>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-ui text-xs font-medium text-[var(--black-primary)]">
                    {msg.name}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--gray-500)]">
                    {msg.time}
                  </span>
                </div>
                <p className="font-ui text-xs text-[var(--gray-dark)] leading-6">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="flex flex-col gap-2 shrink-0">
          <div
            className="flex items-center gap-2 rounded-lg"
            style={{ padding: "12px 16px", border: "1px solid var(--border-light)" }}
          >
            <span className="font-ui text-xs text-[var(--gray-500)] flex-1">
              Send a message to Marcus Rivera...
            </span>
            <button
              className="flex items-center gap-1.5 rounded-md shrink-0"
              style={{
                backgroundColor: "var(--black-primary)",
                padding: "8px 16px",
              }}
            >
              <Send size={12} className="text-white" />
              <span className="font-ui text-[11px] font-medium text-white">Send</span>
            </button>
          </div>
          <div className="flex gap-2">
            {hints.map((hint) => (
              <div
                key={hint}
                className="flex items-center rounded-full"
                style={{ padding: "4px 10px", border: "1px solid var(--border-light)" }}
              >
                <span className="font-ui text-[10px] text-[var(--gray-500)]">{hint}</span>
              </div>
            ))}
          </div>
        </div>
      </AgentDetailModal>
    </AppLayout>
  );
}
