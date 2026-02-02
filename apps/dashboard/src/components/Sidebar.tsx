import { Link, useRouterState } from "@tanstack/react-router";
import { useSocketStore } from "../store/socket-store.js";
import { usePluginStore } from "../store/plugin-store.js";

const BUILTIN_NAV_ITEMS = [
  { to: "/", label: "Dashboard", hint: "Overview and capabilities" },
  { to: "/chat", label: "Chat", hint: "Talk to agents and delegate work" },
  { to: "/org", label: "Org Chart", hint: "Agent hierarchy and live status" },
  { to: "/board", label: "Board", hint: "Updates, blockers, findings" },
  { to: "/help", label: "Help", hint: "Docs, tools, and workflows" },
  { to: "/settings", label: "Settings", hint: "Workspace configuration" },
] as const;

export function Sidebar() {
  const connected = useSocketStore((s) => s.connected);
  const location = useRouterState({ select: (s) => s.location });
  const pluginNavItems = usePluginStore((s) => s.getNavItems());

  return (
    <aside className="flex w-60 flex-col bg-black">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-[#222] px-6">
        <span className="font-mono text-sm font-semibold tracking-wide text-white">
          GENERIC CORP
        </span>
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#E53935]" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
        {BUILTIN_NAV_ITEMS.map((item) => {
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.hint}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors ${
                active
                  ? "font-medium text-white"
                  : "text-[#666] hover:text-[#999]"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  active ? "bg-[#E53935]" : "bg-[#444]"
                }`}
              />
              {item.label}
            </Link>
          );
        })}

        {pluginNavItems.length > 0 && (
          <>
            <div className="my-2 border-t border-[#222]" />
            {pluginNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] transition-colors ${
                    active
                      ? "font-medium text-white"
                      : "text-[#666] hover:text-[#999]"
                  }`}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      active ? "bg-[#E53935]" : "bg-[#444]"
                    }`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Connection Status */}
      <div className="border-t border-[#222] px-6 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              connected ? "bg-[#E53935]" : "bg-[#666]"
            }`}
          />
          <span className="text-xs font-medium text-white">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <p className="mt-1 pl-[14px] text-[11px] text-[#666]">
          WebSocket {connected ? "active" : "inactive"}
        </p>
      </div>
    </aside>
  );
}
