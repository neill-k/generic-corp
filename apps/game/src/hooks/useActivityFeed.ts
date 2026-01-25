import { useEffect, useCallback, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import type { ActivityEvent, ActivityEventType } from "@generic-corp/shared";

interface UseActivityFeedOptions {
  maxEvents?: number;
  filter?: ActivityEventType[];
  onNewEvent?: (event: ActivityEvent) => void;
}

interface UseActivityFeedReturn {
  events: ActivityEvent[];
  isAtBottom: boolean;
  scrollToBottom: () => void;
  clearEvents: () => void;
}

/**
 * Custom hook for managing the activity feed with WebSocket integration
 */
export function useActivityFeed(options: UseActivityFeedOptions = {}): UseActivityFeedReturn {
  const { maxEvents = 50, filter, onNewEvent } = options;
  const { activities, addActivity } = useGameStore();
  const previousLengthRef = useRef(activities.length);
  const isAtBottomRef = useRef(true);

  // Filter events if filter provided
  const filteredEvents = filter
    ? activities.filter((e) => filter.includes(e.type))
    : activities;

  // Limit to maxEvents
  const events = filteredEvents.slice(0, maxEvents);

  // Detect new events and call callback
  useEffect(() => {
    if (activities.length > previousLengthRef.current && onNewEvent) {
      const newEvent = activities[0]; // Most recent is first
      onNewEvent(newEvent);
    }
    previousLengthRef.current = activities.length;
  }, [activities, onNewEvent]);

  const scrollToBottom = useCallback(() => {
    isAtBottomRef.current = true;
  }, []);

  const clearEvents = useCallback(() => {
    // This would need to be added to the store
    console.log("[useActivityFeed] Clear not implemented in store");
  }, []);

  // Helper to add an activity (for manual additions)
  const addEvent = useCallback(
    (event: Omit<ActivityEvent, "id" | "timestamp">) => {
      const fullEvent: ActivityEvent = {
        ...event,
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
      };
      addActivity(fullEvent);
    },
    [addActivity]
  );

  return {
    events,
    isAtBottom: isAtBottomRef.current,
    scrollToBottom,
    clearEvents,
  };
}

/**
 * Create an activity event helper
 */
export function createActivityEvent(
  type: ActivityEventType,
  message: string,
  agentId?: string,
  agentName?: string,
  details?: Record<string, unknown>
): ActivityEvent {
  return {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    agentId: agentId ?? null,
    agentName: agentName ?? null,
    message,
    details,
    timestamp: new Date(),
  };
}
