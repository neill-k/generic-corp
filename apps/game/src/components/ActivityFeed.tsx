import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import type { ActivityEvent, ActivityEventType } from "@generic-corp/shared";

interface ActivityFeedProps {
  maxEvents?: number;
  autoScroll?: boolean;
  filter?: ActivityEventType[];
  onEventClick?: (event: ActivityEvent) => void;
}

export function ActivityFeed({
  maxEvents = 50,
  autoScroll = true,
  filter,
  onEventClick,
}: ActivityFeedProps = {}) {
  const { activities, agents } = useGameStore();
  const feedRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottom = useRef(true);

  // Filter events if filter provided
  const filteredEvents = filter
    ? activities.filter((e) => filter.includes(e.type))
    : activities;

  // Limit to maxEvents
  const displayEvents = filteredEvents.slice(0, maxEvents);

  // Auto-scroll to top when new events arrive (events are prepended)
  useEffect(() => {
    if (autoScroll && isScrolledToBottom.current && feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [displayEvents.length, autoScroll]);

  // Track if user is at the top
  const handleScroll = () => {
    if (feedRef.current) {
      isScrolledToBottom.current = feedRef.current.scrollTop < 50;
    }
  };

  const getAgentName = (agentId: string | null, agentName: string | null) => {
    if (agentName) return agentName;
    if (agentId) {
      return agents.find((a) => a.id === agentId)?.name || "Unknown";
    }
    return null;
  };

  return (
    <div className="h-48 overflow-hidden flex flex-col p-4 border-t border-corp-accent">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs text-gray-500 uppercase tracking-wide">
          Activity Feed
        </h2>
        <span className="text-[10px] text-gray-600">
          {displayEvents.length} events
        </span>
      </div>

      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 font-mono text-xs"
      >
        {displayEvents.length === 0 ? (
          <p className="text-gray-500 italic text-center py-4">
            No activity yet
          </p>
        ) : (
          displayEvents.map((event, index) => (
            <ActivityEventRow
              key={event.id || index}
              event={event}
              agentName={getAgentName(event.agentId, event.agentName)}
              onClick={onEventClick ? () => onEventClick(event) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ActivityEventRowProps {
  event: ActivityEvent;
  agentName: string | null;
  onClick?: () => void;
}

function ActivityEventRow({ event, agentName, onClick }: ActivityEventRowProps) {
  const config = getEventConfig(event.type);

  return (
    <div
      className={`flex items-start gap-2 py-1 border-b border-corp-accent/30 last:border-0 ${
        onClick ? "hover:bg-corp-mid cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      {/* Timestamp */}
      <span className="text-gray-600 shrink-0 text-[10px]">
        {formatTime(event.timestamp)}
      </span>

      {/* Icon */}
      <span className={`shrink-0 ${config.color}`}>{config.icon}</span>

      {/* Agent name (if applicable) */}
      {agentName && (
        <span className="text-corp-highlight shrink-0">[{agentName}]</span>
      )}

      {/* Message */}
      <span className={`text-gray-300 truncate ${config.textColor || ""}`}>
        {event.message || event.type.replace(/_/g, " ")}
      </span>
    </div>
  );
}

// Event type configuration

interface EventConfig {
  icon: string;
  color: string;
  textColor?: string;
}

function getEventConfig(type: ActivityEventType): EventConfig {
  const configs: Record<ActivityEventType, EventConfig> = {
    agent_status_changed: { icon: "●", color: "text-blue-400" },
    task_started: { icon: "▶", color: "text-green-400" },
    task_completed: { icon: "✓", color: "text-green-400" },
    task_failed: { icon: "✗", color: "text-red-400", textColor: "text-red-300" },
    task_progress: { icon: "◐", color: "text-yellow-400" },
    tool_called: { icon: "⚙", color: "text-orange-400" },
    message_sent: { icon: "→", color: "text-purple-400" },
    message_received: { icon: "←", color: "text-purple-400" },
    draft_created: { icon: "📝", color: "text-yellow-400" },
    draft_approved: { icon: "✓", color: "text-green-400" },
    draft_rejected: { icon: "✗", color: "text-red-400" },
    error: { icon: "!", color: "text-red-500", textColor: "text-red-400" },
    system: { icon: "ℹ", color: "text-gray-500" },
  };

  return configs[type] || { icon: "•", color: "text-gray-400" };
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
