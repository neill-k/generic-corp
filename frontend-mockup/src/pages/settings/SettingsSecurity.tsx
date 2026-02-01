import { Save, ChevronDown } from "lucide-react";
import SettingsLayout from "../../components/SettingsLayout";

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={`flex h-5 w-9 items-center rounded-[10px] p-0.5 ${
        enabled
          ? "justify-end bg-[#4CAF50]"
          : "justify-start bg-[var(--gray-300)]"
      }`}
    >
      <div className="h-4 w-4 rounded-full bg-white" />
    </div>
  );
}

export default function SettingsSecurity() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            Security
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Configure authentication, access controls, and audit settings.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
          <Save size={14} />
          Save Changes
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* AUTHENTICATION Section */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        AUTHENTICATION
      </span>

      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {/* 2FA */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              Two-Factor Authentication (2FA)
            </span>
            <span className="text-[11px] text-[var(--gray-500)]">
              Require 2FA for all workspace members
            </span>
          </div>
          <Toggle enabled={true} />
        </div>

        {/* SSO */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              SSO (SAML 2.0)
            </span>
            <span className="text-[11px] text-[var(--gray-500)]">
              Enable single sign-on via your identity provider
            </span>
          </div>
          <Toggle enabled={false} />
        </div>

        {/* Session Timeout */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              Session Timeout
            </span>
            <span className="text-[11px] text-[var(--gray-500)]">
              Automatically log out inactive users
            </span>
          </div>
          <div className="flex items-center gap-6 rounded-md border border-[var(--border-light)] px-3 py-2">
            <span className="text-[12px] text-[var(--gray-dark)]">
              30 minutes
            </span>
            <ChevronDown size={14} className="text-[var(--gray-500)]" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* ACCESS CONTROLS Section */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        ACCESS CONTROLS
      </span>

      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {/* IP Allowlist */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              IP Allowlist
            </span>
            <span className="text-[11px] text-[var(--gray-500)]">
              Restrict access to specific IP addresses
            </span>
          </div>
          <Toggle enabled={false} />
        </div>

        {/* Audit Log Retention */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              Audit Log Retention
            </span>
            <span className="text-[11px] text-[var(--gray-500)]">
              How long to retain security audit logs
            </span>
          </div>
          <div className="flex items-center gap-6 rounded-md border border-[var(--border-light)] px-3 py-2">
            <span className="text-[12px] text-[var(--gray-dark)]">
              90 days
            </span>
            <ChevronDown size={14} className="text-[var(--gray-500)]" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* API KEYS Section */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        API KEYS
      </span>

      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {/* Production API Key */}
        <div className="flex items-center justify-between border-b border-[var(--border-light)] px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              Production API Key
            </span>
            <span className="font-mono text-[10px] text-[var(--gray-500)]">
              sk-prod-•••••••••••••••• · Created Jan 12, 2026
            </span>
          </div>
          <button className="rounded-md border border-[#FFCDD2] px-3 py-1.5 text-[11px] font-medium text-[#C62828]">
            Revoke
          </button>
        </div>

        {/* Staging API Key */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-[var(--gray-dark)]">
              Staging API Key
            </span>
            <span className="font-mono text-[10px] text-[var(--gray-500)]">
              sk-stg-••••••••••••••••• · Created Jan 20, 2026
            </span>
          </div>
          <button className="rounded-md border border-[#FFCDD2] px-3 py-1.5 text-[11px] font-medium text-[#C62828]">
            Revoke
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
