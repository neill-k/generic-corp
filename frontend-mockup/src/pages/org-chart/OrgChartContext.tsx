import AppLayout from "../../components/AppLayout";
import AgentDetailModal from "./AgentDetailModal";
import { FileText, Pencil } from "lucide-react";

const responsibilities = [
  "Owns the engineering roadmap and technical strategy",
  "Manages platform, infra, and DevEx teams (6 direct reports)",
  "Approves production deployments and architecture decisions",
  "Vendor relationship management for cloud infrastructure",
];

export default function OrgChartContext() {
  return (
    <AppLayout>
      <AgentDetailModal activeTab="Context">
        {/* Context Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[var(--gray-500)]" />
            <span className="font-mono text-[13px] font-medium text-[var(--black-primary)]">
              context.md
            </span>
          </div>
          <button
            className="flex items-center gap-1.5 rounded-md"
            style={{ padding: "6px 12px", border: "1px solid var(--border-light)" }}
          >
            <Pencil size={12} className="text-[var(--gray-500)]" />
            <span className="font-ui text-[11px] text-[var(--gray-600)]">Edit</span>
          </button>
        </div>

        {/* Meta */}
        <span className="font-mono text-[10px] text-[var(--gray-500)]">
          Last modified 2h ago &middot; 1.2 KB
        </span>

        {/* Markdown Body */}
        <div
          className="flex-1 flex flex-col gap-4 rounded-lg overflow-y-auto"
          style={{ backgroundColor: "var(--bg-surface)", padding: "20px 24px" }}
        >
          <h2 className="font-ui text-lg font-bold text-[var(--black-primary)]">
            # Marcus Rivera
          </h2>
          <p className="font-ui text-xs text-[var(--gray-dark)]" style={{ lineHeight: 1.6 }}>
            VP of Engineering. Reports to Sarah Chen (CEO). Manages the engineering organization including platform, infrastructure, and developer experience teams.
          </p>

          <h3 className="font-ui text-sm font-semibold text-[var(--black-primary)]">
            ## Responsibilities
          </h3>
          <div className="flex flex-col gap-2">
            {responsibilities.map((item, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex items-center justify-center shrink-0" style={{ width: 5, height: 18 }}>
                  <div className="w-1 h-1 rounded-full bg-[var(--gray-500)]" />
                </div>
                <span className="font-ui text-xs text-[var(--gray-dark)] leading-6">
                  {item}
                </span>
              </div>
            ))}
          </div>

          <h3 className="font-ui text-sm font-semibold text-[var(--black-primary)]">
            ## Communication Style
          </h3>
          <p className="font-ui text-xs text-[var(--gray-dark)]" style={{ lineHeight: 1.6 }}>
            Direct and data-driven. Prefers concise updates with metrics. Uses technical language appropriate for an engineering audience. Flags blockers early and escalates when SLAs are at risk.
          </p>
        </div>
      </AgentDetailModal>
    </AppLayout>
  );
}
