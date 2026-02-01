import AppLayout from "../../components/AppLayout";
import AgentDetailModal from "./AgentDetailModal";
import { Save, ChevronDown, Terminal, Code, Database, Cloud, Activity, Mail, Globe, FilePen } from "lucide-react";

const skills = [
  { name: "bash", desc: "Execute shell commands", icon: Terminal, enabled: true },
  { name: "code_review", desc: "Review PRs and suggest changes", icon: Code, enabled: true },
  { name: "db_query", desc: "Run read-only database queries", icon: Database, enabled: true },
  { name: "deploy", desc: "Trigger deployments to staging/prod", icon: Cloud, enabled: true },
  { name: "monitoring", desc: "Access Datadog and PagerDuty", icon: Activity, enabled: true },
  { name: "email", desc: "Send emails on behalf of agent", icon: Mail, enabled: false },
  { name: "web_browse", desc: "Browse and scrape web pages", icon: Globe, enabled: false },
  { name: "file_write", desc: "Create and modify files on disk", icon: FilePen, enabled: false },
];

export default function OrgChartConfig() {
  return (
    <AppLayout>
      <AgentDetailModal activeTab="Config">
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* Config Header */}
          <div className="flex items-center justify-between">
            <span className="font-ui text-sm font-semibold text-[var(--black-primary)]">
              Configuration
            </span>
            <button
              className="flex items-center gap-1.5 rounded-md"
              style={{
                backgroundColor: "var(--black-primary)",
                padding: "8px 16px",
              }}
            >
              <Save size={12} className="text-white" />
              <span className="font-ui text-[11px] font-medium text-white">Save Changes</span>
            </button>
          </div>

          {/* Name & Role Row */}
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-ui text-[11px] font-medium text-[var(--gray-600)]">
                Display Name
              </label>
              <div
                className="flex items-center rounded-md"
                style={{ padding: "10px 12px", border: "1px solid var(--border-light)" }}
              >
                <span className="font-ui text-xs text-[var(--black-primary)]">Marcus Rivera</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="font-ui text-[11px] font-medium text-[var(--gray-600)]">
                Role
              </label>
              <div
                className="flex items-center justify-between rounded-md"
                style={{ padding: "10px 12px", border: "1px solid var(--border-light)" }}
              >
                <span className="font-ui text-xs text-[var(--black-primary)]">VP Engineering</span>
                <ChevronDown size={14} className="text-[var(--gray-500)]" />
              </div>
            </div>
          </div>

          {/* Personality Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-[11px] font-medium text-[var(--gray-600)]">
              Personality
            </label>
            <div
              className="flex flex-col rounded-md"
              style={{ padding: "10px 12px", border: "1px solid var(--border-light)" }}
            >
              <p className="font-ui text-xs text-[var(--gray-dark)] leading-6">
                Direct and data-driven. Prefers concise updates with metrics. Uses technical language appropriate for an engineering audience.
              </p>
            </div>
          </div>

          {/* System Prompt Field */}
          <div className="flex flex-col gap-1.5">
            <label className="font-ui text-[11px] font-medium text-[var(--gray-600)]">
              System Prompt
            </label>
            <div
              className="flex flex-col rounded-md"
              style={{
                padding: "10px 12px",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-light)",
              }}
            >
              <p className="font-mono text-[11px] text-[var(--gray-dark)] leading-6">
                You are Marcus Rivera, VP of Engineering at Generic Corp. You manage infrastructure, platform, and developer experience. You have access to deployment pipelines, monitoring dashboards, and CI/CD systems. Always provide data-backed responses.
              </p>
            </div>
          </div>

          {/* Allowed Skills */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-ui text-[11px] font-medium text-[var(--gray-600)]">
                Allowed Skills
              </span>
              <span className="font-mono text-[10px] text-[var(--gray-500)]">
                5 of 8 enabled
              </span>
            </div>

            <div
              className="flex flex-col rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border-light)" }}
            >
              {skills.map((skill, i) => {
                const Icon = skill.icon;
                return (
                  <div
                    key={skill.name}
                    className="flex items-center justify-between"
                    style={{
                      padding: "10px 14px",
                      borderBottom: i < skills.length - 1 ? "1px solid var(--border-light)" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        size={14}
                        style={{ color: skill.enabled ? "var(--gray-600)" : "var(--gray-300)" }}
                      />
                      <div className="flex flex-col gap-0.5">
                        <span
                          className="font-mono text-xs font-medium"
                          style={{
                            color: skill.enabled ? "var(--black-primary)" : "var(--gray-500)",
                          }}
                        >
                          {skill.name}
                        </span>
                        <span
                          className="font-ui text-[10px]"
                          style={{
                            color: skill.enabled ? "var(--gray-500)" : "var(--gray-300)",
                          }}
                        >
                          {skill.desc}
                        </span>
                      </div>
                    </div>
                    {/* Toggle */}
                    <div
                      className="flex items-center shrink-0 rounded-full"
                      style={{
                        width: 36,
                        height: 20,
                        padding: 2,
                        backgroundColor: skill.enabled ? "#4CAF50" : "var(--gray-300)",
                        justifyContent: skill.enabled ? "flex-end" : "flex-start",
                      }}
                    >
                      <div className="w-4 h-4 rounded-full bg-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AgentDetailModal>
    </AppLayout>
  );
}
