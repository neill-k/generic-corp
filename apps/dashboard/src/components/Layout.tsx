import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar.js";
import { OnboardingModal } from "./OnboardingModal.js";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white text-black">
      <OnboardingModal />
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
