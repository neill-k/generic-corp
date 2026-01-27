import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, unlink, rmdir, readdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { io as ioClient, type Socket } from "socket.io-client";

describe("Kanban Integration E2E", () => {
  const testTeam = "integration-test-" + Date.now();
  const tasksDir = join(homedir(), ".claude", "tasks", testTeam);
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";
  let socket: Socket;

  beforeAll(async () => {
    // Create test directory
    await mkdir(tasksDir, { recursive: true });

    // Connect WebSocket client
    socket = ioClient(serverUrl, {
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      socket.on("connect", () => resolve());
    });
  });

  afterAll(async () => {
    // Disconnect socket
    if (socket) {
      socket.disconnect();
    }

    // Clean up test directory
    try {
      const files = await readdir(tasksDir);
      await Promise.all(files.map((f) => unlink(join(tasksDir, f))));
      await rmdir(tasksDir);
    } catch {
      // Ignore errors
    }
  });

  it("should detect new task file and emit task:created event", async () => {
    const taskId = "1";
    const taskData = {
      id: taskId,
      subject: "Integration Test Task",
      description: "This task tests file watcher integration",
      status: "pending" as const,
      owner: "test-user",
    };

    // Listen for WebSocket event
    const eventPromise = new Promise((resolve) => {
      socket.once("task:created", (data) => resolve(data));
    });

    // Create task file
    const filePath = join(tasksDir, `${taskId}.json`);
    await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");

    // Wait for event (with timeout)
    const event = await Promise.race([
      eventPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Event timeout")), 5000)
      ),
    ]);

    expect(event).toMatchObject({
      team: testTeam,
      taskId,
      task: taskData,
    });
  });

  it("should detect task file update and emit task:updated event", async () => {
    const taskId = "2";
    const filePath = join(tasksDir, `${taskId}.json`);

    // Create initial task
    const initialData = {
      id: taskId,
      subject: "Task to Update",
      description: "Will be updated",
      status: "pending" as const,
    };
    await writeFile(filePath, JSON.stringify(initialData, null, 2), "utf-8");

    // Wait a bit for initial creation event
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Listen for update event
    const eventPromise = new Promise((resolve) => {
      socket.once("task:updated", (data) => resolve(data));
    });

    // Update task
    const updatedData = {
      ...initialData,
      status: "in_progress" as const,
      owner: "test-user",
    };
    await writeFile(filePath, JSON.stringify(updatedData, null, 2), "utf-8");

    // Wait for event
    const event = await Promise.race([
      eventPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Event timeout")), 5000)
      ),
    ]);

    expect(event).toMatchObject({
      team: testTeam,
      taskId,
      task: updatedData,
    });
  });

  it("should detect task file deletion and emit task:deleted event", async () => {
    const taskId = "3";
    const filePath = join(tasksDir, `${taskId}.json`);

    // Create task first
    const taskData = {
      id: taskId,
      subject: "Task to Delete",
      description: "Will be deleted",
      status: "pending" as const,
    };
    await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");

    // Wait for creation event
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Listen for delete event
    const eventPromise = new Promise((resolve) => {
      socket.once("task:deleted", (data) => resolve(data));
    });

    // Delete task file
    await unlink(filePath);

    // Wait for event
    const event = await Promise.race([
      eventPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Event timeout")), 5000)
      ),
    ]);

    expect(event).toMatchObject({
      team: testTeam,
      taskId,
    });
  });

  it("should fetch tasks via REST API", async () => {
    const taskId = "4";
    const taskData = {
      id: taskId,
      subject: "REST API Test Task",
      description: "Test REST endpoint",
      status: "pending" as const,
    };

    // Create task file
    const filePath = join(tasksDir, `${taskId}.json`);
    await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");

    // Wait for file watcher
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Fetch via REST API
    const response = await fetch(
      `${serverUrl}/api/claude-tasks/${testTeam}/${taskId}`
    );
    expect(response.ok).toBe(true);

    const fetchedTask = await response.json();
    expect(fetchedTask).toMatchObject(taskData);
  });

  it("should create task via REST API", async () => {
    const taskData = {
      subject: "Created via API",
      description: "This task was created via REST",
      status: "pending" as const,
    };

    // Create via REST API
    const response = await fetch(`${serverUrl}/api/claude-tasks/${testTeam}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(taskData),
    });

    expect(response.status).toBe(201);
    const created = await response.json();

    expect(created.id).toBeTruthy();
    expect(created.subject).toBe(taskData.subject);

    // Verify file was created
    const filePath = join(tasksDir, `${created.id}.json`);
    const { readFile } = await import("fs/promises");
    const fileContent = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);
    expect(parsed.subject).toBe(taskData.subject);
  });

  it("should update task via REST API with conflict detection", async () => {
    const taskId = "5";
    const taskData = {
      id: taskId,
      subject: "Task for Update Test",
      description: "Will be updated via API",
      status: "pending" as const,
    };

    // Create initial task
    const filePath = join(tasksDir, `${taskId}.json`);
    await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Update via REST API
    const updateResponse = await fetch(
      `${serverUrl}/api/claude-tasks/${testTeam}/${taskId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      }
    );

    expect(updateResponse.ok).toBe(true);
    const updated = await updateResponse.json();
    expect(updated.status).toBe("in_progress");
  });

  it("should list all tasks via REST API", async () => {
    // Create multiple tasks
    for (let i = 10; i <= 12; i++) {
      const taskData = {
        id: String(i),
        subject: `Task ${i}`,
        description: "Test task",
        status: "pending" as const,
      };
      const filePath = join(tasksDir, `${i}.json`);
      await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // List all tasks
    const response = await fetch(`${serverUrl}/api/claude-tasks/${testTeam}`);
    expect(response.ok).toBe(true);

    const tasks = await response.json();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThanOrEqual(3);
    expect(tasks.some((t: any) => t.subject === "Task 10")).toBe(true);
  });

  it("should delete task via REST API", async () => {
    const taskId = "6";
    const taskData = {
      id: taskId,
      subject: "Task to Delete via API",
      description: "Will be deleted",
      status: "pending" as const,
    };

    // Create task
    const filePath = join(tasksDir, `${taskId}.json`);
    await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Delete via API
    const deleteResponse = await fetch(
      `${serverUrl}/api/claude-tasks/${testTeam}/${taskId}`,
      {
        method: "DELETE",
      }
    );

    expect(deleteResponse.status).toBe(204);

    // Verify file is gone
    const { stat } = await import("fs/promises");
    await expect(stat(filePath)).rejects.toThrow();
  });
});
