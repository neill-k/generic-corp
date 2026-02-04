import type { ReactNode } from "react";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full bg-[var(--bg-page)]">
      <Sidebar />
      {children}
    </div>
  );
}
