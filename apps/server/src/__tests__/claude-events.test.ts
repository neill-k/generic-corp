import { describe, it, expect, beforeEach } from "vitest";
import { claudeEventsService, type ClaudeEvent } from "../services/claudeEvents.js";

describe("Claude Events Service", () => {
  beforeEach(async () => {
    // Clear events before each test
    await claudeEventsService.clearEvents();
  });

  it("should add and retrieve events", async () => {
    const event: ClaudeEvent = {
      timestamp: new Date().toISOString(),
      event: "SessionStart",
      sessionId: "test-123",
      data: {},
    };

    await claudeEventsService.addEvent(event);

    const events = await claudeEventsService.getRecentEvents(10);
    expect(events).toHaveLength(1);
    expect(events[0].sessionId).toBe("test-123");
    expect(events[0].event).toBe("SessionStart");
  });

  it("should filter events by session", async () => {
    await claudeEventsService.addEvent({
      timestamp: new Date().toISOString(),
      event: "SessionStart",
      sessionId: "session-1",
      data: {},
    });

    await claudeEventsService.addEvent({
      timestamp: new Date().toISOString(),
      event: "SessionStart",
      sessionId: "session-2",
      data: {},
    });

    const session1Events = await claudeEventsService.getSessionEvents("session-1", 10);
    expect(session1Events).toHaveLength(1);
    expect(session1Events[0].sessionId).toBe("session-1");
  });

  it("should emit event to listeners", async () => {
    let receivedEvent: any = null;

    claudeEventsService.once("event", (event) => {
      receivedEvent = event;
    });

    await claudeEventsService.addEvent({
      timestamp: new Date().toISOString(),
      event: "PreToolUse",
      sessionId: "test-456",
      data: { tool_name: "Read" },
    });

    // Give event loop a tick
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(receivedEvent).not.toBeNull();
    expect(receivedEvent.event).toBe("PreToolUse");
    expect(receivedEvent.sessionId).toBe("test-456");
  });

  it("should respect buffer size limits", async () => {
    // Add more events than buffer size
    const maxBuffer = 1000;
    for (let i = 0; i < maxBuffer + 100; i++) {
      await claudeEventsService.addEvent({
        timestamp: new Date().toISOString(),
        event: "UserPromptSubmit",
        sessionId: `session-${i}`,
        data: { prompt: `test ${i}` },
      });
    }

    const events = await claudeEventsService.getRecentEvents(maxBuffer + 200);
    expect(events.length).toBeLessThanOrEqual(maxBuffer);
  });
});
