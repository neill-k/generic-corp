import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";

interface Command {
  id: string;
  name: string;
  description: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onShowOnboarding: () => void;
  onSelectAgent: (agentId: string) => void;
}

/**
 * Command Palette component for Capability Discovery
 * Allows quick access to common actions via keyboard shortcut (Ctrl/Cmd+K)
 */
export function CommandPalette({
  isOpen,
  onClose,
  onShowOnboarding,
  onSelectAgent,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { agents, tasks } = useGameStore();

  // Define available commands
  const commands: Command[] = [
    // Help commands
    {
      id: "help",
      name: "Show Help / Onboarding",
      description: "View the onboarding tutorial and learn how to use Generic Corp",
      category: "Help",
      shortcut: "?",
      action: () => {
        onShowOnboarding();
        onClose();
      },
    },
    // Agent selection commands
    ...agents.map((agent) => ({
      id: `select-agent-${agent.id}`,
      name: `Select ${agent.name}`,
      description: `${agent.role} - ${agent.status}`,
      category: "Agents",
      action: () => {
        onSelectAgent(agent.id);
        onClose();
      },
    })),
    // Quick filters
    {
      id: "filter-idle-agents",
      name: "Show Idle Agents",
      description: "Filter to agents ready for new tasks",
      category: "Filters",
      action: () => {
        const idleAgent = agents.find((a) => a.status === "idle");
        if (idleAgent) {
          onSelectAgent(idleAgent.id);
        }
        onClose();
      },
    },
    {
      id: "filter-working-agents",
      name: "Show Working Agents",
      description: "Filter to agents currently executing tasks",
      category: "Filters",
      action: () => {
        const workingAgent = agents.find((a) => a.status === "working");
        if (workingAgent) {
          onSelectAgent(workingAgent.id);
        }
        onClose();
      },
    },
    // Task commands
    {
      id: "view-pending-tasks",
      name: "View Pending Tasks",
      description: `${tasks.filter((t) => t.status === "pending").length} tasks waiting to be started`,
      category: "Tasks",
      action: () => {
        // This would navigate to task view - placeholder
        onClose();
      },
    },
    {
      id: "view-in-progress-tasks",
      name: "View In Progress Tasks",
      description: `${tasks.filter((t) => t.status === "in_progress").length} tasks currently being worked on`,
      category: "Tasks",
      action: () => {
        onClose();
      },
    },
  ];

  // Filter commands based on search
  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  // Group by category
  const groupedCommands = filteredCommands.reduce(
    (acc, cmd) => {
      if (!acc[cmd.category]) {
        acc[cmd.category] = [];
      }
      acc[cmd.category].push(cmd);
      return acc;
    },
    {} as Record<string, Command[]>
  );

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch("");
    }
  }, [isOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50"
      onClick={onClose}
    >
      <div
        className="bg-corp-dark border border-corp-accent rounded-lg w-full max-w-lg mx-4 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="border-b border-corp-accent">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white placeholder-gray-500 focus:outline-none"
          />
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto">
          {Object.entries(groupedCommands).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-corp-mid/50">
                  {category}
                </div>
                {cmds.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    className="w-full px-4 py-3 text-left hover:bg-corp-mid flex justify-between items-center transition-colors"
                  >
                    <div>
                      <div className="text-white font-medium">{cmd.name}</div>
                      <div className="text-gray-500 text-sm">{cmd.description}</div>
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-xs bg-corp-accent text-gray-400 px-2 py-1 rounded font-mono">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-corp-accent px-4 py-2 text-xs text-gray-500 flex justify-between">
          <span>
            <kbd className="bg-corp-accent px-1 rounded">Enter</kbd> to select
          </span>
          <span>
            <kbd className="bg-corp-accent px-1 rounded">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
