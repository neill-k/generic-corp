import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, ChevronDown } from "lucide-react";
import { api } from "../lib/api-client.js";
import { queryClient } from "../lib/query-client.js";
import { queryKeys } from "../lib/query-keys.js";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string;
  timezone: string;
  language: string;
  llmProvider: string;
  llmModel: string;
  llmApiKey: string;
}

export function SettingsGeneralPage() {
  const { data: workspace, isLoading } = useQuery({
    queryKey: queryKeys.workspace.detail(),
    queryFn: () => api.get<Workspace>("/workspace"),
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    timezone: "",
    language: "",
    llmProvider: "",
    llmModel: "",
    llmApiKey: "",
  });

  useEffect(() => {
    if (workspace) {
      setForm({
        name: workspace.name ?? "",
        slug: workspace.slug ?? "",
        description: workspace.description ?? "",
        timezone: workspace.timezone ?? "America/New_York",
        language: workspace.language ?? "en-US",
        llmProvider: workspace.llmProvider ?? "Anthropic",
        llmModel: workspace.llmModel ?? "claude-sonnet-4-20250514",
        llmApiKey: workspace.llmApiKey ?? "",
      });
    }
  }, [workspace]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Workspace>) =>
      api.patch<Workspace>("/workspace", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspace.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete<void>("/workspace"),
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: form.name,
      description: form.description,
      timezone: form.timezone,
      language: form.language,
      llmProvider: form.llmProvider,
      llmModel: form.llmModel,
    });
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Are you sure you want to delete this workspace? This action cannot be undone."
      )
    ) {
      deleteMutation.mutate();
    }
  };

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
            General
          </h1>
          <p className="text-[13px] text-[var(--gray-500)]">
            Manage your workspace settings and preferences
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
        >
          <Save size={12} />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* WORKSPACE Section */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
          WORKSPACE
        </span>

        {/* Name + Slug row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Workspace Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="flex items-center rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Workspace Slug
            </label>
            <div className="flex items-center rounded-md border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-2.5">
              <span className="font-mono text-[12px] text-[var(--gray-600)]">
                {form.slug}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex w-full flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--gray-600)]">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            rows={3}
            className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] leading-[1.5] text-[var(--gray-dark)] outline-none focus:border-[var(--gray-500)]"
          />
        </div>

        {/* Timezone + Language row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Timezone
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                {form.timezone}
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Language
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                {form.language}
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* LLM PROVIDER Section */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
          LLM PROVIDER
        </span>

        {/* Provider + Model row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Provider
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="text-[12px] text-[var(--black-primary)]">
                {form.llmProvider}
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Default Model
            </label>
            <div className="flex items-center justify-between rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="font-mono text-[11px] text-[var(--black-primary)]">
                {form.llmModel}
              </span>
              <ChevronDown size={14} className="text-[var(--gray-500)]" />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="flex w-full flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--gray-600)]">
            API Key
          </label>
          <div className="flex w-full gap-2">
            <div className="flex flex-1 items-center rounded-md border border-[var(--border-light)] px-3 py-2.5">
              <span className="font-mono text-[11px] text-[var(--gray-600)]">
                {form.llmApiKey
                  ? `${form.llmApiKey.slice(0, 7)}${"*".repeat(32)}`
                  : "sk-ant-********************************"}
              </span>
            </div>
            <button className="flex items-center rounded-md border border-[var(--border-light)] px-4 py-2.5">
              <span className="text-[12px] text-[var(--gray-600)]">Reveal</span>
            </button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* DANGER ZONE Section */}
      <div className="flex flex-col gap-4">
        <span className="text-[10px] font-semibold tracking-[1px] text-[#C62828]">
          DANGER ZONE
        </span>
        <div className="flex items-center justify-between rounded-lg border border-[#FFCDD2] bg-[#FFF5F5] p-4">
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium text-[var(--black-primary)]">
              Delete Workspace
            </span>
            <p className="max-w-[500px] text-[11px] leading-[1.4] text-[var(--gray-600)]">
              Permanently delete this workspace and all associated data. This
              action cannot be undone.
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center rounded-md bg-[#C62828] px-4 py-2 disabled:opacity-50"
          >
            <span className="text-[12px] font-medium text-white">
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </span>
          </button>
        </div>
      </div>

      {/* Success/Error feedback */}
      {updateMutation.isSuccess && (
        <div className="rounded-md bg-[#E8F5E9] px-4 py-2.5">
          <span className="text-[12px] text-[#2E7D32]">
            Settings saved successfully.
          </span>
        </div>
      )}
      {updateMutation.isError && (
        <div className="rounded-md bg-[#FFEBEE] px-4 py-2.5">
          <span className="text-[12px] text-[#C62828]">
            Failed to save settings:{" "}
            {updateMutation.error instanceof Error
              ? updateMutation.error.message
              : "Unknown error"}
          </span>
        </div>
      )}
    </>
  );
}
