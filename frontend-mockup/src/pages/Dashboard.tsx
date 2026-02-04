import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-4 w-1 bg-[var(--red-primary)]" />
      <span className="text-[14px] font-medium text-[var(--black-primary)]">
        {title}
      </span>
    </div>
  );
}

function NavCard({
  title,
  desc,
  dotColor,
  to,
}: {
  title: string;
  desc: string;
  dotColor: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-[140px] flex-1 flex-col justify-between border border-[var(--border-light)] p-6"
    >
      <div className="flex w-full items-center justify-between">
        <div
          className="h-[10px] w-[10px] rounded-full"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-[16px] text-[var(--gray-500)]">&rarr;</span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[14px] font-medium text-[var(--black-primary)]">
          {title}
        </span>
        <span className="font-mono text-[11px] text-[var(--gray-500)]">
          {desc}
        </span>
      </div>
    </Link>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <div className="flex h-[40px] items-center border border-[var(--border-light)] px-6">
      <span className="text-[13px] text-[var(--black-primary)]">{text}</span>
    </div>
  );
}

function CapCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex h-[120px] flex-1 flex-col gap-2 border border-[var(--border-light)] p-6">
      <span className="text-[14px] font-medium text-[var(--black-primary)]">
        {title}
      </span>
      <span className="font-mono text-[11px] text-[var(--gray-500)]">
        {desc}
      </span>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AppLayout>
      <div className="flex flex-1 flex-col gap-10 overflow-auto p-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 bg-[var(--red-primary)]" />
            <h1 className="text-[32px] font-semibold text-[var(--black-primary)]">
              Welcome to Generic Corp
            </h1>
          </div>
          <p className="text-[14px] text-[var(--gray-600)]">
            Your AI-powered workspace for team collaboration, organization
            management, and project tracking.
          </p>
        </div>

        {/* Nav Cards */}
        <div className="flex flex-col gap-4">
          <SectionHeader title="Quick Navigation" />
          <div className="flex gap-4">
            <NavCard
              title="Chat"
              desc="AI-powered conversations"
              dotColor="var(--red-primary)"
              to="/chat"
            />
            <NavCard
              title="Org Chart"
              desc="Team structure & hierarchy"
              dotColor="var(--black-primary)"
              to="/org-chart"
            />
          </div>
          <div className="flex gap-4">
            <NavCard
              title="Board"
              desc="Project task management"
              dotColor="var(--gray-300)"
              to="/board"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-4">
          <SectionHeader title="Quick Actions" />
          <div className="flex flex-wrap gap-3">
            <Pill text="Start a new chat" />
            <Pill text="View org structure" />
            <Pill text="Create a board item" />
            <Pill text="Summarize threads" />
          </div>
        </div>

        {/* Capabilities */}
        <div className="flex flex-col gap-4">
          <SectionHeader title="Capabilities" />
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <CapCard
                title="AI Chat Assistant"
                desc="Context-aware conversations with access to your organization's knowledge base and real-time data."
              />
              <CapCard
                title="Organization Mapping"
                desc="Visualize team hierarchies, roles, and reporting structures across your entire organization."
              />
            </div>
            <div className="flex gap-4">
              <CapCard
                title="Task Management"
                desc="Kanban-style boards for tracking projects, assigning tasks, and monitoring team progress."
              />
              <CapCard
                title="Real-time Collaboration"
                desc="Live updates, thread summaries, and seamless integration between chat, org, and board modules."
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
