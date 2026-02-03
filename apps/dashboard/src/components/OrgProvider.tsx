import { useEffect } from "react";
import type { ReactNode } from "react";
import { useOrgStore } from "../store/org-store.js";
import { CreateOrgModal } from "./create-org-modal.js";

/**
 * OrgProvider handles the first-time organization flow:
 *
 * 1. On mount, fetches the list of organizations.
 * 2. If zero orgs exist, shows a blocking CreateOrgModal (non-dismissible).
 * 3. If orgs exist but gc_lastOrgSlug in localStorage doesn't match, uses the first org.
 * 4. If orgs exist and localStorage has a valid slug, restores that org.
 *
 * The org store's `fetchOrganizations` already handles cases 3 and 4 via
 * its auto-select logic. This component handles case 2 and the loading state.
 */
export function OrgProvider({ children }: { children: ReactNode }) {
  const isLoading = useOrgStore((s) => s.isLoading);
  const organizations = useOrgStore((s) => s.organizations);
  const currentOrg = useOrgStore((s) => s.currentOrg);
  const fetchOrganizations = useOrgStore((s) => s.fetchOrganizations);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations]);

  // Still loading org list
  if (isLoading && organizations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-light)] border-t-[var(--black-primary)]" />
          <span className="text-[13px] text-[var(--gray-500)]">
            Loading organizations...
          </span>
        </div>
      </div>
    );
  }

  // No orgs: force creation
  if (!isLoading && organizations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <CreateOrgModal />
      </div>
    );
  }

  // Orgs exist but none selected yet (shouldn't normally happen, but guard)
  if (!currentOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-light)] border-t-[var(--black-primary)]" />
          <span className="text-[13px] text-[var(--gray-500)]">
            Initializing...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
