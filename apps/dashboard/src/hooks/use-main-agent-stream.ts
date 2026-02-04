import { useEffect, useCallback } from "react";
import type { MainAgentStreamEvent } from "@generic-corp/shared";
import { getSocket } from "../lib/socket.js";
import { useChatStore } from "../store/chat-store.js";

export function useMainAgentStream(threadId: string | null) {
  const {
    streamingMessage,
    startStream,
    appendDelta,
    appendThinkingDelta,
    startToolCall,
    completeToolCall,
    completeStream,
    errorStream,
    appendMessage,
  } = useChatStore();

  // Join/leave thread room when threadId changes
  useEffect(() => {
    if (!threadId) return;
    const socket = getSocket();

    socket.emit("join_thread", threadId);
    return () => {
      socket.emit("leave_thread", threadId);
    };
  }, [threadId]);

  // Register socket listeners for streaming events
  useEffect(() => {
    if (!threadId) return;
    const socket = getSocket();

    const handler = (event: MainAgentStreamEvent) => {
      // Only process events for this thread
      if (event.threadId !== threadId) return;

      switch (event.type) {
        case "turn_start":
          startStream(event.turnId, event.threadId);
          break;
        case "text_delta":
          appendDelta(event.delta);
          break;
        case "thinking_delta":
          appendThinkingDelta(event.delta);
          break;
        case "tool_start":
          startToolCall(event.toolUseId, event.toolName, event.input);
          break;
        case "tool_result":
          completeToolCall(event.toolUseId, event.output, event.isError);
          break;
        case "turn_complete":
          completeStream(event.messageId, event.fullText);
          break;
        case "stream_error":
          errorStream(event.error);
          break;
      }
    };

    socket.on("main_agent_stream", handler);
    return () => {
      socket.off("main_agent_stream", handler);
    };
  }, [
    threadId,
    startStream,
    appendDelta,
    appendThinkingDelta,
    startToolCall,
    completeToolCall,
    completeStream,
    errorStream,
  ]);

  const sendMessage = useCallback(
    (body: string) => {
      if (!threadId) return;
      const socket = getSocket();

      // Optimistically add user message to the store
      appendMessage({
        id: crypto.randomUUID(),
        fromAgentId: null,
        toAgentId: "main-agent",
        threadId,
        body,
        type: "chat",
        createdAt: new Date().toISOString(),
      });

      // Emit via socket
      socket.emit("chat_message", { body, threadId });
    },
    [threadId, appendMessage],
  );

  const interrupt = useCallback(() => {
    if (!threadId) return;
    const socket = getSocket();
    socket.emit("chat_interrupt", { threadId });
  }, [threadId]);

  return {
    sendMessage,
    interrupt,
    isStreaming: streamingMessage?.isStreaming ?? false,
  };
}
