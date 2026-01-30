import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api-client.js";
import { BoardColumn } from "./BoardColumn.js";
import type { ApiBoardItem, BoardItemType } from "@generic-corp/shared";

const COLUMNS: { type: BoardItemType; title: string }[] = [
  { type: "status_update", title: "Status Updates" },
  { type: "blocker", title: "Blockers" },
  { type: "finding", title: "Findings" },
  { type: "request", title: "Requests" },
];

export function BoardView() {
  const queryClient = useQueryClient();

  const boardQuery = useQuery({
    queryKey: ["board"],
    queryFn: () => api.get<{ items: ApiBoardItem[] }>("/board"),
    refetchInterval: 30000,
  });

  const archiveMutation = useMutation({
    mutationFn: (filePath: string) =>
      api.post<{ archivedPath: string }>("/board/archive", { filePath }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board"] });
    },
  });

  if (boardQuery.isLoading) {
    return <p className="text-sm text-slate-500">Loading board...</p>;
  }

  if (boardQuery.isError) {
    return <p className="text-sm text-red-500">Failed to load board.</p>;
  }

  const items = boardQuery.data?.items ?? [];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <BoardColumn
          key={col.type}
          title={col.title}
          items={items.filter((item) => item.type === col.type)}
          onArchive={(filePath) => archiveMutation.mutate(filePath)}
        />
      ))}
    </div>
  );
}
