import { useEffect } from "react";
import { GameCanvas } from "../components/GameCanvas";
import { Dashboard } from "../components/Dashboard";
import { ActivityFeed } from "../components/ActivityFeed";
import { MessageCenter } from "../components/MessageCenter";
import { useSocket } from "../hooks/useSocket";
import { useGameStore } from "../store/gameStore";

export function GamePage() {
  const { connect, disconnect } = useSocket();
  const { isConnected, agents, activePanel, setActivePanel, messages, pendingDrafts } = useGameStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Count unread messages (messages with pending status)
  const unreadCount = messages.filter((m) => m.status === "pending").length;
  const totalNotifications = unreadCount + pendingDrafts.length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-corp-dark text-white font-mono">
      {/* Header */}
      <header className="h-12 bg-corp-mid border-b border-corp-accent flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-corp-highlight font-bold tracking-wider">GENERIC CORP</span>
          <span className="text-gray-600 text-xs">v0.1.0</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <span className={`text-xs ${isConnected ? "text-green-400" : "text-red-400"}`}>
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {/* Agent count */}
          <div className="text-xs text-gray-400">
            <span className="text-corp-highlight">{agents.length}</span> Agents
          </div>
          {/* Notification badge */}
          {totalNotifications > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-900/50 rounded text-xs text-yellow-300">
              <span>!</span>
              <span>{totalNotifications}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Game View (Left) */}
        <div className="flex-1 relative">
          <GameCanvas />

          {/* Floating controls */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="px-3 py-1.5 bg-corp-dark/80 backdrop-blur-sm rounded text-xs text-gray-400">
              Drag to pan • Scroll to zoom
            </div>
          </div>
        </div>

        {/* Sidebar (Right) */}
        <div className="w-80 bg-corp-mid border-l border-corp-accent flex flex-col flex-shrink-0">
          {/* Panel tabs */}
          <div className="flex border-b border-corp-accent">
            <button
              onClick={() => setActivePanel("dashboard")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                activePanel === "dashboard"
                  ? "bg-corp-dark text-corp-highlight border-b-2 border-corp-highlight"
                  : "text-gray-400 hover:text-white hover:bg-corp-dark/50"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActivePanel("messages")}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors relative ${
                activePanel === "messages"
                  ? "bg-corp-dark text-corp-highlight border-b-2 border-corp-highlight"
                  : "text-gray-400 hover:text-white hover:bg-corp-dark/50"
              }`}
            >
              Messages
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-2 w-4 h-4 bg-corp-highlight rounded-full text-[10px] flex items-center justify-center text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {activePanel === "dashboard" ? (
              <>
                <Dashboard />
                <ActivityFeed />
              </>
            ) : (
              <MessageCenter />
            )}
          </div>
        </div>
      </div>

      {/* Footer status bar */}
      <footer className="h-6 bg-corp-dark border-t border-corp-accent flex items-center justify-between px-4 text-[10px] text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span>WebSocket: {isConnected ? "ws://localhost:3000" : "disconnected"}</span>
          <span>|</span>
          <span>Phase 2: Core Game Interface</span>
        </div>
        <div className="flex items-center gap-4">
          <span>60 FPS Target</span>
          <span>|</span>
          <span>Phaser 3.80+</span>
        </div>
      </footer>
    </div>
  );
}
