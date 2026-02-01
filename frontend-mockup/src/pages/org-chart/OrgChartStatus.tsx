import AppLayout from "../../components/AppLayout";
import AgentDetailModal from "./AgentDetailModal";

const stats = [
  { label: "Uptime", value: "4h 23m" },
  { label: "Tasks Completed", value: "17" },
  { label: "Spend Today", value: "$2.41" },
];

const queueItems = [
  { text: "Audit error logs from production API gateway", priority: "P2", priBg: "#FFF3E0", priColor: "#E65100" },
  { text: "Update onboarding documentation for new hires", priority: "P3", priBg: "#E3F2FD", priColor: "#1565C0" },
  { text: "Respond to Sarah's question about infra budget", priority: "P3", priBg: "#E3F2FD", priColor: "#1565C0" },
];

export default function OrgChartStatus() {
  return (
    <AppLayout>
      <AgentDetailModal activeTab="Status">
        {/* Status Header */}
        <div className="flex items-center justify-between">
          <span className="font-ui text-sm font-semibold text-[var(--black-primary)]">
            Agent Status
          </span>
          <div
            className="flex items-center gap-1.5 rounded-full"
            style={{ backgroundColor: "#E8F5E9", padding: "6px 12px" }}
          >
            <div className="w-2 h-2 rounded-full bg-[#4CAF50]" />
            <span className="font-ui text-[11px] font-medium" style={{ color: "#2E7D32" }}>
              Active
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex-1 flex flex-col gap-1 rounded-lg"
              style={{ backgroundColor: "var(--bg-surface)", padding: 16 }}
            >
              <span
                className="font-ui text-[10px] font-medium text-[var(--gray-500)]"
                style={{ letterSpacing: 0.5 }}
              >
                {stat.label}
              </span>
              <span className="font-mono text-xl font-semibold text-[var(--black-primary)]">
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* Current Task */}
        <div className="flex flex-col gap-2.5">
          <span
            className="font-ui text-[10px] font-semibold text-[var(--gray-500)]"
            style={{ letterSpacing: 1 }}
          >
            CURRENT TASK
          </span>
          <div
            className="flex flex-col gap-2 rounded-lg"
            style={{ padding: 16, border: "1px solid var(--border-light)" }}
          >
            <div className="flex items-center justify-between">
              <span className="font-ui text-[13px] font-medium text-[var(--black-primary)]">
                Review staging deployment pipeline
              </span>
              <div
                className="flex items-center rounded"
                style={{ backgroundColor: "#FFF3E0", padding: "2px 8px" }}
              >
                <span className="font-mono text-[10px] font-semibold" style={{ color: "#E65100" }}>
                  P1
                </span>
              </div>
            </div>
            <p className="font-ui text-xs text-[var(--gray-600)] leading-6">
              Analyzing the CI/CD pipeline configuration for the staging environment. Running deployment checks and generating an optimization report.
            </p>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[10px] text-[var(--gray-500)]">Started 12m ago</span>
              <span className="font-ui text-[10px] text-[var(--gray-300)]">&middot;</span>
              <span className="font-mono text-[10px] text-[var(--gray-500)]">Thread #eng-deployments</span>
              <span className="font-ui text-[10px] text-[var(--gray-300)]">&middot;</span>
              <span className="font-mono text-[10px] text-[var(--gray-500)]">$0.18 spent</span>
            </div>
          </div>
        </div>

        {/* Queue Section */}
        <div className="flex flex-col gap-2.5">
          <span
            className="font-ui text-[10px] font-semibold text-[var(--gray-500)]"
            style={{ letterSpacing: 1 }}
          >
            QUEUE (3)
          </span>
          {queueItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-md"
              style={{ padding: "10px 16px", border: "1px solid var(--border-light)" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--gray-300)]" />
              <span className="font-ui text-xs text-[var(--gray-dark)] flex-1">
                {item.text}
              </span>
              <div
                className="flex items-center rounded"
                style={{ backgroundColor: item.priBg, padding: "2px 6px" }}
              >
                <span className="font-mono text-[9px] font-semibold" style={{ color: item.priColor }}>
                  {item.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      </AgentDetailModal>
    </AppLayout>
  );
}
