import { useState, useEffect } from "react";
import { Save, Trash2, AlertTriangle } from "lucide-react";
import { useOrgStore } from "../store/org-store.js";
import type { Organization } from "../store/org-store.js";
import { api } from "../lib/api-client.js";

export function SettingsOrganizationPage() {
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const organizations = useOrgStore((s) => s.organizations);
  const setCurrentOrg = useOrgStore((s) => s.setCurrentOrg);
  const deleteOrganization = useOrgStore((s) => s.deleteOrganization);

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Sync form when org changes
  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.displayName);
    }
  }, [currentOrg]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (!saveSuccess) return;
    const timer = setTimeout(() => setSaveSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [saveSuccess]);

  const handleSave = async () => {
    if (!currentOrg || !name.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await api.patch<Organization>(
        `/organizations/${currentOrg.slug}`,
        { displayName: name.trim() },
      );
      // Update the org in the store
      setCurrentOrg(updated);
      // Also update in the organizations list
      const updatedOrgs = organizations.map((o) =>
        o.slug === updated.slug ? updated : o,
      );
      useOrgStore.setState({ organizations: updatedOrgs });
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentOrg) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteOrganization(currentOrg.slug);
      // The store handles switching to the next org or clearing
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete organization",
      );
      setIsDeleting(false);
    }
  };

  if (!currentOrg) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-[13px] text-[var(--gray-500)]">
          No organization selected
        </span>
      </div>
    );
  }

  const deleteConfirmSlug = currentOrg.slug;
  const canDelete = deleteConfirmText === deleteConfirmSlug;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-[18px] font-semibold text-[var(--black-primary)]">
            Organization
          </h1>
          <p className="text-[13px] text-[var(--gray-500)]">
            Manage your organization settings
          </p>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={isSaving || name.trim() === currentOrg.displayName}
          className="flex items-center gap-1.5 rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white disabled:opacity-50"
        >
          <Save size={12} />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* ORGANIZATION Section */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] font-semibold tracking-[1px] text-[var(--gray-500)]">
          ORGANIZATION
        </span>

        {/* Name + Slug row */}
        <div className="flex w-full gap-5">
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Organization Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveError(null);
                setSaveSuccess(false);
              }}
              className="flex items-center rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[12px] text-[var(--black-primary)] outline-none focus:border-[var(--gray-500)]"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Slug
            </label>
            <div className="flex items-center rounded-md border border-[var(--border-light)] bg-[var(--bg-surface)] px-3 py-2.5">
              <span className="font-mono text-[12px] text-[var(--gray-600)]">
                {currentOrg.slug}
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--gray-600)]">
            Status
          </label>
          <div className="flex items-center gap-2">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                currentOrg.status === "active" ? "bg-[#43A047]" : "bg-[var(--gray-500)]"
              }`}
            />
            <span className="text-[12px] text-[var(--black-primary)]">
              {currentOrg.status.charAt(0).toUpperCase() +
                currentOrg.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Created */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-[var(--gray-600)]">
            Created
          </label>
          <span className="text-[12px] text-[var(--black-primary)]">
            {new Date(currentOrg.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Success / Error */}
      {saveSuccess && (
        <div className="rounded-md bg-[#E8F5E9] px-4 py-2.5">
          <span className="text-[12px] text-[#2E7D32]">
            Organization settings saved successfully.
          </span>
        </div>
      )}
      {saveError && (
        <div className="rounded-md bg-[#FFEBEE] px-4 py-2.5">
          <span className="text-[12px] text-[#C62828]">
            Failed to save: {saveError}
          </span>
        </div>
      )}

      {/* Divider */}
      <div className="h-px w-full bg-[var(--border-light)]" />

      {/* DANGER ZONE Section */}
      <div className="flex flex-col gap-4">
        <span className="text-[10px] font-semibold tracking-[1px] text-[#C62828]">
          DANGER ZONE
        </span>
        <div className="flex flex-col gap-4 rounded-lg border border-[#FFCDD2] bg-[#FFF5F5] p-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-[var(--black-primary)]">
                Delete Organization
              </span>
              <p className="max-w-[500px] text-[11px] leading-[1.4] text-[var(--gray-600)]">
                Permanently delete this organization, all agents, tasks, and
                associated data. This action cannot be undone. Running agents
                will be terminated.
              </p>
            </div>
            {!showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#C62828] px-4 py-2"
              >
                <Trash2 size={12} className="text-white" />
                <span className="text-[12px] font-medium text-white">
                  Delete
                </span>
              </button>
            )}
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="flex flex-col gap-3 border-t border-[#FFCDD2] pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[#C62828]" />
                <span className="text-[12px] font-medium text-[#C62828]">
                  This action is irreversible
                </span>
              </div>
              <p className="text-[11px] leading-[1.5] text-[var(--gray-600)]">
                To confirm, type the organization slug{" "}
                <code className="rounded bg-[#FFEBEE] px-1.5 py-0.5 font-mono text-[11px] text-[#C62828]">
                  {deleteConfirmSlug}
                </code>{" "}
                below:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => {
                  setDeleteConfirmText(e.target.value);
                  setDeleteError(null);
                }}
                placeholder={deleteConfirmSlug}
                className="rounded-md border border-[#FFCDD2] bg-white px-3 py-2 font-mono text-[12px] text-[var(--black-primary)] outline-none placeholder:text-[var(--gray-500)] focus:border-[#C62828]"
              />
              {deleteError && (
                <div className="rounded-md bg-[#FFEBEE] px-3 py-2">
                  <span className="text-[12px] text-[#C62828]">
                    {deleteError}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                  className="rounded-md px-4 py-2 text-[12px] font-medium text-[var(--gray-600)] transition-colors hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleDelete()}
                  disabled={!canDelete || isDeleting}
                  className="flex items-center gap-1.5 rounded-md bg-[#C62828] px-4 py-2 disabled:opacity-50"
                >
                  <span className="text-[12px] font-medium text-white">
                    {isDeleting
                      ? "Deleting..."
                      : "Permanently Delete Organization"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
