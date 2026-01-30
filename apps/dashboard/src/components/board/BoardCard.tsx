import type { ApiBoardItem } from "@generic-corp/shared";

interface BoardCardProps {
  item: ApiBoardItem;
  onArchive?: (filePath: string) => void;
}

export function BoardCard({ item, onArchive }: BoardCardProps) {
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-sm text-slate-800">{item.summary}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{item.author}</span>
        <div className="flex items-center gap-2">
          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
          {onArchive && (
            <button
              onClick={() => onArchive(item.path)}
              className="text-slate-400 hover:text-green-600"
              title="Archive"
            >
              ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
