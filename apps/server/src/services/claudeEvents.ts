import { EventEmitter } from "events";
import { createRedisClient } from "./redis-client.js";
import type { Redis } from "ioredis";

export interface ClaudeEvent {
  timestamp: string;
  event: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "UserPromptSubmit" | "Stop";
  sessionId: string;
  data: {
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    tool_response?: Record<string, unknown>;
    prompt?: string;
  };
}

interface ClaudeEventInternal extends ClaudeEvent {
  id: string;
}

class ClaudeEventsService extends EventEmitter {
  private buffer: ClaudeEventInternal[] = [];
  private readonly maxBufferSize = 1000;
  private redisClient: Redis | null = null;
  private useRedis = false;

  constructor() {
    super();
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createRedisClient();
      await this.redisClient.ping();
      this.useRedis = true;
      console.log("[ClaudeEvents] Redis storage enabled");
    } catch (error) {
      console.warn("[ClaudeEvents] Redis not available, using in-memory buffer");
      this.useRedis = false;
    }
  }

  /**
   * Add a new event to the buffer/storage and emit to subscribers
   */
  async addEvent(event: ClaudeEvent): Promise<void> {
    const eventWithId: ClaudeEventInternal = {
      ...event,
      id: `${event.sessionId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Store in memory buffer
    this.buffer.push(eventWithId);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift(); // Remove oldest
    }

    // Store in Redis if available
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.lpush(
          "claude:events",
          JSON.stringify(eventWithId)
        );
        // Keep last 1000 events in Redis
        await this.redisClient.ltrim("claude:events", 0, this.maxBufferSize - 1);
      } catch (error) {
        console.error("[ClaudeEvents] Redis storage error:", error);
      }
    }

    // Emit to WebSocket subscribers
    this.emit("event", eventWithId);
  }

  /**
   * Get recent events from buffer/storage
   */
  async getRecentEvents(limit = 100): Promise<ClaudeEventInternal[]> {
    if (this.useRedis && this.redisClient) {
      try {
        const events = await this.redisClient.lrange("claude:events", 0, limit - 1);
        return events.map((e) => JSON.parse(e));
      } catch (error) {
        console.error("[ClaudeEvents] Redis retrieval error:", error);
        // Fallback to memory
      }
    }

    // Use in-memory buffer
    return this.buffer.slice(-limit);
  }

  /**
   * Get events for a specific session
   */
  async getSessionEvents(sessionId: string, limit = 100): Promise<ClaudeEventInternal[]> {
    const allEvents = await this.getRecentEvents(this.maxBufferSize);
    return allEvents
      .filter((e) => e.sessionId === sessionId)
      .slice(-limit);
  }

  /**
   * Clear all events (for testing/admin)
   */
  async clearEvents(): Promise<void> {
    this.buffer = [];
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.del("claude:events");
      } catch (error) {
        console.error("[ClaudeEvents] Redis clear error:", error);
      }
    }
  }
}

// Singleton instance
export const claudeEventsService = new ClaudeEventsService();
