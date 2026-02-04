import { useState, useEffect } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { StreamingToolCall } from "../../store/chat-store.js";
import { getToolLabel } from "./tool-labels.js";
import { ActivityRow } from "./ActivityRow.js";

interface StepsPanelProps {
  toolCalls: StreamingToolCall[];
  isThinking: boolean;
}

export function StepsPanel({ toolCalls, isThinking }: StepsPanelProps) {
  const runningCalls = toolCalls.filter((tc) => tc.status === "running");
  const allDone = toolCalls.length > 0 && runningCalls.length === 0;
  const showThinkingOnly = isThinking && toolCalls.length === 0;

  const [isExpanded, setIsExpanded] = useState(true);

  // Auto-collapse when all tools finish, auto-expand when new tools start running
  useEffect(() => {
    if (allDone) {
      setIsExpanded(false);
    } else if (runningCalls.length > 0) {
      setIsExpanded(true);
    }
  }, [allDone, runningCalls.length]);

  // Preview text for the header
  let previewText: string;
  if (showThinkingOnly) {
    previewText = "Thinking...";
  } else if (runningCalls.length > 0) {
    previewText = getToolLabel(runningCalls[runningCalls.length - 1].toolName, "running");
  } else {
    previewText = `${toolCalls.length} step${toolCalls.length !== 1 ? "s" : ""} completed`;
  }

  return (
    <div className="rounded-lg bg-[#F5F5F5] text-sm">
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#EEEEEE] rounded-lg transition-colors"
      >
        <motion.span
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="shrink-0"
        >
          <ChevronRight className="h-3.5 w-3.5 text-[#999]" />
        </motion.span>

        {/* Step count badge */}
        {toolCalls.length > 0 && (
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E0E0E0] px-1.5 text-[10px] font-medium text-[#666]">
            {toolCalls.length}
          </span>
        )}

        {/* Preview text */}
        <span className="text-xs text-[#666]">{previewText}</span>

        {/* Spinner when active */}
        {(runningCalls.length > 0 || showThinkingOnly) && (
          <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[#999]" />
        )}
      </button>

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.15 },
            }}
            className="overflow-hidden"
          >
            <div className="ml-3 border-l-2 border-[#E0E0E0] pl-3 pb-2">
              {/* Thinking row when no tools yet */}
              {showThinkingOnly && (
                <div className="flex items-center gap-2 py-0.5 text-xs text-[#999]">
                  <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}

              {/* Tool call activity rows */}
              {toolCalls.map((tc, i) => (
                <motion.div
                  key={tc.toolUseId}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.15,
                    delay: Math.min(i, 10) * 0.03,
                  }}
                >
                  <ActivityRow toolCall={tc} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
