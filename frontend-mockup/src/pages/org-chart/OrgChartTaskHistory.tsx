import AppLayout from "../../components/AppLayout";
import AgentDetailModal from "./AgentDetailModal";

const tasks = [
  { name: "Review staging deployment pipeline", status: "Active", statusBg: "#FFF3E0", statusColor: "#E65100", duration: "12m", cost: "$0.18" },
  { name: "Generate Q4 engineering metrics report", status: "Done", statusBg: "#E8F5E9", statusColor: "#2E7D32", duration: "8m 41s", cost: "$0.34" },
  { name: "Draft response to vendor security questionnaire", status: "Done", statusBg: "#E8F5E9", statusColor: "#2E7D32", duration: "22m 15s", cost: "$0.87" },
  { name: "Review PR #482 \u2014 auth middleware refactor", status: "Done", statusBg: "#E8F5E9", statusColor: "#2E7D32", duration: "5m 02s", cost: "$0.12" },
  { name: "Summarize standup notes for #eng-general", status: "Done", statusBg: "#E8F5E9", statusColor: "#2E7D32", duration: "2m 10s", cost: "$0.05" },
  { name: "Investigate failing integration test in payments", status: "Failed", statusBg: "#FFEBEE", statusColor: "#C62828", duration: "15m 33s", cost: "$0.52" },
];

export default function OrgChartTaskHistory() {
  return (
    <AppLayout>
      <AgentDetailModal activeTab="Task History">
        {/* History Header */}
        <div className="flex items-center justify-between">
          <span className="font-ui text-sm font-semibold text-[var(--black-primary)]">
            Task History
          </span>
          <span className="font-ui text-[11px] text-[var(--gray-500)]">
            24 tasks this week
          </span>
        </div>

        {/* Task Table */}
        <div
          className="flex flex-col rounded-lg overflow-hidden flex-1"
          style={{ border: "1px solid var(--border-light)" }}
        >
          {/* Table Head */}
          <div
            className="flex items-center shrink-0"
            style={{ backgroundColor: "var(--bg-surface)", padding: "10px 16px" }}
          >
            <div className="flex-1">
              <span
                className="font-ui text-[10px] font-semibold text-[var(--gray-500)]"
                style={{ letterSpacing: 0.5 }}
              >
                Task
              </span>
            </div>
            <div className="flex items-center" style={{ width: 80 }}>
              <span
                className="font-ui text-[10px] font-semibold text-[var(--gray-500)]"
                style={{ letterSpacing: 0.5 }}
              >
                Status
              </span>
            </div>
            <div className="flex items-center" style={{ width: 80 }}>
              <span
                className="font-ui text-[10px] font-semibold text-[var(--gray-500)]"
                style={{ letterSpacing: 0.5 }}
              >
                Duration
              </span>
            </div>
            <div className="flex items-center" style={{ width: 60 }}>
              <span
                className="font-ui text-[10px] font-semibold text-[var(--gray-500)]"
                style={{ letterSpacing: 0.5 }}
              >
                Cost
              </span>
            </div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 overflow-y-auto">
            {tasks.map((task, i) => (
              <div
                key={i}
                className="flex items-center"
                style={{
                  padding: "12px 16px",
                  borderBottom: i < tasks.length - 1 ? "1px solid var(--border-light)" : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-ui text-xs text-[var(--black-primary)]">
                    {task.name}
                  </span>
                </div>
                <div className="flex items-center" style={{ width: 80 }}>
                  <div
                    className="flex items-center rounded"
                    style={{ backgroundColor: task.statusBg, padding: "2px 8px" }}
                  >
                    <span
                      className="font-mono text-[9px] font-medium"
                      style={{ color: task.statusColor }}
                    >
                      {task.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center" style={{ width: 80 }}>
                  <span className="font-mono text-[11px] text-[var(--gray-600)]">
                    {task.duration}
                  </span>
                </div>
                <div className="flex items-center" style={{ width: 60 }}>
                  <span className="font-mono text-[11px] text-[var(--gray-600)]">
                    {task.cost}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total Row */}
        <div className="flex items-center justify-end gap-6" style={{ padding: "8px 0" }}>
          <span className="font-ui text-[11px] text-[var(--gray-500)]">Total spend today:</span>
          <span className="font-mono text-xs font-semibold text-[var(--black-primary)]">$2.41</span>
        </div>
      </AgentDetailModal>
    </AppLayout>
  );
}
