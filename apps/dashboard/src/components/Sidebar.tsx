import { Link, useRouterState } from "@tanstack/react-router";
import { useSocketStore } from "../store/socket-store.js";
import { usePluginStore } from "../store/plugin-store.js";

const BUILTIN_NAV_ITEMS = [
  { to: "/", label: "Dashboard", hint: "Overview and capabilities" },
  { to: "/chat", label: "Chat", hint: "Talk to agents and delegate work" },
  { to: "/org", label: "Org Chart", hint: "Agent hierarchy and live status" },
  { to: "/board", label: "Board", hint: "Updates, blockers, findings" },
  { to: "/help", label: "Help", hint: "Docs, tools, and workflows" },
] as const;

export function Sidebar() {
  const connected = useSocketStore((s) => s.connected);
  const location = useRouterState({ select: (s) => s.location });
  const pluginNavItems = usePluginStore((s) => s.getNavItems());

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <h1 className="text-lg font-semibold">Generic Corp</h1>
        <p className="text-xs text-slate-500">Agent orchestration</p>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {BUILTIN_NAV_ITEMS.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.hint}
              className={`block rounded px-3 py-2 text-sm ${
                active
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>{item.label}</span>
              <span className="ml-1 text-xs text-slate-400">{item.hint}</span>
            </Link>
          );
        })}

        {pluginNavItems.length > 0 && (
          <>
            <div className="my-2 border-t border-slate-100" />
            {pluginNavItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block rounded px-3 py-2 text-sm ${
                    active
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-400"
            }`}
          />
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>
    </aside>
  );
}
