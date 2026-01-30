import type { ApiBoardItem } from "@generic-corp/shared";

interface BoardCardProps {
  item: ApiBoardItem;
}

export function BoardCard({ item }: BoardCardProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm text-slate-800">{item.summary}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{item.author}</span>
        <span>{new Date(item.timestamp).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
