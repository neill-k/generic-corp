import { Shield } from "lucide-react";

export function SettingsSecurityPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
          Security
        </h1>
        <p className="text-[12px] text-[var(--gray-600)]">
          Manage access controls, permissions, and security policies.
        </p>
      </div>

      <div className="h-px w-full bg-[var(--border-light)]" />

      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-light)] py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <Shield size={24} className="text-[var(--gray-500)]" />
        </div>
        <span className="mt-4 text-[14px] font-medium text-[var(--black-primary)]">
          Security Settings
        </span>
        <span className="mt-1 text-[12px] text-[var(--gray-500)]">
          Security settings coming soon.
        </span>
      </div>
    </>
  );
}
