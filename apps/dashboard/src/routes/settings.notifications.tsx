import { Bell } from "lucide-react";

export function SettingsNotificationsPage() {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
          Notifications
        </h1>
        <p className="text-[12px] text-[var(--gray-600)]">
          Configure how and when you receive notifications.
        </p>
      </div>

      <div className="h-px w-full bg-[var(--border-light)]" />

      <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-light)] py-16">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-surface)]">
          <Bell size={24} className="text-[var(--gray-500)]" />
        </div>
        <span className="mt-4 text-[14px] font-medium text-[var(--black-primary)]">
          Notification Preferences
        </span>
        <span className="mt-1 text-[12px] text-[var(--gray-500)]">
          Notification preferences coming soon.
        </span>
      </div>
    </>
  );
}
