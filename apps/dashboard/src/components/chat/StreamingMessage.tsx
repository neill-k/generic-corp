import type { StreamingMessage as StreamingMessageState } from "../../store/chat-store.js";
import { StepsPanel } from "./StepsPanel.js";
import { TodoPanel } from "./TodoPanel.js";
import type { TodoItem } from "./TodoPanel.js";
import { MarkdownContent } from "./MarkdownContent.js";

interface StreamingMessageProps {
  message: StreamingMessageState;
}

function extractTodos(message: StreamingMessageState): TodoItem[] | null {
  // Find the latest TodoWrite call and extract its todo list
  for (let i = message.toolCalls.length - 1; i >= 0; i--) {
    const tc = message.toolCalls[i];
    if (tc.toolName === "TodoWrite" && tc.input && typeof tc.input === "object") {
      const input = tc.input as { todos?: unknown };
      if (Array.isArray(input.todos) && input.todos.length > 0) {
        return input.todos as TodoItem[];
      }
    }
  }
  return null;
}

export function StreamingMessage({ message }: StreamingMessageProps) {
  const hasText = message.text.length > 0;
  const hasToolCalls = message.toolCalls.length > 0;
  const showSteps = hasToolCalls || (message.isThinking && !hasText);
  const todos = extractTodos(message);

  return (
    <div className="flex justify-start px-4 pb-3">
      <div className="max-w-[80%] space-y-2">
        {/* Collapsible steps panel — replaces thinking dots + tool chips */}
        {showSteps && (
          <StepsPanel
            toolCalls={message.toolCalls}
            isThinking={message.isThinking}
          />
        )}

        {/* Todo list panel — shown when agent creates a task list */}
        {todos && <TodoPanel todos={todos} />}

        {/* Streaming text with markdown */}
        {hasText && (
          <div className="rounded-lg bg-[#F5F5F5] px-3 py-2 text-sm text-black">
            <MarkdownContent content={message.text} />
            {message.isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-black" />
            )}
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Error: {message.error}
          </div>
        )}
      </div>
    </div>
  );
}
