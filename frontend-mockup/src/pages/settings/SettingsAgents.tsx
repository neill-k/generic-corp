import { Plus } from "lucide-react";
import SettingsLayout from "../../components/SettingsLayout";

interface Agent {
  initials: string;
  name: string;
  role: string;
  status: "Online" | "Offline";
  cost: string;
  avatarColor: string;
}

const agents: Agent[] = [
  {
    initials: "MR",
    name: "Marcus Rivera",
    role: "VP Engineering",
    status: "Online",
    cost: "$38.20",
    avatarColor: "#000000",
  },
  {
    initials: "LP",
    name: "Lena Park",
    role: "DevOps Lead",
    status: "Online",
    cost: "$29.45",
    avatarColor: "#5C6BC0",
  },
  {
    initials: "RC",
    name: "Ray Chen",
    role: "Sales Ops",
    status: "Online",
    cost: "$22.10",
    avatarColor: "#26A69A",
  },
  {
    initials: "SC",
    name: "Sophie Chang",
    role: "QA Engineer",
    status: "Online",
    cost: "$31.60",
    avatarColor: "#EF5350",
  },
  {
    initials: "JW",
    name: "Jordan Wells",
    role: "Data Analyst",
    status: "Offline",
    cost: "$14.30",
    avatarColor: "#FF9800",
  },
  {
    initials: "AT",
    name: "Alex Torres",
    role: "Security Ops",
    status: "Offline",
    cost: "$7.15",
    avatarColor: "#78909C",
  },
];

export default function SettingsAgents() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            Agents
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Manage agent configurations, roles, and permissions.
          </p>
        </div>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
          <Plus size={14} />
          Add Agent
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Stats Row */}
      <div className="flex w-full gap-4">
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            6
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">
            Total Agents
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[#2E7D32]">4</span>
          <span className="text-[11px] text-[var(--gray-500)]">Online</span>
        </div>
        <div className="flex flex-1 flex-col gap-1 rounded-lg bg-[var(--bg-surface)] p-4">
          <span className="text-[24px] font-semibold text-[var(--black-primary)]">
            $142.80
          </span>
          <span className="text-[11px] text-[var(--gray-500)]">MTD Spend</span>
        </div>
      </div>

      {/* Agent List */}
      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {agents.map((agent, index) => {
          const isLast = index === agents.length - 1;
          const isOnline = agent.status === "Online";
          return (
            <div
              key={agent.name}
              className={`flex items-center justify-between px-4 py-3.5 ${
                !isLast ? "border-b border-[var(--border-light)]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: agent.avatarColor }}
                >
                  <span className="text-[12px] font-semibold text-white">
                    {agent.initials}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-[var(--black-primary)]">
                    {agent.name}
                  </span>
                  <span className="text-[11px] text-[var(--gray-500)]">
                    {agent.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className={`rounded-[10px] px-2 py-[3px] text-[10px] font-medium ${
                    isOnline
                      ? "bg-[#E8F5E9] text-[#2E7D32]"
                      : "bg-[var(--bg-surface)] text-[var(--gray-500)]"
                  }`}
                >
                  {agent.status}
                </span>
                <span className="font-mono text-[11px] text-[var(--gray-500)]">
                  {agent.cost}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SettingsLayout>
  );
}
