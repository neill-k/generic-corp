import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api-client.js";

interface WhileYouWereAwayProps {
  threadId: string;
}

function getLastSeen(threadId: string): string | null {
  try {
    return localStorage.getItem(`gc-last-seen:${threadId}`);
  } catch {
    return null;
  }
}

export function setLastSeen(threadId: string): void {
  try {
    localStorage.setItem(`gc-last-seen:${threadId}`, new Date().toISOString());
  } catch {
    // localStorage not available
  }
}

export function WhileYouWereAway({ threadId }: WhileYouWereAwayProps) {
  const [dismissed, setDismissed] = useState(false);
  const lastSeen = getLastSeen(threadId);

  const summaryQuery = useQuery({
    queryKey: ["thread-summary", threadId, lastSeen],
    queryFn: () =>
      api.get<{ summary: string | null }>(
        `/threads/${threadId}/summary?since=${lastSeen}`,
      ),
    enabled: !!lastSeen && !dismissed,
  });

  useEffect(() => {
    setLastSeen(threadId);
  }, [threadId]);

  if (dismissed || !lastSeen || !summaryQuery.data?.summary) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm">
      <span className="text-blue-800">{summaryQuery.data.summary}</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-3 text-xs text-blue-600 hover:text-blue-800"
      >
        Dismiss
      </button>
    </div>
  );
}
