---
title: Agent Chat Formatting Best Practices
category: ui-patterns
tags: [chat, formatting, streaming, markdown, agent-ui, react]
module: apps/dashboard
source: craft-agents-oss (Apache 2.0)
severity: architectural
date: 2026-02-03
---

# Agent Chat Formatting Best Practices

Reference implementation: [lukilabs/craft-agents-oss](https://github.com/lukilabs/craft-agents-oss) (Apache 2.0)

## Current State

Our chat renders messages as plain text in simple bubbles (`MessageList.tsx`). No markdown,
no turn grouping, no response buffering, no streaming optimization. This doc captures
the patterns we should adopt from craft-agents-oss.

---

## 1. Turn-Based Message Grouping

**Problem:** Flat message arrays create disjointed UIs — tool calls, thinking indicators,
and text responses appear as separate items rather than one coherent agent action.

**Pattern:** Group messages into "turns." A turn is one complete agent response cycle:
user message → all tool calls → assistant text response.

```typescript
type TurnPhase = "pending" | "tool_active" | "awaiting" | "streaming" | "complete";

interface Turn {
  id: string;
  phase: TurnPhase;
  userMessage: Message;
  activities: Activity[];        // Tool calls, sub-agent tasks
  assistantContent: string;
  isStreaming: boolean;
}

function groupMessagesByTurn(messages: Message[]): Turn[] {
  // Walk through flat messages, group everything between
  // consecutive user messages into a single turn
}
```

**Why it matters:** The user sees one logical unit of work, not a stream of fragments.
Tool calls are shown as "activities" within the turn, not standalone messages.

**Craft-agents ref:** `packages/ui/src/components/chat/turn-utils.ts`

---

## 2. Smart Response Buffering

**Problem:** Displaying streaming text immediately causes flickering — partial sentences,
incomplete code blocks, formatting that jumps around.

**Pattern:** Buffer streaming content before displaying. Show a processing indicator
until the response has enough structure to render cleanly.

```typescript
const BUFFER_CONFIG = {
  minWaitMs: 500,          // Always wait at least this long
  minWords: 40,            // Need this many words
  requireStructure: true,  // Must have paragraphs or code blocks
  maxWaitMs: 2500,         // Never wait longer than this
};

function shouldDisplay(content: string, elapsedMs: number): boolean {
  if (elapsedMs >= BUFFER_CONFIG.maxWaitMs) return true;
  if (elapsedMs < BUFFER_CONFIG.minWaitMs) return false;

  const wordCount = content.split(/\s+/).length;
  if (wordCount < BUFFER_CONFIG.minWords) return false;

  if (BUFFER_CONFIG.requireStructure) {
    return content.includes("\n\n") || content.includes("```");
  }
  return true;
}
```

**Craft-agents ref:** `packages/ui/src/components/chat/TurnCard.tsx`

---

## 3. Streaming Markdown Rendering

**Problem:** Re-rendering the entire markdown document on every text delta is expensive
and causes visible jank.

**Pattern:** Split content into completed blocks and one active block. Only re-render
the active block during streaming.

```typescript
interface MarkdownBlock {
  key: string;       // Content-hash for completed, index for active
  content: string;
  isComplete: boolean;
}

function splitIntoBlocks(content: string): MarkdownBlock[] {
  // Split on double-newlines (paragraph boundaries)
  const paragraphs = content.split(/\n\n/);
  return paragraphs.map((p, i) => ({
    key: i < paragraphs.length - 1 ? hashContent(p) : `active-${i}`,
    content: p,
    isComplete: i < paragraphs.length - 1,
  }));
}

// Use content-hash keys so completed blocks maintain stable React identity
function hashContent(s: string): string {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0;
  }
  return `b-${hash.toString(36)}`;
}
```

**Craft-agents ref:** `apps/electron/src/renderer/components/markdown/StreamingMarkdown.tsx`

---

## 4. Delta Batching for WebSocket Transport

**Problem:** Claude streams text character-by-character. Forwarding every delta over
WebSocket creates 50+ events/second, overwhelming the renderer.

**Pattern:** Batch deltas on the server before emitting over WebSocket.

```typescript
class DeltaBatcher {
  private buffer = "";
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly intervalMs = 50; // Batch window

  push(delta: string, emit: (batched: string) => void) {
    this.buffer += delta;
    if (!this.timer) {
      this.timer = setTimeout(() => {
        emit(this.buffer);
        this.buffer = "";
        this.timer = null;
      }, this.intervalMs);
    }
  }

  flush(emit: (batched: string) => void) {
    if (this.timer) clearTimeout(this.timer);
    if (this.buffer) emit(this.buffer);
    this.buffer = "";
    this.timer = null;
  }
}
```

**Impact:** Reduces event frequency from ~50/sec to ~20/sec with no perceptible latency.

---

## 5. Streaming State Outside React State

**Problem:** Storing high-frequency streaming data in React state (Zustand `set()`)
triggers a re-render on every delta — dozens per second.

**Pattern:** Store streaming text in a `useRef`, only sync to React state on
completion or meaningful phase transitions.

```typescript
function useStreamingContent(turnId: string) {
  const contentRef = useRef("");
  const [displayContent, setDisplayContent] = useState("");
  const rafRef = useRef<number>(0);

  const appendDelta = useCallback((delta: string) => {
    contentRef.current += delta;

    // Throttle React state updates to animation frames
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        setDisplayContent(contentRef.current);
        rafRef.current = 0;
      });
    }
  }, []);

  const finalize = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setDisplayContent(contentRef.current);
  }, []);

  return { displayContent, appendDelta, finalize };
}
```

**Our current gap:** `chat-store.ts` calls `set()` on every `appendDelta`, which
triggers a full Zustand subscription cycle per character. This will degrade at scale.

---

## 6. Two-Tier Message Format

**Problem:** Runtime messages carry transient state (streaming flags, cursor position)
that shouldn't be persisted. Persisted messages carry full content that shouldn't
be held in memory for idle sessions.

**Pattern:** Separate runtime and persisted message types.

```typescript
// Runtime — used during active streaming
interface RuntimeMessage {
  id: string;
  turnId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  isStreaming?: boolean;
  isPending?: boolean;
  toolCalls?: RuntimeToolCall[];
}

