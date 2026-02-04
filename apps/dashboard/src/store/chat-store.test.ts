import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("socket.io-client", () => {
  const socket = {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  };
  return { io: () => socket };
});

import { useChatStore } from "./chat-store.js";

describe("useChatStore", () => {
  beforeEach(() => {
    useChatStore.setState({
      threads: [],
      messages: [],
      activeThreadId: null,
      sending: false,
    });
  });

  it("initializes with empty state", () => {
    const state = useChatStore.getState();
    expect(state.threads).toEqual([]);
    expect(state.messages).toEqual([]);
    expect(state.activeThreadId).toBeNull();
    expect(state.sending).toBe(false);
  });

  it("sets threads", () => {
    const threads = [
      {
        threadId: "t1",
        agentId: "a1",
        agentName: "marcus",
        lastMessageAt: "2025-01-01T00:00:00Z",
        preview: "Hello",
      },
    ];
    useChatStore.getState().setThreads(threads);
    expect(useChatStore.getState().threads).toEqual(threads);
  });

  it("sets active thread and clears messages", () => {
    useChatStore.getState().setMessages([
      {
        id: "m1",
        fromAgentId: null,
        toAgentId: "a1",
        threadId: "old-thread",
        body: "old",
        type: "chat",
        createdAt: "2025-01-01",
      },
    ]);

    useChatStore.getState().setActiveThread("new-thread");

    expect(useChatStore.getState().activeThreadId).toBe("new-thread");
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it("sets messages", () => {
    const messages = [
      {
        id: "m1",
        fromAgentId: null,
        toAgentId: "a1",
        threadId: "t1",
        body: "Hello",
        type: "chat" as const,
        createdAt: "2025-01-01",
      },
    ];
    useChatStore.getState().setMessages(messages);
    expect(useChatStore.getState().messages).toEqual(messages);
  });

  it("appends a message", () => {
    useChatStore.getState().setMessages([
      {
        id: "m1",
        fromAgentId: null,
        toAgentId: "a1",
        threadId: "t1",
        body: "First",
        type: "chat",
        createdAt: "2025-01-01",
      },
    ]);

    useChatStore.getState().appendMessage({
      id: "m2",
      fromAgentId: "a1",
      toAgentId: "a1",
      threadId: "t1",
      body: "Second",
      type: "chat",
      createdAt: "2025-01-01T00:01:00",
    });

    expect(useChatStore.getState().messages).toHaveLength(2);
    expect(useChatStore.getState().messages[1]!.body).toBe("Second");
  });

  it("sets sending state", () => {
    useChatStore.getState().setSending(true);
    expect(useChatStore.getState().sending).toBe(true);

    useChatStore.getState().setSending(false);
    expect(useChatStore.getState().sending).toBe(false);
  });
});
