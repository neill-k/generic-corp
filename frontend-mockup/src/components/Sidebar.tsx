import { Link, useLocation } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Chat", path: "/chat" },
  { label: "Org Chart", path: "/org-chart" },
  { label: "Board", path: "/board" },
  { label: "Settings", path: "/settings" },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col justify-between bg-[var(--bg-sidebar)]">
      {/* Sidebar Top */}
      <div className="flex flex-col">
        {/* Logo Bar */}
        <div className="flex h-[64px] items-center gap-3 border-b border-[var(--gray-dark)] px-6">
          <div className="h-[6px] w-[6px] bg-[var(--red-primary)]" />
          <span className="font-mono text-[14px] font-medium text-white">
            GENERIC CORP
          </span>
        </div>
        {/* Navigation */}
        <nav className="flex flex-col py-6">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex h-[44px] items-center gap-4 px-6"
              >
                <div
                  className={`h-[6px] w-[6px] rounded-full ${
                    isActive
                      ? "bg-[var(--red-primary)]"
                      : "bg-[var(--gray-mid)]"
                  }`}
                />
                <span
                  className={`text-[13px] ${
                    isActive
                      ? "font-medium text-white"
                      : "text-[var(--gray-600)]"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
      {/* Sidebar Bottom */}
      <div className="flex h-[56px] items-center gap-3 border-t border-[var(--gray-dark)] px-6">
        <div className="h-2 w-2 rounded-full bg-[var(--red-primary)]" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-white">Connected</span>
          <span className="text-[11px] text-[var(--gray-600)]">Online</span>
        </div>
      </div>
    </div>
  );
}
