import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useOrgStore } from "../store/org-store.js";
import type { Organization } from "../store/org-store.js";
import { CreateOrgModal } from "./create-org-modal.js";

/** Deterministic color for an org's first-letter avatar. */
const AVATAR_COLORS = [
  "#E53935",
  "#8E24AA",
  "#1E88E5",
  "#43A047",
  "#FB8C00",
  "#00ACC1",
  "#3949AB",
  "#D81B60",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] as string;
}

export function OrgSwitcher() {
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const organizations = useOrgStore((s) => s.organizations);
  const switchOrg = useOrgStore((s) => s.switchOrg);
  const isSwitching = useOrgStore((s) => s.isSwitching);

  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const sorted = [...organizations].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  const handleSelect = async (org: Organization) => {
    if (org.slug === currentOrg?.slug) {
      setOpen(false);
      return;
    }
    setOpen(false);
    await switchOrg(org.slug);
  };

  if (!currentOrg) return null;

  return (
    <>
      <div ref={dropdownRef} className="relative px-3 pb-2">
        {/* Trigger */}
        <button
          onClick={() => setOpen(!open)}
          disabled={isSwitching}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-[#111] disabled:opacity-50"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold text-white"
            style={{ backgroundColor: avatarColor(currentOrg.displayName) }}
          >
            {currentOrg.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 truncate text-[13px] font-medium text-white">
            {isSwitching ? "Switching..." : currentOrg.displayName}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-[#666] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-3 right-3 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[#333] bg-[#111] shadow-xl">
            <div className="max-h-[240px] overflow-y-auto py-1">
              {sorted.map((org) => {
                const isActive = org.slug === currentOrg.slug;
                return (
                  <button
                    key={org.slug}
                    onClick={() => void handleSelect(org)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-[#1a1a1a]"
                  >
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold text-white"
                      style={{
                        backgroundColor: avatarColor(org.displayName),
                      }}
                    >
                      {org.displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 truncate text-[12px] text-[#ccc]">
                      {org.displayName}
                    </span>
                    {isActive && (
                      <Check size={14} className="shrink-0 text-[#E53935]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider + Create new */}
            <div className="border-t border-[#333]">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowCreateModal(true);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[#1a1a1a]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[#222] text-[#999]">
                  <Plus size={12} />
                </span>
                <span className="text-[12px] text-[#999]">
                  Create New Organization
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateOrgModal onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
}
