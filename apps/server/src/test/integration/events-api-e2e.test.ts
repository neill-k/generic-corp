import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io as ioClient, type Socket } from "socket.io-client";

describe("Claude Events API Integration E2E", () => {
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  let socket: Socket;

  beforeAll(async () => {
    // Connect WebSocket client
    socket = ioClient(serverUrl, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      socket.on("connect", () => resolve());
    });
  });

  afterAll(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  it("should accept and store a Claude event via POST /api/claude-events", async () => {
    const testEvent = {
      timestamp: new Date().toISOString(),
      event: "PreToolUse",
      sessionId: "test-session-" + Date.now(),
      tool: "Read",
      args: { file_path: "/test/file.ts" },
    };

    const response = await fetch(`${serverUrl}/api/claude-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testEvent),
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it("should reject invalid event types", async () => {
    const invalidEvent = {
      timestamp: new Date().toISOString(),
      event: "InvalidEventType",
      sessionId: "test-session-invalid",
    };

    const response = await fetch(`${serverUrl}/api/claude-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidEvent),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("Invalid event type");
  });

  it("should reject events missing required fields", async () => {
    const incompleteEvent = {
      event: "SessionStart",
      // Missing timestamp and sessionId
    };

    const response = await fetch(`${serverUrl}/api/claude-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(incompleteEvent),
    });

    expect(response.status).toBe(400);
    const result = await response.json();
    expect(result.error).toContain("Required");
  });

  it("should retrieve recent events via GET /api/claude-events", async () => {
    const sessionId = "test-session-retrieve-" + Date.now();

    // Create test events
    const events = [
      {
        timestamp: new Date().toISOString(),
        event: "SessionStart",
        sessionId,
      },
      {
        timestamp: new Date().toISOString(),
        event: "PreToolUse",
        sessionId,
        tool: "Bash",
        args: { command: "ls" },
      },
      {
        timestamp: new Date().toISOString(),
        event: "PostToolUse",
        sessionId,
        tool: "Bash",
        result: "file1.txt\nfile2.txt",
      },
    ];

    // Post all events
    for (const event of events) {
      await fetch(`${serverUrl}/api/claude-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    }

    // Retrieve events
    const response = await fetch(`${serverUrl}/api/claude-events?limit=50`);
    expect(response.ok).toBe(true);

    const retrieved = await response.json();
    expect(Array.isArray(retrieved)).toBe(true);
    expect(retrieved.length).toBeGreaterThan(0);
  });

  it("should retrieve events by session ID", async () => {
    const sessionId = "test-session-specific-" + Date.now();

    // Create events for specific session
    const events = [
      {
        timestamp: new Date().toISOString(),
        event: "SessionStart",
        sessionId,
      },
      {
        timestamp: new Date().toISOString(),
        event: "UserPromptSubmit",
        sessionId,
        prompt: "Test prompt",
      },
    ];

    for (const event of events) {
      await fetch(`${serverUrl}/api/claude-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
    }

    // Wait a bit for processing
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Retrieve events for this session
    const response = await fetch(
      `${serverUrl}/api/claude-events?sessionId=${sessionId}`
    );
    expect(response.ok).toBe(true);

    const retrieved = await response.json();
    expect(Array.isArray(retrieved)).toBe(true);

    // All retrieved events should belong to this session
    const sessionEvents = retrieved.filter(
      (e: any) => e.sessionId === sessionId
    );
    expect(sessionEvents.length).toBeGreaterThanOrEqual(2);
  });

  it("should handle all valid event types", async () => {
    const sessionId = "test-session-all-types-" + Date.now();
    const validEventTypes = [
      "PreToolUse",
      "PostToolUse",
      "SessionStart",
      "SessionEnd",
      "UserPromptSubmit",
      "Stop",
    ];

    for (const eventType of validEventTypes) {
      const event = {
        timestamp: new Date().toISOString(),
        event: eventType,
        sessionId,
        ...(eventType.includes("ToolUse") && {
          tool: "Read",
          args: { file_path: "/test" },
        }),
      };

      const response = await fetch(`${serverUrl}/api/claude-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });

      expect(response.status).toBe(201);
    }
  });

  it("should handle high-frequency event posting", async () => {
    const sessionId = "test-session-high-freq-" + Date.now();
    const eventCount = 50;

    const promises = [];
    for (let i = 0; i < eventCount; i++) {
      const event = {
        timestamp: new Date().toISOString(),
        event: "PreToolUse",
        sessionId,
        tool: "Read",
        args: { file_path: `/test/file${i}.ts` },
      };

      promises.push(
        fetch(`${serverUrl}/api/claude-events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
        })
      );
    }

    const responses = await Promise.all(promises);
    const successCount = responses.filter((r) => r.status === 201).length;

    // Should handle most/all events successfully
    expect(successCount).toBeGreaterThan(eventCount * 0.9); // 90% success rate
  });
});
