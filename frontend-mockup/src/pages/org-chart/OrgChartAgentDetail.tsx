import AppLayout from "../../components/AppLayout";
import { X, Pause } from "lucide-react";

const tabs = [
  { label: "Status", active: false },
  { label: "Live Activity", active: true },
  { label: "Task History", active: false },
  { label: "Context", active: false },
  { label: "Message", active: false },
  { label: "Config", active: false },
];

export default function OrgChartAgentDetail() {
  return (
    <AppLayout>
      <div className="flex flex-col flex-1 h-full overflow-hidden relative">
        {/* Background org chart content (dimmed) */}
        <div className="absolute inset-0 bg-[var(--bg-page)]" />

        {/* Scrim overlay */}
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
            {tabs.map((tab) => (
              <div
                key={tab.label}
                className="flex items-center justify-center h-full"
                style={{
                  padding: "0 14px",
                  borderBottom: tab.active ? "2px solid var(--red-primary)" : "2px solid transparent",
                }}
              >
                <span
                  className="font-ui text-xs"
                  style={{
                    fontWeight: tab.active ? 500 : 400,
                    color: tab.active ? "var(--black-primary)" : "var(--gray-500)",
                  }}
                >
                  {tab.label}
                </span>
              </div>
            ))}
          </div>

          {/* Tab Content - Live Activity */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden" style={{ padding: "24px 28px" }}>
            {/* Stream Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
                <span className="font-ui text-[13px] font-medium text-[var(--black-primary)]">
                  Live Stream
                </span>
              </div>
              <button
                className="flex items-center gap-1.5 rounded"
                style={{
                  height: 28,
                  padding: "0 12px",
                  border: "1px solid var(--border-light)",
                }}
              >
                <Pause size={12} className="text-[var(--gray-500)]" />
                <span className="font-ui text-[11px] text-[var(--gray-500)]">Pause</span>
              </button>
            </div>

            {/* Event Stream */}
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Event: Thinking */}
              <div className="flex gap-3 py-3">
                <span className="font-mono text-[10px] text-[var(--gray-500)] shrink-0 w-14">
                  10:27:03
                </span>
                <div className="flex flex-col items-center shrink-0" style={{ width: 2 }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#9C27B0" }} />
                  <div className="w-0.5 flex-1 bg-[var(--border-light)]" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div
                    className="inline-flex items-center self-start rounded"
                    style={{ backgroundColor: "#F3E5F5", height: 20, padding: "0 8px" }}
                  >
                    <span className="font-mono text-[10px] font-medium" style={{ color: "#7B1FA2" }}>
                      thinking
                    </span>
                  </div>
                  <p className="font-ui text-xs text-[var(--gray-dark)] leading-6">
                    Analyzing the deployment pipeline configuration and identifying bottlenecks in the CI/CD workflow...
                  </p>
                </div>
              </div>

              {/* Event: Tool Use */}
              <div className="flex gap-3 py-3">
                <span className="font-mono text-[10px] text-[var(--gray-500)] shrink-0 w-14">
                  10:27:05
                </span>
                <div className="flex flex-col items-center shrink-0" style={{ width: 2 }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#1565C0" }} />
                  <div className="w-0.5 flex-1 bg-[var(--border-light)]" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div
                    className="inline-flex items-center self-start rounded"
                    style={{ backgroundColor: "#E3F2FD", height: 20, padding: "0 8px" }}
                  >
                    <span className="font-mono text-[10px] font-medium" style={{ color: "#1565C0" }}>
                      tool_use
                    </span>
                  </div>
                  <div
                    className="flex flex-col rounded-md w-full"
                    style={{ backgroundColor: "#F8F8F8", padding: "8px 12px" }}
                  >
                    <span className="font-mono text-[11px] font-semibold" style={{ color: "#1565C0" }}>
                      run_deployment_check()
                    </span>
                    <span className="font-mono text-[10px] text-[var(--gray-600)] leading-relaxed">
                      {"{ env: \"staging\", service: \"api-gateway\" }"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event: Result */}
              <div className="flex gap-3 py-3">
                <span className="font-mono text-[10px] text-[var(--gray-500)] shrink-0 w-14">
                  10:27:08
                </span>
                <div className="flex flex-col items-center shrink-0" style={{ width: 2 }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#2E7D32" }} />
                  <div className="w-0.5 flex-1 bg-[var(--border-light)]" />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div
                    className="inline-flex items-center self-start rounded"
                    style={{ backgroundColor: "#E8F5E9", height: 20, padding: "0 8px" }}
                  >
                    <span className="font-mono text-[10px] font-medium" style={{ color: "#2E7D32" }}>
                      result
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-1 rounded-md w-full"
                    style={{ backgroundColor: "#F8F8F8", padding: "8px 12px" }}
                  >
                    <span className="font-mono text-[10px] leading-relaxed" style={{ color: "#2E7D32" }}>
                      status: healthy
                    </span>
                    <span className="font-mono text-[10px] text-[var(--gray-dark)] leading-relaxed">
                      latency: 142ms (p99: 380ms)
                    </span>
                    <span className="font-mono text-[10px] text-[var(--gray-dark)] leading-relaxed">
                      uptime: 99.97% (30d)
                    </span>
                    <span className="font-mono text-[10px] text-[var(--gray-dark)] leading-relaxed">
                      error_rate: 0.03%
                    </span>
                  </div>
                </div>
              </div>

              {/* Event: Thinking 2 */}
              <div className="flex gap-3 py-3">
                <span className="font-mono text-[10px] text-[var(--gray-500)] shrink-0 w-14">
                  10:27:09
                </span>
                <div className="flex flex-col items-center shrink-0" style={{ width: 2 }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#9C27B0" }} />
                  <div className="w-0.5 flex-1 bg-[var(--border-light)]" />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div
                    className="inline-flex items-center self-start rounded"
                    style={{ backgroundColor: "#F3E5F5", height: 20, padding: "0 8px" }}
                  >
                    <span className="font-mono text-[10px] font-medium" style={{ color: "#7B1FA2" }}>
                      thinking
                    </span>
                  </div>
                  <p className="font-ui text-xs text-[var(--gray-dark)] leading-6">
                    Deployment health looks good. Drafting a summary report with recommendations for the staging environment optimization...
                  </p>
                </div>
              </div>

              {/* Event: Text Delta */}
              <div className="flex gap-3 py-3">
                <span className="font-mono text-[10px] text-[var(--gray-500)] shrink-0 w-14">
                  10:27:11
                </span>
                <div className="flex flex-col items-center shrink-0" style={{ width: 2 }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "#E53935" }} />
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="inline-flex items-center self-start rounded"
                      style={{ backgroundColor: "#FFEBEE", height: 20, padding: "0 8px" }}
                    >
                      <span className="font-mono text-[10px] font-medium" style={{ color: "#E53935" }}>
                        text_delta
                      </span>
                    </div>
                    <span className="font-mono text-[10px] italic text-[var(--gray-500)]">
                      streaming...
                    </span>
                  </div>
                  <div
                    className="flex flex-col gap-1 rounded-md w-full"
                    style={{
                      backgroundColor: "#FFFBF0",
                      padding: "10px 12px",
                      border: "1px solid #FFE0B2",
                    }}
                  >
                    <span className="font-ui text-[13px] font-bold text-[var(--black-primary)]" style={{ lineHeight: 1.4 }}>
                      ## Staging Deployment Report
                    </span>
                    <p className="font-ui text-xs text-[var(--gray-dark)] leading-6">
                      All services are healthy. The api-gateway shows nominal latency at 142ms with a 99.97% uptime over the past 30 days. Error rate sits at 0.03%, well within acceptable thresholds.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
