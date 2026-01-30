import type { ApiBoardItem } from "@generic-corp/shared";
import { BoardCard } from "./BoardCard.js";

interface BoardColumnProps {
  title: string;
  items: ApiBoardItem[];
}

export function BoardColumn({ title, items }: BoardColumnProps) {
  return (
    <div className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 px-3 py-2">
        <h3 className="text-sm font-semibold text-slate-700">
          {title}
          <span className="ml-2 text-xs font-normal text-slate-400">
            {items.length}
          </span>
        </h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {items.length === 0 && (
          <p className="py-4 text-center text-xs text-slate-400">No items</p>
        )}
        {items.map((item) => (
          <BoardCard key={item.path} item={item} />
        ))}
      </div>
    </div>
  );
}
