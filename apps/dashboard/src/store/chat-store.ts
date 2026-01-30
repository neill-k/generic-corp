import { create } from "zustand";
import type { ApiThread, ApiMessage } from "@generic-corp/shared";

interface ChatState {
  threads: ApiThread[];
  messages: ApiMessage[];
  activeThreadId: string | null;
  sending: boolean;
  setThreads: (threads: ApiThread[]) => void;
  setMessages: (messages: ApiMessage[]) => void;
  setActiveThread: (threadId: string | null) => void;
  appendMessage: (message: ApiMessage) => void;
  setSending: (sending: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  threads: [],
  messages: [],
  activeThreadId: null,
  sending: false,
  setThreads: (threads) => set({ threads }),
  setMessages: (messages) => set({ messages }),
  setActiveThread: (threadId) => set({ activeThreadId: threadId, messages: [] }),
  appendMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setSending: (sending) => set({ sending }),
}));
