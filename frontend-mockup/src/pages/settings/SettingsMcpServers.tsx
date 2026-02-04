import {
  Plus,
  Github,
  Hash,
  Ticket,
  Wrench,
  Radio,
  Timer,
  EllipsisVertical,
  TriangleAlert,
} from "lucide-react";
import SettingsLayout from "../../components/SettingsLayout";

export default function SettingsMcpServers() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            MCP Servers
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Connect external tool servers to extend agent capabilities.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
          <Plus size={14} />
          Add Server
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Stats Row */}
      <div className="flex w-full gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            3
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Total Servers
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[#2E7D32]">2</span>
          <span className="text-[11px] text-[var(--gray-500)]">Connected</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            26
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Total Tools
          </span>
        </div>
      </div>

      {/* Server Cards */}
      <div className="flex flex-col gap-4">
        {/* GitHub */}
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--border-light)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#24292E]">
                <Github size={22} className="text-white" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[var(--black-primary)]">
                  GitHub
                </span>
                <span className="font-mono text-[11px] text-[var(--gray-500)]">
                  stdio://github-mcp-server
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-[10px] bg-[#E8F5E9] px-2.5 py-1 text-[11px] font-medium text-[#2E7D32]">
                Connected
              </span>
              <EllipsisVertical
                size={16}
                className="text-[var(--gray-500)]"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <Wrench size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">
                12 tools
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">stdio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">
                Last ping 2s ago
              </span>
            </div>
          </div>
        </div>

        {/* Slack */}
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--border-light)] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]">
                <Hash size={22} className="text-white" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[var(--black-primary)]">
                  Slack
                </span>
                <span className="font-mono text-[11px] text-[var(--gray-500)]">
                  stdio://slack-mcp-server
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-[10px] bg-[#E8F5E9] px-2.5 py-1 text-[11px] font-medium text-[#2E7D32]">
                Connected
              </span>
              <EllipsisVertical
                size={16}
                className="text-[var(--gray-500)]"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <Wrench size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">
                8 tools
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">stdio</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Timer size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">
                Last ping 5s ago
              </span>
            </div>
          </div>
        </div>

        {/* Jira — Disconnected */}
        <div className="flex flex-col gap-4 rounded-lg border border-[#FFCDD2] bg-[#FFFBFB] p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0052CC]">
                <Ticket size={22} className="text-white" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-[var(--black-primary)]">
                  Jira
                </span>
                <span className="font-mono text-[11px] text-[var(--gray-500)]">
                  sse://jira.generic-corp.io/mcp
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="rounded-[10px] bg-[#FFEBEE] px-2.5 py-1 text-[11px] font-medium text-[#C62828]">
                Disconnected
              </span>
              <EllipsisVertical
                size={16}
                className="text-[var(--gray-500)]"
              />
            </div>
          </div>

          {/* Error banner */}
          <div className="flex items-center gap-2 rounded-md bg-[#FFF3E0] px-3.5 py-2.5">
            <TriangleAlert size={14} className="shrink-0 text-[#E65100]" />
            <span className="text-[11px] text-[#E65100]">
              Connection timeout — last successful ping 14m ago. Check server
              status.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <Wrench size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">
                6 tools
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Radio size={13} className="text-[var(--gray-500)]" />
              <span className="text-[12px] text-[var(--gray-600)]">sse</span>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
