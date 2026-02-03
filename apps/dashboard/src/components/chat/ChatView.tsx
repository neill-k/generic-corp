import { useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../lib/api-client.js";
import { useChatStore } from "../../store/chat-store.js";
import { useSocketEvent } from "../../hooks/use-socket.js";
import { useMainAgentStream } from "../../hooks/use-main-agent-stream.js";
import { ThreadList } from "./ThreadList.js";
import { MessageList } from "./MessageList.js";
import { ChatInput } from "./ChatInput.js";
import { StreamingMessage } from "./StreamingMessage.js";
import type { ApiThread, ApiMessage, WsThreadDeleted } from "@generic-corp/shared";

export function ChatView() {
  const {
    threads,
    messages,
    activeThreadId,
    sending,
    streamingMessage,
    setThreads,
    setMessages,
    setActiveThread,
    appendMessage,
  } = useChatStore();

  const queryClient = useQueryClient();
  const { sendMessage, interrupt, isStreaming } = useMainAgentStream(activeThreadId);

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

  useSocketEvent<WsThreadDeleted>("thread_deleted", (event) => {
    queryClient.invalidateQueries({ queryKey: ["threads"] });
    queryClient.invalidateQueries({ queryKey: ["messages", event.threadId] });
    if (event.threadId === activeThreadId) {
      setActiveThread(null);
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

  const handleSend = useCallback(
    (body: string) => {
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

      // If currently streaming, interrupt first then send new message
      if (isStreaming) {
        interrupt();
      }

      // Use streaming path via socket
      sendMessage(body);
    },
    [activeThreadId, appendMessage, isStreaming, interrupt, sendMessage],
  );

  const handleInterrupt = useCallback(() => {
    interrupt();
  }, [interrupt]);

  const handleNewThread = useCallback(() => {
    setActiveThread(crypto.randomUUID());
  }, [setActiveThread]);

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      try {
        await api.delete<unknown>(`/threads/${threadId}`);
        queryClient.invalidateQueries({ queryKey: ["threads"] });
        queryClient.invalidateQueries({ queryKey: ["messages", threadId] });
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
            {streamingMessage && streamingMessage.threadId === activeThreadId && (
              <StreamingMessage message={streamingMessage} />
            )}
            {messages.length === 0 && !streamingMessage && (
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
                    disabled={sending || isStreaming}
                    className="rounded-full border border-[#EEE] bg-white px-4 py-2 text-xs text-[#666] transition-colors hover:border-[#DDD] hover:text-black disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <ChatInput
              onSend={handleSend}
              disabled={sending}
              isStreaming={isStreaming}
              onInterrupt={handleInterrupt}
            />
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
