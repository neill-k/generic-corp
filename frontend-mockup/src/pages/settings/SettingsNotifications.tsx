import { Save, Mail, Hash, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

interface Channel {
  icon: LucideIcon;
  name: string;
  description: string;
  enabled: boolean;
}

const channels: Channel[] = [
  {
    icon: Mail,
    name: "Email Notifications",
    description: "Receive alerts at admin@generic-corp.io",
    enabled: true,
  },
  {
    icon: Hash,
    name: "Slack Notifications",
    description: "Post alerts to #ops-alerts channel",
    enabled: true,
  },
  {
    icon: Smartphone,
    name: "In-App Notifications",
    description: "Show alerts in the workspace dashboard",
    enabled: true,
  },
];

interface Event {
  name: string;
  description: string;
  enabled: boolean;
}

const events: Event[] = [
  {
    name: "Agent goes offline",
    description: "Alert when an agent loses connection",
    enabled: true,
  },
  {
    name: "Task failure",
    description: "Alert when an agent task fails or errors out",
    enabled: true,
  },
  {
    name: "Spend threshold",
    description: "Alert when monthly API spend exceeds $200",
    enabled: true,
  },
  {
    name: "MCP server disconnect",
    description: "Alert when an MCP server connection is lost",
    enabled: true,
  },
  {
    name: "Daily digest",
    description: "Send a daily summary of all agent activity",
    enabled: false,
  },
];

export default function SettingsNotifications() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            Notifications
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Choose how and when you receive alerts.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
          <Save size={14} />
          Save Changes
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* CHANNELS Section */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        CHANNELS
      </span>

      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {channels.map((channel, index) => {
          const Icon = channel.icon;
          const isLast = index === channels.length - 1;
          return (
            <div
              key={channel.name}
              className={`flex items-center justify-between px-4 py-3.5 ${
                !isLast ? "border-b border-[var(--border-light)]" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={16} className="text-[var(--gray-mid)]" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-medium text-[var(--gray-dark)]">
                    {channel.name}
                  </span>
                  <span className="text-[11px] text-[var(--gray-500)]">
                    {channel.description}
                  </span>
                </div>
              </div>
              <Toggle enabled={channel.enabled} />
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* EVENTS Section */}
      <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
        EVENTS
      </span>

      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          return (
            <div
              key={event.name}
              className={`flex items-center justify-between px-4 py-3.5 ${
                !isLast ? "border-b border-[var(--border-light)]" : ""
              }`}
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-[var(--gray-dark)]">
                  {event.name}
                </span>
                <span className="text-[11px] text-[var(--gray-500)]">
                  {event.description}
                </span>
              </div>
              <Toggle enabled={event.enabled} />
            </div>
          );
        })}
      </div>
    </SettingsLayout>
  );
}
