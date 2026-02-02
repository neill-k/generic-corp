import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdir, writeFile, unlink, rmdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

describe("Task File Operations", () => {
  const testTeam = "test-team-" + Date.now();
  const tasksDir = join(homedir(), ".claude", "tasks", testTeam);

  beforeAll(async () => {
    // Create test directory
    await mkdir(tasksDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up test directory
    try {
      await rmdir(tasksDir, { recursive: true });
    } catch {
      // Ignore errors
    }
  });

  it("should create and read a task file", async () => {
    const taskId = "1";
    const taskData = {
      id: taskId,
      subject: "Test Task",
      description: "This is a test task",
      status: "pending" as const,
      owner: "test-user",
    };

    const filePath = join(tasksDir, `${taskId}.json`);

    // Write task file
    await writeFile(filePath, JSON.stringify(taskData, null, 2), "utf-8");

    // Read it back
    const { readFile } = await import("fs/promises");
    const content = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.id).toBe(taskId);
    expect(parsed.subject).toBe("Test Task");
    expect(parsed.status).toBe("pending");

    // Clean up
    await unlink(filePath);
  });

  it("should handle task file paths correctly", () => {
    const filePath = join(tasksDir, "1.json");
    const parts = filePath.split("/");
    const tasksIndex = parts.findIndex((p) => p === "tasks");
    const team = parts[tasksIndex + 1];
    const fileName = parts[parts.length - 1];
    const taskId = fileName.replace(/\.json$/, "");

    expect(team).toBe(testTeam);
    expect(taskId).toBe("1");
  });
});
