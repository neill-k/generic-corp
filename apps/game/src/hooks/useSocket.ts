import { useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { WS_EVENTS } from "@generic-corp/shared";
import { useGameStore } from "../store/gameStore";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnected,
    setAgents,
    setPendingDrafts,
    setBudget,
    updateAgent,
    updateTask,
    addTask,
    addPendingDraft,
    addActivity,
  } = useGameStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setConnected(false);
    });

    // Initial state
    socket.on(WS_EVENTS.INIT, (data) => {
      console.log("[Socket] Received initial state:", data);
      setAgents(data.agents || []);
      setPendingDrafts(data.pendingDrafts || []);
      // Set tasks from initial state
      if (data.tasks && Array.isArray(data.tasks)) {
        data.tasks.forEach((task: any) => {
          addTask(task);
        });
      }
      if (data.gameState) {
        // Ensure budget values are numbers (Prisma Decimal may serialize as string)
        const remaining = typeof data.gameState.budgetRemainingUsd === "string"
          ? parseFloat(data.gameState.budgetRemainingUsd)
          : Number(data.gameState.budgetRemainingUsd);
        const limit = typeof data.gameState.budgetLimitUsd === "string"
          ? parseFloat(data.gameState.budgetLimitUsd)
          : Number(data.gameState.budgetLimitUsd);
        setBudget({
          remaining: remaining || 100,
          limit: limit || 100,
        });
      }
    });

    // Agent status updates
    socket.on(WS_EVENTS.AGENT_STATUS, (data) => {
      console.log("[Socket] Agent status:", data);
      updateAgent(data.agentId, { status: data.status });
    });

    // Task updates
    socket.on(WS_EVENTS.TASK_PROGRESS, (data) => {
      console.log("[Socket] Task progress:", data);
      updateTask(data.taskId, { 
        progressPercent: typeof data.progress === 'number' ? data.progress : 0,
        progressDetails: data.details || {}
      });
    });

    socket.on(WS_EVENTS.TASK_COMPLETED, (data) => {
      console.log("[Socket] Task completed:", data);
      updateTask(data.taskId, { 
        status: "completed",
        completedAt: new Date()
      });
    });

    socket.on(WS_EVENTS.TASK_FAILED, (data) => {
      console.log("[Socket] Task failed:", data);
      updateTask(data.taskId, { status: "failed" });
    });

    // Draft notifications
    socket.on(WS_EVENTS.DRAFT_PENDING, (data) => {
      console.log("[Socket] New draft pending:", data);
      addPendingDraft(data);
    });

    // Activity log
    socket.on(WS_EVENTS.ACTIVITY_LOG, (data) => {
      console.log("[Socket] Activity:", data);
      addActivity(data);
    });

    // Heartbeat
    socket.on(WS_EVENTS.HEARTBEAT, () => {
      // Just keep-alive, no action needed
    });

    socketRef.current = socket;
  }, [
    setConnected,
    setAgents,
    setPendingDrafts,
    setBudget,
    updateAgent,
    updateTask,
    addTask,
    addPendingDraft,
    addActivity,
  ]);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const assignTask = useCallback(
    (
      agentId: string,
      title: string,
      description: string,
      priority: string = "normal"
    ): Promise<{ success: boolean; taskId?: string; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          WS_EVENTS.TASK_ASSIGN,
          { agentId, title, description, priority },
          resolve
        );
      });
    },
    []
  );

  const approveDraft = useCallback(
    (draftId: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(WS_EVENTS.DRAFT_APPROVE, { draftId }, resolve);
      });
    },
    []
  );

  const rejectDraft = useCallback(
    (
      draftId: string,
      reason?: string
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          WS_EVENTS.DRAFT_REJECT,
          { draftId, reason },
          resolve
        );
      });
    },
    []
  );

  const sendMessage = useCallback(
    (
      toAgentId: string,
      subject: string,
      body: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: "Not connected" });
          return;
        }

        socketRef.current.emit(
          WS_EVENTS.MESSAGE_SEND,
          { toAgentId, subject, body },
          resolve
        );
      });
    },
    []
  );

  return {
    connect,
    disconnect,
    assignTask,
    approveDraft,
    rejectDraft,
    sendMessage,
    socket: socketRef.current,
  };
}
