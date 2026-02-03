import { create } from "zustand";
import type { ApiThread, ApiMessage } from "@generic-corp/shared";

export interface StreamingToolCall {
  toolUseId: string;
  toolName: string;
  input: unknown;
  output?: string;
  isError?: boolean;
  status: "running" | "complete";
}

export interface StreamingMessage {
  turnId: string;
  threadId: string;
  text: string;
  isStreaming: boolean;
  thinkingText: string;
  isThinking: boolean;
  toolCalls: StreamingToolCall[];
  error?: string;
}

interface ChatState {
  threads: ApiThread[];
  messages: ApiMessage[];
  activeThreadId: string | null;
  sending: boolean;
  streamingMessage: StreamingMessage | null;

  setThreads: (threads: ApiThread[]) => void;
  setMessages: (messages: ApiMessage[]) => void;
  setActiveThread: (threadId: string | null) => void;
  appendMessage: (message: ApiMessage) => void;
  setSending: (sending: boolean) => void;

  // Streaming actions
  startStream: (turnId: string, threadId: string) => void;
  appendDelta: (delta: string) => void;
  appendThinkingDelta: (delta: string) => void;
  startToolCall: (toolUseId: string, toolName: string, input: unknown) => void;
  completeToolCall: (toolUseId: string, output: string, isError: boolean) => void;
  completeStream: (messageId: string, fullText: string) => void;
  errorStream: (error: string) => void;
  clearStream: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  threads: [],
  messages: [],
  activeThreadId: null,
  sending: false,
  streamingMessage: null,

  setThreads: (threads) => set({ threads }),
  setMessages: (messages) => set({ messages }),
  setActiveThread: (threadId) => set({ activeThreadId: threadId, messages: [], streamingMessage: null }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setSending: (sending) => set({ sending }),

  startStream: (turnId, threadId) =>
    set({
      streamingMessage: {
        turnId,
        threadId,
        text: "",
        isStreaming: true,
        thinkingText: "",
        isThinking: true,
        toolCalls: [],
      },
    }),

  appendDelta: (delta) =>
    set((state) => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          text: state.streamingMessage.text + delta,
          isThinking: false,
        },
      };
    }),

  appendThinkingDelta: (delta) =>
    set((state) => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          thinkingText: state.streamingMessage.thinkingText + delta,
          isThinking: true,
        },
      };
    }),

  startToolCall: (toolUseId, toolName, input) =>
    set((state) => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          isThinking: false,
          toolCalls: [
            ...state.streamingMessage.toolCalls,
            { toolUseId, toolName, input, status: "running" },
          ],
        },
      };
    }),

  completeToolCall: (toolUseId, output, isError) =>
    set((state) => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          toolCalls: state.streamingMessage.toolCalls.map((tc) =>
            tc.toolUseId === toolUseId
              ? { ...tc, output, isError, status: "complete" as const }
              : tc,
          ),
        },
      };
    }),

  completeStream: (messageId, fullText) => {
    const state = get();
    const threadId = state.streamingMessage?.threadId;
    if (!threadId) return;

    // Convert streaming message to a regular message and append
    const newMessage: ApiMessage = {
      id: messageId,
      fromAgentId: "main-agent",
      toAgentId: "main-agent",
      threadId,
      body: fullText,
      type: "chat",
      createdAt: new Date().toISOString(),
    };

    set((s) => ({
      messages: [...s.messages, newMessage],
      streamingMessage: null,
    }));
  },

  errorStream: (error) =>
    set((state) => {
      if (!state.streamingMessage) return state;
      return {
        streamingMessage: {
          ...state.streamingMessage,
          isStreaming: false,
          isThinking: false,
          error,
        },
      };
    }),

  clearStream: () => set({ streamingMessage: null }),
}));
