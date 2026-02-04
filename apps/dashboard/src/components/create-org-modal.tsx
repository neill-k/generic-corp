import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useOrgStore } from "../store/org-store.js";

/** Derive a slug from an org name: lowercase, spaces to underscores, strip non-alphanumeric. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

interface CreateOrgModalProps {
  /** Called when the modal should close. If omitted, the modal is non-dismissible (first-time flow). */
  onClose?: () => void;
}

export function CreateOrgModal({ onClose }: CreateOrgModalProps) {
  const createOrganization = useOrgStore((s) => s.createOrganization);
  const switchOrg = useOrgStore((s) => s.switchOrg);

  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const slug = toSlug(name);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape (only if dismissible)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setIsCreating(true);
    setError(null);

    try {
      const created = await createOrganization(trimmed);
      await switchOrg(created.slug);
      onClose?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization",
      );
      setIsCreating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleCreate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-[var(--black-primary)]">
            {onClose ? "Create Organization" : "Welcome to Generic Corp"}
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-[var(--gray-500)] transition-colors hover:bg-[var(--bg-surface)] hover:text-[var(--gray-600)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {!onClose && (
          <p className="mb-5 text-[13px] leading-[1.5] text-[var(--gray-600)]">
            Create your first organization to get started. Organizations are
            separate workspaces with their own agents, boards, and settings.
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {/* Name input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-[var(--gray-600)]">
              Organization Name
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Acme Corp"
              disabled={isCreating}
              className="rounded-md border border-[var(--border-light)] px-3 py-2.5 text-[13px] text-[var(--black-primary)] outline-none placeholder:text-[var(--gray-500)] focus:border-[var(--gray-500)] disabled:opacity-50"
            />
          </div>

          {/* Slug preview */}
          {slug && (
            <div className="mt-3 flex items-center gap-2 rounded-md bg-[var(--bg-surface)] px-3 py-2">
              <span className="text-[11px] text-[var(--gray-600)]">Slug:</span>
              <span className="font-mono text-[11px] text-[var(--black-primary)]">
                {slug}
              </span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-3 rounded-md bg-[#FFEBEE] px-3 py-2">
              <span className="text-[12px] text-[#C62828]">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-5 flex justify-end gap-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="rounded-md px-4 py-2 text-[12px] font-medium text-[var(--gray-600)] transition-colors hover:bg-[var(--bg-surface)] disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!name.trim() || isCreating}
              className="rounded-md bg-[var(--black-primary)] px-4 py-2 text-[12px] font-medium text-white transition-colors hover:bg-[var(--gray-dark)] disabled:opacity-50"
            >
              {isCreating ? "Creating..." : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
