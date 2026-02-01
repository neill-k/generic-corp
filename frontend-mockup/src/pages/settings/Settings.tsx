import { Save, ChevronDown } from "lucide-react";
import SettingsLayout from "../../components/SettingsLayout";

export default function Settings() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            General
          </h1>
          <p className="text-[13px] text-[var(--gray-500)]">
            Manage your workspace settings and preferences
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
          <Save size={12} />
          Save Changes
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* WORKSPACE Section */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
          WORKSPACE
        </span>

        {/* Name + Slug row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Workspace Name
            </label>
            <div className="flex items-center rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                Generic Corp
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Workspace Slug
            </label>
            <div className="flex items-center rounded-md border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-2.5">
              <span className="font-mono text-[12px] text-[var(--gray-600)]">
                generic-corp
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex w-full flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--gray-600)]">
            Description
          </label>
          <div className="rounded-md border border-[var(--border-light)] px-3 py-2.5">
            <p className="text-[12px] leading-[1.5] text-[var(--gray-dark)]">
              AI-powered workspace for team collaboration, organization
              management, and project tracking.
            </p>
          </div>
        </div>

        {/* Timezone + Language row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Timezone
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                America/New_York (EST)
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Language
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                English (US)
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* LLM PROVIDER Section */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
          LLM PROVIDER
        </span>

        {/* Provider + Model row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Provider
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                Anthropic
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Default Model
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="font-mono text-[11px] text-[var(--black-primary)]">
                claude-sonnet-4-20250514
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="flex w-full flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--gray-600)]">
            API Key
          </label>
          <div className="flex w-full gap-2">
            <div className="flex flex-1 items-center rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="font-mono text-[11px] text-[var(--gray-600)]">
                sk-ant-••••••••••••••••••••••••••••••••
              </span>
            </div>
            <button className="flex items-center rounded-md border border-[var(--border-light)] px-4 py-2.5">
              <span className="text-[12px] text-[var(--gray-600)]">Reveal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* DANGER ZONE Section */}
      <div className="flex flex-col gap-4">
        <span className="text-[10px] font-semibold tracking-[1px] text-[#C62828]">
          DANGER ZONE
        </span>
        <div className="flex items-center justify-between rounded-lg border border-[#FFCDD2] bg-[#FFF5F5] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--black-primary)]">
              Delete Workspace
            </span>
            <p className="max-w-[500px] text-[11px] leading-[1.4] text-[var(--gray-600)]">
              Permanently delete this workspace and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <button className="flex items-center rounded-md bg-[#C62828] px-4 py-2">
            <span className="text-[12px] font-medium text-white">Delete</span>
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
