import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Search,
  Terminal,
  Code,
  Database,
  Rocket,
  Activity,
  Globe,
  FilePen,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "../lib/api-client.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";

interface ToolPermission {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

const SKILL_ICONS: Record<string, LucideIcon> = {
  bash: Terminal,
  code_review: Code,
  db_query: Database,
  deploy: Rocket,
  monitoring: Activity,
  web_browse: Globe,
  file_write: FilePen,
};

function getSkillIcon(name: string): LucideIcon {
  return SKILL_ICONS[name] ?? Zap;
}

function Toggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`flex h-5 w-9 items-center rounded-[10px] p-0.5 transition-colors ${
        enabled
          ? "justify-end bg-[#4CAF50]"
          : "justify-start bg-[var(--gray-300)]"
      } ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <div className="h-4 w-4 rounded-full bg-white" />
    </button>
  );
}

export function SettingsSkillsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: permissions, isLoading } = useQuery({
    queryKey: queryKeys.toolPermissions.list(),
    queryFn: () =>
      api
        .get<{ permissions: ToolPermission[] }>("/tool-permissions")
        .then((res) => res.permissions),
  });

  const toggleMutation = useMutation({
    mutationFn: (data: { id: string; enabled: boolean }) =>
      api.patch<ToolPermission>(`/tool-permissions/${data.id}`, {
        enabled: data.enabled,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.toolPermissions.all,
      });
    },
  });

  const filtered =
    permissions?.filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];

  const enabledCount = permissions?.filter((p) => p.enabled).length ?? 0;
  const totalCount = permissions?.length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[13px] text-[var(--gray-500)]">Loading...</span>
      </div>
    );
  }

  return (
    <>
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
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* Search row */}
      <div className="flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-[var(--border-light)] px-3 py-[9px]">
          <Search size={14} className="text-[var(--gray-500)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search skills..."
            className="flex-1 bg-transparent text-[12px] text-[var(--black-primary)] outline-none placeholder:text-[var(--gray-500)]"
          />
        </div>
        <span className="whitespace-nowrap text-[12px] text-[var(--gray-500)]">
          {enabledCount} of {totalCount} enabled
        </span>
      </div>

      {/* Skills list */}
      {filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[var(--border-light)]">
          {filtered.map((skill, index) => {
            const Icon = getSkillIcon(skill.name);
            const isLast = index === filtered.length - 1;
            return (
              <div
                key={skill.id}
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
                <Toggle
                  enabled={skill.enabled}
                  disabled={toggleMutation.isPending}
                  onToggle={() =>
                    toggleMutation.mutate({
                      id: skill.id,
                      enabled: !skill.enabled,
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-[var(--border-light)] py-12">
          <Zap size={24} className="mb-2 text-[var(--gray-500)]" />
          <span className="text-[13px] text-[var(--gray-500)]">
            {searchTerm
              ? "No skills match your search."
              : "No skills configured yet."}
          </span>
        </div>
      )}

      {toggleMutation.isError && (
        <div className="rounded-md bg-[#FFEBEE] px-4 py-2.5">
          <span className="text-[12px] text-[#C62828]">
            Failed to update skill:{" "}
            {toggleMutation.error instanceof Error
              ? toggleMutation.error.message
              : "Unknown error"}
          </span>
        </div>
      )}
    </>
  );
}
