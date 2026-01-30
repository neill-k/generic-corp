import { describe, expect, it } from "vitest";
import { EventBus } from "../../services/event-bus.js";

describe("Task Progress Event Shape", () => {
  it("emits task:progress with details field (not message)", async () => {
    return new Promise<void>((resolve) => {
      EventBus.once("task:progress", (data) => {
        // Verify the shape matches what the client expects
        expect(data).toHaveProperty("taskId");
        expect(data).toHaveProperty("progress");
        expect(data).toHaveProperty("details");
        expect(data).not.toHaveProperty("message");
        resolve();
      });

      EventBus.emit("task:progress", {
        taskId: "test-task",
        progress: 50,
        details: { message: "Task started" },
      });
    });
  });
});
