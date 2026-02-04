import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import {
  Settings,
  Users,
  Zap,
  Server,
  CreditCard,
  Shield,
  Bell,
  Building2,
} from "lucide-react";

const settingsNavItems = [
  { label: "General", path: "/settings", icon: Settings, exact: true },
  { label: "Organization", path: "/settings/organization", icon: Building2 },
  { label: "Agents", path: "/settings/agents", icon: Users },
  { label: "Skills", path: "/settings/skills", icon: Zap },
  { label: "MCP Servers", path: "/settings/mcp-servers", icon: Server },
  { label: "Billing", path: "/settings/billing", icon: CreditCard },
  { label: "Security", path: "/settings/security", icon: Shield },
  { label: "Notifications", path: "/settings/notifications", icon: Bell },
];

export function SettingsLayout() {
  const location = useRouterState({ select: (s) => s.location });

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Settings Nav — 220px */}
      <div className="flex h-full w-[220px] shrink-0 flex-col gap-1 border-r border-[var(--border-light)] py-8">
        <h2 className="px-6 pb-4 text-[18px] font-semibold text-[var(--black-primary)]">
          Settings
        </h2>
        {settingsNavItems.map((item) => {
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mx-0 flex items-center gap-2.5 rounded-md px-6 py-2 text-[13px] ${
                isActive
                  ? "bg-[var(--bg-surface)] font-medium text-[var(--black-primary)]"
                  : "font-normal text-[var(--gray-600)]"
              }`}
            >
              <Icon
                size={16}
                className={
                  isActive
                    ? "text-[var(--black-primary)]"
                    : "text-[var(--gray-500)]"
                }
              />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Settings Content Area */}
      <div className="flex h-full flex-1 flex-col gap-8 overflow-y-auto px-10 py-8">
        <Outlet />
      </div>
    </div>
  );
}