// Persisted — stored in DB
interface PersistedMessage {
  id: string;
  threadId: string;
  fromAgentId: string | null;
  body: string;
  type: "chat" | "system" | "delegation";
  metadata?: Record<string, unknown>; // Tool call summaries, token usage, etc.
  createdAt: string;
}
```

**Craft-agents ref:** `packages/core/src/types/message.ts`

---

## 7. Pure Function Event Processor

**Problem:** Scattered `switch` statements and ad-hoc state mutations across components
make streaming behavior hard to reason about and impossible to test without React.

**Pattern:** One pure function that takes `(state, event) => { state, effects }`.
Side effects (API calls, notifications) are returned as data, executed externally.

```typescript
interface ProcessResult {
  state: ChatState;
  effects: Effect[];
}

type Effect =
  | { type: "scroll_to_bottom" }
  | { type: "play_notification_sound" }
  | { type: "generate_title"; threadId: string }
  | { type: "auto_retry"; threadId: string };

function processEvent(state: ChatState, event: AgentEvent): ProcessResult {
  switch (event.type) {
    case "turn_start":
      return {
        state: { ...state, currentTurn: createTurn(event) },
        effects: [{ type: "scroll_to_bottom" }],
      };
    case "text_delta":
      return {
        state: appendToCurrentTurn(state, event.delta),
        effects: [],
      };
    case "turn_complete":
      return {
        state: finalizeTurn(state, event),
        effects: [
          { type: "scroll_to_bottom" },
          { type: "generate_title", threadId: state.activeThreadId! },
        ],
      };
    // ... all 40+ event types
  }
}
```

**Why it matters:** Testable without React. Single source of truth for all state transitions.
Our current `useMainAgentStream` hook mixes event handling with socket lifecycle — this
pattern separates them cleanly.

**Craft-agents ref:** `apps/electron/src/renderer/event-processor/`

---

## 8. Thread-Scoped Session Isolation

**Problem:** A single global chat store means streaming in one thread causes re-renders
in all threads. This produces focus loss, scroll jumps, and cursor resets.

**Pattern:** Per-thread state isolation. Each thread gets independent state.

```typescript
// Option A: Zustand slices per thread (simpler)
const useThreadStore = create<ThreadState>((set) => ({
  threads: new Map<string, ThreadData>(),
  getThread: (id) => get().threads.get(id),
  updateThread: (id, updater) =>
    set((s) => {
      const thread = s.threads.get(id);
      if (!thread) return s;
      const next = new Map(s.threads);
      next.set(id, updater(thread));
      return { threads: next };
    }),
}));

// Option B: Jotai atomFamily (what craft-agents uses)
const threadAtomFamily = atomFamily((id: string) =>
  atom<ThreadData>(createEmptyThread(id))
);
```

**Our current gap:** `chat-store.ts` has a single `messages` array and single
`streamingMessage`. Switching threads wipes state. Multi-thread streaming is impossible.

**Craft-agents ref:** `apps/electron/src/renderer/atoms/sessions.ts`

---

## 9. Activity Display (Tool Calls as Activities, Not Messages)

**Problem:** Showing tool calls as standalone chat bubbles clutters the conversation
and makes the agent look chatty rather than productive.

**Pattern:** Tool calls are "activities" within a turn, displayed as compact chips
or collapsible sections — not full messages.

```
┌─────────────────────────────────────┐
│ User: Review the latest code changes│
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ [✓ Listed tasks] [✓ Checked agent]  │  ← Activity chips
│ [⟳ Delegating task...]              │  ← In-progress chip
│                                     │
│ I've delegated a code review to     │  ← Assistant response
│ Sarah on the engineering team...    │
└─────────────────────────────────────┘
```

This is what our `ToolCallChip.tsx` already does — it just needs to be part of
a proper turn-based layout rather than floating independently.

---

## 10. Streaming Cursor Indicator

**Pattern:** Show a blinking cursor at the end of streaming text to indicate
the response is still generating.

```tsx
{isStreaming && (
  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
)}
```

Our `StreamingMessage.tsx` already does this. Keep it.

---

## Implementation Priority

1. **Streaming markdown rendering** — biggest visual improvement, blocks on nothing
2. **Delta batching** — server-side change, reduces WebSocket noise
3. **Turn-based grouping** — requires refactoring MessageList but dramatically improves UX
4. **Response buffering** — eliminates flickering, small change in StreamingMessage
5. **Ref-based streaming state** — performance optimization, important at scale
6. **Pure event processor** — architectural improvement, enables testing
7. **Thread isolation** — needed for multi-thread support, can defer
8. **Two-tier messages** — can evolve toward this incrementally

---

## Source Attribution

All patterns documented here are derived from [lukilabs/craft-agents-oss](https://github.com/lukilabs/craft-agents-oss), licensed under Apache 2.0. Code examples are adapted for Generic Corp's web-based architecture (WebSocket transport instead of Electron IPC, Zustand instead of Jotai).
