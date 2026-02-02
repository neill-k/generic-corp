import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Archive,
  Plus,
  X,
  Loader2,
  ChevronDown,
} from "lucide-react";

import { api } from "../../lib/api-client.js";
import { queryClient } from "../../lib/query-client.js";
import { queryKeys } from "../../lib/query-keys.js";
import type { ApiBoardItem, BoardItemType } from "@generic-corp/shared";

const BOARD_ITEM_TYPE_CONFIG: Record<
  BoardItemType,
  { label: string; icon: typeof MessageSquare; color: string; bg: string }
> = {
  status_update: {
    label: "Status Updates",
    icon: MessageSquare,
    color: "#1565C0",
    bg: "#E3F2FD",
  },
  blocker: {
    label: "Blockers",
    icon: AlertTriangle,
    color: "#C62828",
    bg: "#FFEBEE",
  },
  finding: {
    label: "Findings",
    icon: Lightbulb,
    color: "#F9A825",
    bg: "#FFF8E1",
  },
  request: {
    label: "Requests",
    icon: HelpCircle,
    color: "#6A1B9A",
    bg: "#F3E5F5",
  },
};

const BOARD_ITEM_TYPES: BoardItemType[] = [
  "status_update",
  "blocker",
  "finding",
  "request",
];

interface BoardItemsResponse {
  items: ApiBoardItem[];
}

export function BoardItemsPanel() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<BoardItemType | "">("");

  const boardItemsQuery = useQuery({
    queryKey: queryKeys.boardItems.list(
      typeFilter ? { type: typeFilter } : undefined,
    ),
    queryFn: () =>
      api.get<BoardItemsResponse>(
        `/board${typeFilter ? `?type=${typeFilter}` : ""}`,
      ),
    refetchInterval: 30_000,
  });

  const archiveMutation = useMutation({
    mutationFn: (filePath: string) =>
      api.post<{ archivedPath: string }>("/board/archive", { filePath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boardItems.all });
    },
  });

  const items = boardItemsQuery.data?.items ?? [];

  // Group items by type
  const grouped = BOARD_ITEM_TYPES.reduce(
    (acc, type) => {
      acc[type] = items.filter((item) => item.type === type);
      return acc;
    },
    {} as Record<BoardItemType, ApiBoardItem[]>,
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-black">Board Items</h2>
          <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 font-mono text-[10px] text-[#666]">
            {items.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as BoardItemType | "")
              }
              className="appearance-none rounded-md border border-[#EEE] bg-white py-1.5 pl-3 pr-7 text-[11px] text-[#666] outline-none transition-colors hover:border-[#DDD] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
            >
              <option value="">All Types</option>
              {BOARD_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {BOARD_ITEM_TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#999]"
            />
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 transition-colors hover:bg-[#222]"
          >
            <Plus size={12} className="text-white" />
            <span className="text-[11px] font-medium text-white">
              New Item
            </span>
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <CreateBoardItemForm onClose={() => setShowCreateForm(false)} />
      )}

      {/* Content */}
      {boardItemsQuery.isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 size={20} className="animate-spin text-[#CCC]" />
        </div>
      )}

      {boardItemsQuery.isSuccess && items.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-[#CCC]">No board items yet</p>
        </div>
      )}

      {boardItemsQuery.isSuccess && items.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {typeFilter ? (
            // Flat list when filtering
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <BoardItemCard
                  key={item.path}
                  item={item}
                  onArchive={() => archiveMutation.mutate(item.path)}
                  isArchiving={
                    archiveMutation.isPending &&
                    archiveMutation.variables === item.path
                  }
                />
              ))}
            </div>
          ) : (
            // Grouped view
            <div className="flex flex-col gap-5">
              {BOARD_ITEM_TYPES.map((type) => {
                const typeItems = grouped[type];
                if (typeItems.length === 0) return null;
                const config = BOARD_ITEM_TYPE_CONFIG[type];
                const Icon = config.icon;
                return (
                  <div key={type} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: config.color }} />
                      <span className="text-xs font-semibold text-black">
                        {config.label}
                      </span>
                      <span className="rounded-full bg-[#F5F5F5] px-1.5 py-0.5 font-mono text-[9px] text-[#666]">
                        {typeItems.length}
                      </span>
                    </div>
                    {typeItems.map((item) => (
                      <BoardItemCard
                        key={item.path}
                        item={item}
                        onArchive={() => archiveMutation.mutate(item.path)}
                        isArchiving={
                          archiveMutation.isPending &&
                          archiveMutation.variables === item.path
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Board Item Card                                                    */
/* ------------------------------------------------------------------ */

interface BoardItemCardProps {
  item: ApiBoardItem;
  onArchive: () => void;
  isArchiving: boolean;
}

function BoardItemCard({ item, onArchive, isArchiving }: BoardItemCardProps) {
  const config = BOARD_ITEM_TYPE_CONFIG[item.type];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[#EEE] bg-white p-3 transition-shadow hover:shadow-sm">
      <div
        className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded"
        style={{ backgroundColor: config.bg }}
      >
        <Icon size={12} style={{ color: config.color }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-xs leading-relaxed text-black">{item.summary}</p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-[#666]">
            {item.author}
          </span>
          <span className="text-[10px] text-[#CCC]">
            {formatTimestamp(item.timestamp)}
          </span>
        </div>
      </div>
      <button
        onClick={onArchive}
        disabled={isArchiving}
        className="flex-shrink-0 rounded p-1 text-[#CCC] transition-colors hover:bg-[#F5F5F5] hover:text-[#666] disabled:opacity-50"
        title="Archive"
      >
        {isArchiving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Archive size={14} />
        )}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Board Item Form                                             */
/* ------------------------------------------------------------------ */

interface CreateBoardItemFormProps {
  onClose: () => void;
}

function CreateBoardItemForm({ onClose }: CreateBoardItemFormProps) {
  const [type, setType] = useState<BoardItemType>("status_update");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("human");

  const createMutation = useMutation({
    mutationFn: (data: { type: BoardItemType; content: string; author: string }) =>
      api.post<{ path: string }>("/board", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boardItems.all });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createMutation.mutate({ type, content: content.trim(), author });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-[#EEE] bg-[#F5F5F5] p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-black">
          New Board Item
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-[#999] hover:text-[#666]"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex gap-2">
        {/* Type selector */}
        <div className="relative">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as BoardItemType)}
            className="appearance-none rounded-md border border-[#EEE] bg-white py-2 pl-3 pr-7 text-xs text-black outline-none focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
          >
            {BOARD_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {BOARD_ITEM_TYPE_CONFIG[t].label.replace(/s$/, "")}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#999]"
          />
        </div>

        {/* Author field */}
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Author"
          className="w-28 rounded-md border border-[#EEE] bg-white px-3 py-2 text-xs text-black outline-none placeholder:text-[#999] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
        />
      </div>

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What would you like to share?"
        rows={3}
        className="w-full resize-none rounded-md border border-[#EEE] bg-white px-3 py-2 text-xs text-black outline-none placeholder:text-[#999] focus:border-[#999] focus:ring-1 focus:ring-[#EEE]"
      />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        {createMutation.isError && (
          <span className="text-[11px] text-red-500">
            Failed to create item
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-xs text-[#666] hover:bg-[#F5F5F5]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!content.trim() || createMutation.isPending}
          className="flex items-center gap-1.5 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#222] disabled:opacity-50"
        >
          {createMutation.isPending && (
            <Loader2 size={12} className="animate-spin" />
          )}
          Post
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
