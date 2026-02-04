import { Circle, Loader2, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

interface TodoPanelProps {
  todos: TodoItem[];
}

function StatusIcon({ status }: { status: TodoItem["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />;
    case "in_progress":
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />;
    default:
      return <Circle className="h-4 w-4 shrink-0 text-[#CCC]" />;
  }
}

export function TodoPanel({ todos }: TodoPanelProps) {
  if (todos.length === 0) return null;

  const completed = todos.filter((t) => t.status === "completed").length;

  return (
    <div className="rounded-lg border border-[#E5E5E5] bg-white text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#E5E5E5] px-3 py-2">
        <span className="font-medium text-[#333]">Tasks</span>
        <span className="text-xs text-[#999]">
          {completed}/{todos.length}
        </span>
      </div>

      {/* Todo items */}
      <div className="px-3 py-1.5">
        {todos.map((todo, i) => (
          <motion.div
            key={`${i}-${todo.content}`}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.15, delay: Math.min(i, 10) * 0.03 }}
            className="flex items-start gap-2 py-1"
          >
            <span className="mt-0.5">
              <StatusIcon status={todo.status} />
            </span>
            <span
              className={
                todo.status === "completed"
                  ? "text-[#999] line-through"
                  : "text-[#333]"
              }
            >
              {todo.content}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
