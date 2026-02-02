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

  useSocketEvent("message_updated", () => {
    if (activeThreadId) {
      queryClient.invalidateQueries({ queryKey: ["messages", activeThreadId] });
    }
  });

  useSocketEvent("message_deleted", () => {
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

      // Handle /help command locally
      if (body.trim().toLowerCase() === "/help") {
        appendMessage({
          id: crypto.randomUUID(),
          fromAgentId: null,
          toAgentId: "system",
          threadId: activeThreadId,
          body: [
            "**Available commands:**",
            "- `/help` — Show this help message",
            "",
            "**What you can ask agents to do:**",
            "- Delegate work to team members",
            "- Get standup reports and status updates",
            "- Review code changes across the team",
            "- Check and resolve blockers on the board",
            "- Send messages between agents",
            "- Browse the org chart for the right person",
            "- Track task progress and results",
            "",
            "**Try these prompts:**",
            "- \"Review the latest code changes\"",
            "- \"Give me a standup report\"",
            "- \"What blockers does the team have?\"",
            "- \"Who is available to take on work?\"",
            "",
            "Visit **Help** in the sidebar for full documentation.",
          ].join("\n"),
          type: "chat",
          createdAt: new Date().toISOString(),
        });
        return;
      }

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

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      try {
        await api.delete<unknown>(`/threads/${threadId}`);
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        if (threadId === activeThreadId) {
          setActiveThread(null);
        }
      } catch (error) {
        console.error("[Chat] Failed to delete thread:", error);
      }
    },
    [activeThreadId, setActiveThread, queryClient],
  );

  const handleSummaryReceived = useCallback(
    (threadId: string, summary: string) => {
      // If the summarized thread is the active one, show the summary as a system message
      if (threadId === activeThreadId) {
        appendMessage({
          id: crypto.randomUUID(),
          fromAgentId: null,
          toAgentId: "system",
          threadId,
          body: `**Thread Summary:**\n\n${summary}`,
          type: "system",
          createdAt: new Date().toISOString(),
        });
      }
    },
    [activeThreadId, appendMessage],
  );

  return (
    <div className="flex h-full bg-white">
      <ThreadList
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThread}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
        onSummaryReceived={handleSummaryReceived}
      />
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex h-16 items-center gap-3 border-b border-[#EEE] px-8">
          <div className="h-5 w-1 rounded-sm bg-[#E53935]" />
          <h1 className="text-xl font-semibold text-black">Chat</h1>
        </div>

        {activeThreadId ? (
          <>
            <MessageList messages={messages} />
            {messages.length === 0 && (
              <div className="flex flex-wrap justify-center gap-2 px-4 pb-2">
                {[
                  "Review the latest code changes",
                  "Give me a standup report",
                  "What blockers does the team have?",
                  "Delegate a code review to the engineering lead",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    disabled={sending}
                    className="rounded-full border border-[#EEE] bg-white px-4 py-2 text-xs text-[#666] transition-colors hover:border-[#DDD] hover:text-black disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <ChatInput onSend={handleSend} disabled={sending} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-[#999]">
            <p>Select a thread or start a new conversation</p>
            <p className="text-xs text-[#BBB]">
              Agents can delegate work, post to the board, send messages, and more.
              Type <code className="rounded bg-[#F5F5F5] px-1 font-mono text-[#666]">/help</code> in chat for commands.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
