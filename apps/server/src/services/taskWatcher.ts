import chokidar, { type FSWatcher } from "chokidar";
import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import type { Server as SocketIOServer } from "socket.io";

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

export class TaskWatcher {
  private watcher: FSWatcher | null = null;
  private io: SocketIOServer;
  private taskFilesCache: Map<string, { mtime: number; data: TaskFile }> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Start watching task files in ~/.claude/tasks/
   */
  start(): void {
    const tasksDir = join(homedir(), ".claude", "tasks");

    console.log(`[TaskWatcher] Starting file watcher for ${tasksDir}`);

    this.watcher = chokidar.watch(`${tasksDir}/**/*.json`, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.watcher
      .on("add", (path: string) => this.handleFileAdd(path))
      .on("change", (path: string) => this.handleFileChange(path))
      .on("unlink", (path: string) => this.handleFileDelete(path))
      .on("error", (error: unknown) => {
        console.error("[TaskWatcher] Error:", error);
      });

    console.log("[TaskWatcher] File watcher started");
  }

  /**
   * Stop watching task files
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log("[TaskWatcher] File watcher stopped");
    }
  }

  /**
   * Handle new task file
   */
  private async handleFileAdd(filePath: string): Promise<void> {
    try {
      const { team, taskId, task, mtime } = await this.parseTaskFile(filePath);

      // Update cache
      const cacheKey = `${team}/${taskId}`;
      this.taskFilesCache.set(cacheKey, { mtime, data: task });

      // Broadcast to clients
      this.io.emit("task:created", {
        team,
        taskId,
        task,
      });

      console.log(`[TaskWatcher] Task created: ${team}/${taskId}`);
    } catch (error) {
      console.error(`[TaskWatcher] Error handling file add: ${filePath}`, error);
    }
  }

  /**
   * Handle task file change
   */
  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const { team, taskId, task, mtime } = await this.parseTaskFile(filePath);

      // Update cache
      const cacheKey = `${team}/${taskId}`;
      this.taskFilesCache.set(cacheKey, { mtime, data: task });

      // Broadcast to clients
      this.io.emit("task:updated", {
        team,
        taskId,
        task,
      });

      console.log(`[TaskWatcher] Task updated: ${team}/${taskId}`);
    } catch (error) {
      console.error(`[TaskWatcher] Error handling file change: ${filePath}`, error);
    }
  }

  /**
   * Handle task file deletion
   */
  private handleFileDelete(filePath: string): void {
    try {
      const { team, taskId } = this.extractTeamAndTaskId(filePath);

      // Remove from cache
      const cacheKey = `${team}/${taskId}`;
      this.taskFilesCache.delete(cacheKey);

      // Broadcast to clients
      this.io.emit("task:deleted", {
        team,
        taskId,
      });

      console.log(`[TaskWatcher] Task deleted: ${team}/${taskId}`);
    } catch (error) {
      console.error(`[TaskWatcher] Error handling file delete: ${filePath}`, error);
    }
  }

  /**
   * Parse task file and extract team, taskId, and task data
   */
  private async parseTaskFile(filePath: string): Promise<{
    team: string;
    taskId: string;
    task: TaskFile;
    mtime: number;
  }> {
    const { team, taskId } = this.extractTeamAndTaskId(filePath);

    // Read file content and stats
    const [content, stats] = await Promise.all([
      readFile(filePath, "utf-8"),
      import("fs/promises").then((fs) => fs.stat(filePath)),
    ]);

    const task = JSON.parse(content) as TaskFile;
    const mtime = stats.mtimeMs;

    return { team, taskId, task, mtime };
  }

  /**
   * Extract team name and task ID from file path
   * Example: /home/user/.claude/tasks/my-team/1.json -> { team: "my-team", taskId: "1" }
   */
  private extractTeamAndTaskId(filePath: string): { team: string; taskId: string } {
    const parts = filePath.split("/");
    const tasksIndex = parts.findIndex((p) => p === "tasks");

    if (tasksIndex === -1 || tasksIndex + 2 >= parts.length) {
      throw new Error(`Invalid task file path: ${filePath}`);
    }

    const team = parts[tasksIndex + 1] ?? "";
    const fileName = parts[parts.length - 1] ?? "";
    const taskId = fileName.replace(/\.json$/, "");

    return { team, taskId };
  }

  /**
   * Get cached task file metadata
   */
  getTaskMeta(team: string, taskId: string): { mtime: number; data: TaskFile } | undefined {
    const cacheKey = `${team}/${taskId}`;
    return this.taskFilesCache.get(cacheKey);
  }
}
