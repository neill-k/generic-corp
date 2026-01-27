#!/usr/bin/env tsx
/**
 * Test script for Claude events service
 * Usage: tsx src/test-claude-events.ts
 */

import { claudeEventsService } from "./services/claudeEvents.js";

async function testClaudeEvents() {
  console.log("Testing Claude Events Service\n");

  // Test 1: Add events
  console.log("1. Adding test events...");
  await claudeEventsService.addEvent({
    timestamp: new Date().toISOString(),
    event: "SessionStart",
    sessionId: "test-session-1",
    data: {},
  });

  await claudeEventsService.addEvent({
    timestamp: new Date().toISOString(),
    event: "PreToolUse",
    sessionId: "test-session-1",
    data: {
      tool_name: "Read",
      tool_input: { file_path: "/test/file.ts" },
    },
  });

  await claudeEventsService.addEvent({
    timestamp: new Date().toISOString(),
    event: "PostToolUse",
    sessionId: "test-session-1",
    data: {
      tool_name: "Read",
      tool_response: { content: "file contents..." },
    },
  });

  console.log("✓ Added 3 test events\n");

  // Test 2: Get recent events
  console.log("2. Fetching recent events...");
  const recentEvents = await claudeEventsService.getRecentEvents(10);
  console.log(`✓ Found ${recentEvents.length} events`);
  console.log("Recent events:", JSON.stringify(recentEvents, null, 2));
  console.log();

  // Test 3: Get session events
  console.log("3. Fetching events for test-session-1...");
  const sessionEvents = await claudeEventsService.getSessionEvents("test-session-1", 10);
  console.log(`✓ Found ${sessionEvents.length} events for session`);
  console.log("Session events:", JSON.stringify(sessionEvents, null, 2));
  console.log();

  // Test 4: Event listener
  console.log("4. Testing event listener...");
  let receivedEvent = false;
  claudeEventsService.once("event", (event) => {
    console.log("✓ Received event via listener:", event.event);
    receivedEvent = true;
  });

  await claudeEventsService.addEvent({
    timestamp: new Date().toISOString(),
    event: "UserPromptSubmit",
    sessionId: "test-session-2",
    data: { prompt: "Test prompt" },
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
  if (receivedEvent) {
    console.log("✓ Event listener working\n");
  } else {
    console.error("✗ Event listener not working\n");
  }

  console.log("All tests completed!");
  process.exit(0);
}

testClaudeEvents().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
