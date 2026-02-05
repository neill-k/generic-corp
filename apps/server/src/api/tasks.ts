import { Router } from "express";
import { readFile, writeFile, readdir, unlink, mkdir, stat } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { Request, Response } from "express";

const router = Router();

interface TaskFile {
  id: string;
  subject: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  owner?: string;
  blocks?: string[];
  blockedBy?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * GET /api/claude-tasks/:team - List all tasks for a team
 */
router.get("/:team", async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.params["team"] ?? "";
    const tasksDir = join(homedir(), ".claude", "tasks", team);

    // Check if directory exists
    try {
      await stat(tasksDir);
    } catch {
      res.json([]); // Team has no tasks yet
      return;
    }

    // Read all JSON files in the directory
    const files = await readdir(tasksDir);
    const taskFiles = files.filter((f) => f.endsWith(".json"));

    // Read and parse all task files
    const tasks = await Promise.all(
      taskFiles.map(async (file) => {
        const filePath = join(tasksDir, file);
        const content = await readFile(filePath, "utf-8");
        const task = JSON.parse(content) as TaskFile;
        return task;
      })
    );

    res.json(tasks);
  } catch (error) {
    console.error("[API] Error listing tasks:", error);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

/**
 * GET /api/claude-tasks/:team/:taskId - Get single task
 */
router.get("/:team/:taskId", async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.params["team"] ?? "";
    const taskId = req.params["taskId"] ?? "";
    const filePath = join(homedir(), ".claude", "tasks", team, `${taskId}.json`);

    // Read task file
    const content = await readFile(filePath, "utf-8");
    const task = JSON.parse(content) as TaskFile;

    res.json(task);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    console.error("[API] Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

/**
 * POST /api/claude-tasks/:team - Create task
 */
router.post("/:team", async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.params["team"] ?? "";
    const taskData = req.body as Omit<TaskFile, "id">;

    if (!taskData.subject || !taskData.description) {
      res.status(400).json({ error: "subject and description are required" });
      return;
    }

    const tasksDir = join(homedir(), ".claude", "tasks", team);

    // Ensure directory exists
    await mkdir(tasksDir, { recursive: true });

    // Find next available task ID
    const files = await readdir(tasksDir);
    const taskFiles = files.filter((f) => f.endsWith(".json"));
    const existingIds = taskFiles
      .map((f) => parseInt(f.replace(".json", ""), 10))
      .filter((id) => !isNaN(id));

    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

    // Create task with ID
    const task: TaskFile = {
      id: String(nextId),
      ...taskData,
    };

    // Write task file
    const filePath = join(tasksDir, `${nextId}.json`);
    await writeFile(filePath, JSON.stringify(task, null, 2), "utf-8");

    res.status(201).json(task);
  } catch (error) {
    console.error("[API] Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

/**
 * PUT /api/claude-tasks/:team/:taskId - Update task
 */
router.put("/:team/:taskId", async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.params["team"] ?? "";
    const taskId = req.params["taskId"] ?? "";
    const updates = req.body as Partial<TaskFile>;
    const clientMtime = req.headers["if-unmodified-since"];

    const filePath = join(homedir(), ".claude", "tasks", team, `${taskId}.json`);

    // Check if file exists and get current mtime
    let currentStats;
    try {
      currentStats = await stat(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        res.status(404).json({ error: "Task not found" });
        return;
      }
      throw error;
    }

    // Optimistic concurrency check
    if (clientMtime) {
      const clientMtimeMs = new Date(clientMtime as string).getTime();
      const serverMtimeMs = currentStats.mtimeMs;

      if (clientMtimeMs < serverMtimeMs) {
        res.status(409).json({
          error: "Conflict: Task has been modified since last read",
          serverMtime: currentStats.mtime.toISOString(),
        });
        return;
      }
    }

    // Read current task
    const content = await readFile(filePath, "utf-8");
    const currentTask = JSON.parse(content) as TaskFile;

    // Merge updates
    const updatedTask: TaskFile = {
      ...currentTask,
      ...updates,
      id: taskId, // Ensure ID doesn't change
    };

    // Write updated task
    await writeFile(filePath, JSON.stringify(updatedTask, null, 2), "utf-8");

    res.json(updatedTask);
  } catch (error) {
    console.error("[API] Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

/**
 * DELETE /api/claude-tasks/:team/:taskId - Delete task
 */
router.delete("/:team/:taskId", async (req: Request, res: Response): Promise<void> => {
  try {
    const team = req.params["team"] ?? "";
    const taskId = req.params["taskId"] ?? "";
    const filePath = join(homedir(), ".claude", "tasks", team, `${taskId}.json`);

    // Delete file
    await unlink(filePath);

    res.status(204).send();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    console.error("[API] Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
