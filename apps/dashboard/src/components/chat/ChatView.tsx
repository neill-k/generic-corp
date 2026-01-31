import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api-client.js";
import { useChatStore } from "../../store/chat-store.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { ThreadList } from "./ThreadList.js";
import { MessageList } from "./MessageList.js";
import { ChatInput } from "./ChatInput.js";
import type { ApiThread, ApiMessage, WsAgentEvent } from "@generic-corp/shared";

export function ChatView() {
  const {
    threads,
    messages,
    activeThreadId,
    sending,
    setThreads,
    setMessages,
    setActiveThread,
    appendMessage,
    setSending,
  } = useChatStore();

  const queryClient = useQueryClient();

  // Fetch threads
  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: () => api.get<{ threads: ApiThread[] }>("/threads"),
    refetchInterval: 300000,
  });

  useSocketEvent("message_created", () => {
    queryClient.invalidateQueries({ queryKey: ["threads"] });
    if (activeThreadId) {
      queryClient.invalidateQueries({ queryKey: ["messages", activeThreadId] });
    }
  });

  useEffect(() => {
    if (threadsQuery.data) {
      setThreads(threadsQuery.data.threads);
    }
  }, [threadsQuery.data, setThreads]);

  // Fetch messages when thread changes
  const messagesQuery = useQuery({
    queryKey: ["messages", activeThreadId],
    queryFn: () =>
      api.get<{ messages: ApiMessage[] }>(`/messages?threadId=${activeThreadId}`),
    enabled: !!activeThreadId,
  });

  useEffect(() => {
    if (messagesQuery.data) {
      setMessages(messagesQuery.data.messages);
    }
  }, [messagesQuery.data, setMessages]);

  // Listen for agent events (CEO responses in real-time)
  useSocketEvent<WsAgentEvent>("agent_event", (event) => {
    if (
      event.event.type === "message" &&
      activeThreadId
    ) {
      appendMessage({
        id: crypto.randomUUID(),
        fromAgentId: event.agentId,
        toAgentId: event.agentId,
        threadId: activeThreadId,
        body: event.event.content,
        type: "chat",
        createdAt: new Date().toISOString(),
      });
    }
  });

  const handleSend = useCallback(
    async (body: string) => {
      if (!activeThreadId) return;
      setSending(true);
      try {
        const result = await api.post<{ message: ApiMessage }>("/messages", {
          agentName: "marcus",
          body,
          threadId: activeThreadId,
        });
        appendMessage(result.message);
      } catch (error) {
        console.error("[Chat] Failed to send message:", error);
      } finally {
        setSending(false);
      }
    },
    [activeThreadId, appendMessage, setSending],
  );

  const handleNewThread = useCallback(() => {
    setActiveThread(crypto.randomUUID());
  }, [setActiveThread]);

  return (
    <div className="flex h-[calc(100vh-3rem)] rounded-lg border border-slate-200 bg-white">
      <ThreadList
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThread}
        onNewThread={handleNewThread}
      />
      <div className="flex flex-1 flex-col">
        {activeThreadId ? (
          <>
            <MessageList messages={messages} />
            <ChatInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
            Select a thread or start a new conversation
          </div>
        )}
      </div>
    </div>
  );
}
