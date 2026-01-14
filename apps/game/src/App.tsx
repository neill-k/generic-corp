import { useEffect } from "react";
import { GameCanvas } from "./components/GameCanvas";
import { Dashboard } from "./components/Dashboard";
import { ActivityFeed } from "./components/ActivityFeed";
import { useSocket } from "./hooks/useSocket";
import { useGameStore } from "./store/gameStore";

function App() {
  const { connect, disconnect } = useSocket();
  const { isConnected, agents } = useGameStore();

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-12 bg-corp-mid border-b border-corp-accent flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-corp-highlight font-semibold">GENERIC CORP</span>
          <span className="text-gray-500 text-sm">v0.1.0</span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm ${isConnected ? "text-green-400" : "text-red-400"}`}>
            {isConnected ? "● Connected" : "○ Disconnected"}
          </span>
          <span className="text-sm text-gray-400">
            Agents: {agents.length}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Game View (Left) */}
        <div className="flex-1 relative">
          <GameCanvas />
        </div>

        {/* Sidebar (Right) */}
        <div className="w-80 bg-corp-mid border-l border-corp-accent flex flex-col">
          <Dashboard />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

export default App;
