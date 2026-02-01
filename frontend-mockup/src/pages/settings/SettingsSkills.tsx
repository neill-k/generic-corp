import {
  Plus,
  Save,
  Search,
  Terminal,
  Code,
  Database,
  Rocket,
  Activity,
  Globe,
  FilePen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SettingsLayout from "../../components/SettingsLayout";

interface Skill {
  name: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
}

const skills: Skill[] = [
  {
    name: "bash",
    description: "Execute shell commands and scripts",
    icon: Terminal,
    enabled: true,
  },
  {
    name: "code_review",
    description: "Analyze and review code changes",
    icon: Code,
    enabled: true,
  },
  {
    name: "db_query",
    description: "Run database queries and migrations",
    icon: Database,
    enabled: true,
  },
  {
    name: "deploy",
    description: "Deploy services to staging and production",
    icon: Rocket,
    enabled: true,
  },
  {
    name: "monitoring",
    description: "Monitor system health and alert on anomalies",
    icon: Activity,
    enabled: true,
  },
  {
    name: "web_browse",
    description: "Browse and extract information from web pages",
    icon: Globe,
    enabled: false,
  },
  {
    name: "file_write",
    description: "Create and modify files on the filesystem",
    icon: FilePen,
    enabled: false,
  },
];

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

export default function SettingsSkills() {
  return (
    <SettingsLayout>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            Skills
          </h1>
          <p className="text-[12px] text-[var(--gray-600)]">
            Configure which skills are available to agents in this workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
            <Plus size={14} />
            Add Skill
          </button>
          <button className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white">
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--border-light)] px-3 py-[9px]">
          <Search size={14} className="text-[var(--gray-500)]" />
          <span className="text-[12px] text-[var(--gray-500)]">
            Search skills...
          </span>
        </div>
        <span className="whitespace-nowrap text-[12px] text-[var(--gray-500)]">
          5 of 7 enabled
        </span>
      </div>

      {/* Skills list */}
      <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
        {skills.map((skill, index) => {
          const Icon = skill.icon;
          const isLast = index === skills.length - 1;
          return (
            <div
              key={skill.name}
              className={`flex items-center justify-between px-4 py-3.5 ${
                !isLast ? "border-b border-[var(--border-light)]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--bg-surface)]">
                  <Icon size={16} className="text-[var(--gray-mid)]" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span
                    className={`font-mono text-[13px] font-medium ${
                      skill.enabled
                        ? "text-[var(--gray-dark)]"
                        : "text-[var(--gray-500)]"
                    }`}
                  >
                    {skill.name}
                  </span>
                  <span className="text-[11px] text-[var(--gray-500)]">
                    {skill.description}
                  </span>
                </div>
              </div>
              <Toggle enabled={skill.enabled} />
            </div>
          );
        })}
      </div>
    </SettingsLayout>
  );
}
