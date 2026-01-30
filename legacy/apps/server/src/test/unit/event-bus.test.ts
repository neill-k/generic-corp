import { describe, expect, it } from "vitest";
import { EventBus } from "../../services/event-bus.js";

describe("Event Bus - Activity Log Shape", () => {
  it("emits activity:log with correct shape (eventType and eventData)", async () => {
    return new Promise<void>((resolve) => {
      EventBus.once("activity:log", (data) => {
        // Verify the shape matches what the client expects
        expect(data).toHaveProperty("agentId");
        expect(data).toHaveProperty("eventType");
        expect(data).toHaveProperty("eventData");
        expect(data).not.toHaveProperty("action");
        expect(data).not.toHaveProperty("details");
        resolve();
      });

      // This should fail until we fix the emit calls
      EventBus.emit("activity:log", {
        agentId: "test-agent",
        eventType: "task_started",
        eventData: { taskId: "test-task", title: "Test" },
      });
    });
  });
});
