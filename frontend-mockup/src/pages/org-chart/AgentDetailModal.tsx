import type { ReactNode } from "react";
import { X } from "lucide-react";

const allTabs = ["Status", "Live Activity", "Task History", "Context", "Message", "Config"];

export default function AgentDetailModal({
  activeTab,
  children,
}: {
  activeTab: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden relative">
      {/* Background */}
      <div className="absolute inset-0 bg-[var(--bg-page)]" />
      {/* Scrim */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.31)" }} />

      {/* Modal */}
      <div
        className="absolute bg-white flex flex-col overflow-hidden"
        style={{
          left: "50%",
          top: 130,
          transform: "translateX(-50%)",
          width: 720,
          height: 700,
          borderRadius: 12,
          boxShadow: "0 8px 40px rgba(0,0,0,0.125)",
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            height: 80,
            padding: "0 28px",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "var(--black-primary)",
              }}
            >
              <span className="text-white font-ui text-sm font-semibold">MR</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-ui text-base font-semibold text-[var(--black-primary)]">
                Marcus Rivera
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-[var(--gray-500)]">
                  VP Engineering
                </span>
                <div
                  className="flex items-center gap-1.5 rounded-full"
                  style={{
                    backgroundColor: "#E8F5E9",
                    height: 20,
                    padding: "0 10px",
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4CAF50]" />
                  <span className="font-ui text-[10px] font-medium" style={{ color: "#2E7D32" }}>
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            className="flex items-center justify-center shrink-0 rounded-md"
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--border-light)",
            }}
          >
            <X size={16} className="text-[var(--gray-500)]" />
          </button>
        </div>

        {/* Tab Bar */}
        <div
          className="flex items-end shrink-0"
          style={{
            height: 44,
            padding: "0 28px",
            borderBottom: "1px solid var(--border-light)",
          }}
        >
          {allTabs.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <div
                key={tab}
                className="flex items-center justify-center h-full"
                style={{
                  padding: "0 14px",
                  borderBottom: isActive ? "2px solid var(--red-primary)" : "2px solid transparent",
                }}
              >
                <span
                  className="font-ui text-xs"
                  style={{
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? "var(--black-primary)" : "var(--gray-500)",
                  }}
                >
                  {tab}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden" style={{ padding: "24px 28px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
