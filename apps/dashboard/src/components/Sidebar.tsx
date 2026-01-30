import { Link, useRouterState } from "@tanstack/react-router";
import { useSocketStore } from "../store/socket-store.js";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/chat", label: "Chat" },
  { to: "/org", label: "Org Chart" },
  { to: "/board", label: "Board" },
] as const;

export function Sidebar() {
  const connected = useSocketStore((s) => s.connected);
  const location = useRouterState({ select: (s) => s.location });

  return (
    <aside className="flex w-56 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <h1 className="text-lg font-semibold">Generic Corp</h1>
        <p className="text-xs text-slate-500">Agent orchestration</p>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`block rounded px-3 py-2 text-sm ${
                active
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
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
