---
title: "fix: Address All PR #9 Code Review Findings"
type: fix
date: 2026-01-25
severity: critical
pr: 9
branch: claude/complete-project-phase-two-1lFmY
---

# Fix: Address All PR #9 Code Review Findings

## Overview

This plan addresses **22 findings** from the comprehensive code review of PR #9 (Phase 2-6 implementation). The findings span security vulnerabilities, data integrity issues, performance problems, and code quality concerns.

**Risk Assessment:** CRITICAL - Contains command injection vulnerabilities allowing arbitrary code execution and race conditions that can corrupt financial data.

**Recommendation:** Do not merge PR #9 until all Critical and High priority issues are resolved.

## Problem Statement

PR #9 introduces substantial infrastructure (Temporal workflows, cron jobs, MCP tools, React components) but contains:

- **7 Critical security issues** including command injection and missing authentication
- **8 High priority issues** including race conditions and data integrity problems
- **7 Medium priority issues** affecting reliability and performance

The most severe issues allow:
1. Arbitrary shell command execution via crafted inputs
2. Negative budget balances through race conditions
3. Unauthorized system control via unauthenticated WebSocket
4. Database corruption via foreign key violations

## Technical Approach

### Architecture

The remediation follows a phased approach, fixing foundational security issues first to prevent layering fixes on vulnerable code.

```
Phase 1 (Security Foundation) → Phase 2 (Permissions) → Phase 3 (Data Integrity)
    → Phase 4 (Concurrency) → Phase 5 (Reliability) → Phase 6 (Frontend)
```

### Implementation Phases

---

## Phase 1: Security Foundation

**Estimated Scope:** 5 files, ~200 LOC changes

### Issue 8: Symlink Sandbox Bypass

**File:** `apps/server/src/tools/handlers/filesystem.ts:12-33`

**Problem:** `resolveSafePath()` uses `path.normalize()` which doesn't resolve symlinks. An attacker can create a symlink within the sandbox pointing to `/etc/passwd`.

**Fix:**
```typescript
// filesystem.ts
import fs from "fs/promises";
import path from "path";

async function resolveSafePath(filePath: string): Promise<string> {
  const normalizedPath = path.normalize(filePath);

  // Resolve relative to sandbox
  const resolved = path.isAbsolute(normalizedPath)
    ? normalizedPath
    : path.resolve(SANDBOX_ROOT, normalizedPath);

  // CRITICAL: Resolve symlinks to get real path
  let realPath: string;
  try {
    realPath = await fs.realpath(resolved);
  } catch (error) {
    // File doesn't exist yet - check parent directory
    const parentDir = path.dirname(resolved);
    const parentReal = await fs.realpath(parentDir);
    realPath = path.join(parentReal, path.basename(resolved));
  }

  // Verify real path is within sandbox
  if (!realPath.startsWith(SANDBOX_ROOT)) {
    throw new Error("Access denied: Path resolves outside sandbox");
  }

  return realPath;
}

// Update all callers to use await
export async function filesystemRead(params: { path: string }): Promise<{ content: string }> {
  await ensureSandbox();
  const safePath = await resolveSafePath(params.path);  // Now async
  // ...
}
```

**Tests:**
```typescript
// filesystem.test.ts
describe("resolveSafePath", () => {
  it("blocks symlinks pointing outside sandbox", async () => {
    await fs.symlink("/etc/passwd", `${SANDBOX_ROOT}/escape`);
    await expect(resolveSafePath("escape")).rejects.toThrow("outside sandbox");
  });

  it("allows symlinks within sandbox", async () => {
    await fs.writeFile(`${SANDBOX_ROOT}/real.txt`, "content");
    await fs.symlink(`${SANDBOX_ROOT}/real.txt`, `${SANDBOX_ROOT}/link.txt`);
    const result = await resolveSafePath("link.txt");
    expect(result).toBe(`${SANDBOX_ROOT}/real.txt`);
  });
});
```

---

### Issue 1: Shell Command Injection via Blocklist Bypass

**File:** `apps/server/src/tools/handlers/shell.ts:32-65`

**Problem:** Blocklist approach with regex patterns has gaps:
- Newlines (`\n`) not blocked - allows `ls\nrm -rf /`
- Tab characters not blocked
- Unicode homoglyphs bypass (Greek semicolon `\u037e`)

**Fix:** Replace `exec` with `execFile` using argument arrays:

```typescript
// shell.ts
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const ALLOWED_COMMANDS: Record<string, string> = {
  npm: "/usr/bin/npm",
  pnpm: "/usr/local/bin/pnpm",
  node: "/usr/bin/node",
  git: "/usr/bin/git",
  ls: "/bin/ls",
  cat: "/bin/cat",
  grep: "/bin/grep",
  head: "/usr/bin/head",
  tail: "/usr/bin/tail",
  wc: "/usr/bin/wc",
  pwd: "/bin/pwd",
  mkdir: "/bin/mkdir",
  touch: "/usr/bin/touch",
};

// Restricted commands - no rm, cp, mv, find, echo
// These can be added with additional validation if needed

export async function shellExec(params: {
  command: string;
  cwd?: string;
}): Promise<ShellResult> {
  // Parse command into executable and arguments
  const parts = parseCommand(params.command);
  const executable = parts[0];
  const args = parts.slice(1);

  // Validate executable against whitelist
  const execPath = ALLOWED_COMMANDS[executable];
  if (!execPath) {
    throw new Error(`Command not allowed: ${executable}. Allowed: ${Object.keys(ALLOWED_COMMANDS).join(", ")}`);
  }

  // Validate working directory
  const cwd = params.cwd || SANDBOX_ROOT;
  const realCwd = await fs.realpath(cwd);
  if (!realCwd.startsWith(SANDBOX_ROOT) && !realCwd.startsWith(process.cwd())) {
    throw new Error("Working directory outside allowed paths");
  }

  try {
    // Use execFile with argument array - NO SHELL INTERPRETATION
    const { stdout, stderr } = await execFileAsync(execPath, args, {
      cwd: realCwd,
      maxBuffer: MAX_OUTPUT_SIZE,
      timeout: 30000,
      env: {
        PATH: "/usr/local/bin:/usr/bin:/bin",
        HOME: SANDBOX_ROOT,
        // Don't inherit potentially dangerous env vars
      },
    });

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    // ... error handling
  }
}

/**
 * Parse command string into array, handling quotes properly
 * This is safe because we use execFile which doesn't interpret shell metacharacters
 */
function parseCommand(command: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (const char of command) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
    } else if (char === " " && !inQuotes) {
      if (current) {
        result.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}
```

**Tests:**
```typescript
describe("shellExec", () => {
  it("blocks command injection via semicolon", async () => {
    await expect(shellExec({ command: "ls; rm -rf /" }))
      .rejects.toThrow("Command not allowed: ls;");
  });

  it("blocks command injection via newline", async () => {
    await expect(shellExec({ command: "ls\nrm -rf /" }))
      .rejects.toThrow(); // newline becomes part of executable name
  });

  it("blocks Unicode semicolon bypass", async () => {
    await expect(shellExec({ command: "ls\u037e rm -rf /" }))
      .rejects.toThrow();
  });

  it("executes valid commands", async () => {
    const result = await shellExec({ command: "ls -la" });
    expect(result.success).toBe(true);
  });

  it("handles quoted arguments", async () => {
    const result = await shellExec({ command: 'grep "hello world" file.txt' });
    // Arguments parsed correctly: ["grep", "hello world", "file.txt"]
  });
});
```

---

### Issue 2 & 3: Git Command Injection

**File:** `apps/server/src/tools/handlers/git.ts:72-99`

**Problem:**
- Commit message escaping insufficient (backticks, `$()` not escaped)
- File paths passed directly to shell

**Fix:**

```typescript
// git.ts
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Execute git command safely using execFile
 */
async function execGitCommand(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: MAX_OUTPUT_SIZE,
    timeout: 30000,
  });
  return { stdout, stderr };
}

export async function gitStatus(params: { repoPath: string }): Promise<GitStatusResult> {
  // Validate repo path is within allowed directories
  const realPath = await fs.realpath(params.repoPath);
  if (!isAllowedGitRepo(realPath)) {
    throw new Error("Repository path not allowed");
  }

  const { stdout: branchOutput } = await execGitCommand(
    ["branch", "--show-current"],
    realPath
  );

  const { stdout: statusOutput } = await execGitCommand(
    ["status", "--porcelain"],
    realPath
  );

  // ... rest of implementation
}

export async function gitCommit(params: {
  repoPath: string;
  message: string;
  files?: string[];
}): Promise<GitCommitResult> {
  const realPath = await fs.realpath(params.repoPath);
  if (!isAllowedGitRepo(realPath)) {
    throw new Error("Repository path not allowed");
  }

  // Stage files using execFile - NO SHELL INJECTION POSSIBLE
  if (params.files && params.files.length > 0) {
    // Use -- to prevent files from being interpreted as flags
    await execGitCommand(["add", "--", ...params.files], realPath);
  } else {
    await execGitCommand(["add", "-A"], realPath);
  }

  // Commit - message is passed as argument, not interpolated into shell
  await execGitCommand(["commit", "-m", params.message], realPath);

  const { stdout: hashOutput } = await execGitCommand(
    ["rev-parse", "HEAD"],
    realPath
  );

  return {
    commitHash: hashOutput.trim(),
    filesCommitted: params.files?.length || 0,
  };
}

function isAllowedGitRepo(repoPath: string): boolean {
  const allowedRoots = [
    process.cwd(),
    SANDBOX_ROOT,
  ];
  return allowedRoots.some(root => repoPath.startsWith(root));
}
```

**Tests:**
```typescript
describe("gitCommit", () => {
  it("safely handles malicious commit messages", async () => {
    // These should NOT execute commands
    const maliciousMessages = [
      '"; rm -rf /; echo "',
      "$(whoami)",
      "`whoami`",
      "${HOME}",
      "test\n; rm -rf /",
    ];

    for (const message of maliciousMessages) {
      const result = await gitCommit({
        repoPath: testRepo,
        message,
      });
      // Message should be committed literally, not interpreted
      const log = await gitLog({ repoPath: testRepo, count: 1 });
      expect(log.commits[0].message).toBe(message);
    }
  });

  it("safely handles malicious file names", async () => {
    const maliciousFile = '"; rm -rf /; echo "';
    await fs.writeFile(path.join(testRepo, maliciousFile), "content");

    await expect(gitCommit({
      repoPath: testRepo,
      message: "test",
      files: [maliciousFile],
    })).resolves.toBeDefined();
  });
});
```

---

### Issue 6: WebSocket No Authentication

**File:** `apps/server/src/websocket/index.ts:48-213`

**Problem:** Any client can connect and issue commands including approving external drafts.

**Fix:**

```typescript
// websocket/index.ts
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

interface AuthenticatedSocket extends Socket {
  playerId: string;
  sessionId: string;
}

export function setupWebSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        playerId: string;
        sessionId: string;
      };

      // Verify session is still valid
      const session = await db.playerSession.findUnique({
        where: { id: decoded.sessionId },
      });

      if (!session || session.expiresAt < new Date()) {
        return next(new Error("Session expired"));
      }

      // Attach player info to socket
      (socket as AuthenticatedSocket).playerId = decoded.playerId;
      (socket as AuthenticatedSocket).sessionId = decoded.sessionId;

      next();
    } catch (error) {
      next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}, player: ${socket.playerId}`);

    // Verify player has access to game state
    const gameState = await db.gameState.findFirst({
      where: { playerId: socket.playerId },
    });

    if (!gameState) {
      socket.emit("error", { message: "Game state not found" });
      socket.disconnect();
      return;
    }

    await sendInitialState(socket, socket.playerId);

    // ... rest of handlers, now with authenticated socket
  });

  return io;
}
```

**Client-side changes:**
```typescript
// useSocket.ts
export function useSocket() {
  useEffect(() => {
    const token = localStorage.getItem("authToken");

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    newSocket.on("connect_error", (error) => {
      if (error.message === "Authentication required") {
        // Redirect to login
        window.location.href = "/login";
      }
    });

    // ...
  }, []);
}
```

---

## Phase 2: Permission System

**Estimated Scope:** 4 files, ~150 LOC changes

### Issue 14: Duplicate Tool Systems

**Files:**
- `apps/server/src/services/tools/index.ts` (OLD - to deprecate)
- `apps/server/src/tools/` (NEW - to keep)

**Problem:** Two incompatible tool implementations cause maintenance burden and inconsistent security fixes.

**Fix:**

1. **Mark old system deprecated:**
```typescript
// services/tools/index.ts
/**
 * @deprecated Use apps/server/src/tools/ instead
 * This file will be removed in v2.0
 */
```

2. **Update BaseAgent to use new tool system:**
```typescript
// agents/base-agent.ts
import { getToolsForRole, processToolUse } from "../tools/mcp-client.js";

// Replace getToolsForAgent with getToolsForRole
const tools = getToolsForRole(this.agentRecord.role);
```

3. **Migrate all tool calls to new system (tracked in separate tasks)**

---

### Issue 7: Missing Role Check in Tool Execution

**File:** `apps/server/src/tools/mcp-client.ts:140-168`

**Problem:** `role` parameter is optional, allowing permission bypass.

**Fix:**
```typescript
// mcp-client.ts

export interface ToolContext {
  agentId: string;
  agentName: string;
  role: string;  // REQUIRED - not optional
  taskId?: string;
}

export async function processToolUse(
  toolUse: { name: string; input: unknown },
  context: ToolContext  // role is now required in context
): Promise<ToolResult> {
  // Always check permissions - no bypass possible
  if (!hasToolAccess(context.role, toolUse.name)) {
    return {
      success: false,
      result: null,
      error: `Agent role '${context.role}' does not have access to tool '${toolUse.name}'`,
    };
  }

  // ... execute tool
}
```

**Update all callers:**
```typescript
// queues/index.ts - MUST pass role
const result = await processToolUse(toolCall, {
  agentId: agent.id,
  agentName: agent.name,
  role: agent.role,  // Now required
  taskId,
});
```

---

### Issue 16: Prompt Injection Sanitization Insufficient

**File:** `apps/server/src/services/security.ts:9-24`

**Problem:** Missing markers: `<|endoftext|>`, `Human:`, `Assistant:`, various model-specific tokens.

**Fix:**
```typescript
// security.ts

const DANGEROUS_PATTERNS = [
  // System/instruction markers
  /\[SYSTEM\]/gi,
  /\[INST\]/gi,
  /\[\/?INST\]/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /<\|endoftext\|>/gi,
  /<\|system\|>/gi,
  /<\|user\|>/gi,
  /<\|assistant\|>/gi,
  // Claude-specific
  /\bHuman:/gi,
  /\bAssistant:/gi,
  /\bSystem:/gi,
  // Code block escapes
  /```system/gi,
  /```instruction/gi,
];

export function sanitizePromptInput(input: string): string {
  let sanitized = input;

  // Replace all dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[FILTERED]");
  }

  // Remove null bytes and control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Truncate
  const MAX_INPUT_LENGTH = 10000;
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.slice(0, MAX_INPUT_LENGTH) + "\n[TRUNCATED]";
  }

  return sanitized;
}
```

---

## Phase 3: Data Integrity

**Estimated Scope:** 6 files, ~250 LOC changes

### Issue 4: Budget Race Condition (TOCTOU)

**File:** `apps/server/src/temporal/activities/agentActivities.ts:217-242`

**Problem:** Read-then-write pattern allows concurrent updates to corrupt budget.

**Fix:**
```typescript
// agentActivities.ts

export async function updateBudget(params: {
  playerId: string;
  costUsd: number;
}): Promise<{ success: boolean; newBalance: number }> {
  try {
    // Use transaction with row-level locking
    const result = await db.$transaction(async (tx) => {
      // Lock the row for update
      const gameState = await tx.gameState.findFirst({
        where: { playerId: params.playerId },
      });

      if (!gameState) {
        throw new Error("Game state not found");
      }

      const currentBalance = Number(gameState.budgetRemainingUsd);
      const newBalance = currentBalance - params.costUsd;

      if (newBalance < 0) {
        throw new Error("Insufficient budget");
      }

      // Update within same transaction
      await tx.gameState.update({
        where: { id: gameState.id },
        data: { budgetRemainingUsd: newBalance },
      });

      return { success: true, newBalance };
    }, {
      isolationLevel: "Serializable",  // Strongest isolation
      timeout: 5000,  // 5 second timeout
    });

    return result;
  } catch (error) {
    if (error instanceof Error && error.message === "Insufficient budget") {
      // Get current balance for response
      const gameState = await db.gameState.findFirst({
        where: { playerId: params.playerId },
      });
      return {
        success: false,
        newBalance: Number(gameState?.budgetRemainingUsd || 0),
      };
    }
    throw error;
  }
}
```

---

### Issue 5 & 20: Task Deletion Cascade & Audit Trail

**Files:**
- `apps/server/src/crons/system.ts:32-59`
- `prisma/schema.prisma`

**Problem:**
- `deleteMany()` on tasks causes FK violations with `TaskDependency` and `ActivityLog`
- Activity logs permanently deleted, losing audit trail

**Fix:**

1. **Update schema for soft delete and cascade:**
```prisma
// schema.prisma

model Task {
  id                String              @id @default(cuid())
  // ... existing fields
  deletedAt         DateTime?           @map("deleted_at")  // Soft delete

  dependencies      TaskDependency[]    @relation("TaskDependencies", onDelete: Cascade)
  dependentOn       TaskDependency[]    @relation("DependentTasks", onDelete: Cascade)
  activityLogs      ActivityLog[]       @relation(onDelete: SetNull)  // Keep logs, null out taskId
}

model ActivityLog {
  // ... existing fields
  taskId            String?             @map("task_id")  // Now nullable
  archivedAt        DateTime?           @map("archived_at")  // For archival tracking
}
```

2. **Update cleanup cron:**
```typescript
// crons/system.ts

{
  name: "system:cleanup-completed-tasks",
  pattern: "0 3 * * *",
  handler: async (_job: Job) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Soft-delete old tasks (keeps data for audit, FK references valid)
    const softDeleted = await db.task.updateMany({
      where: {
        status: { in: ["completed", "failed", "cancelled"] },
        completedAt: { lt: thirtyDaysAgo },
        deletedAt: null,  // Not already deleted
      },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(`[System] Soft-deleted ${softDeleted.count} old tasks`);

    // Archive old activity logs (90+ days) to cold storage
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Mark as archived (actual archival to S3/etc would be separate job)
    const archived = await db.activityLog.updateMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
        archivedAt: null,
      },
      data: {
        archivedAt: new Date(),
      },
    });

    console.log(`[System] Marked ${archived.count} activity logs for archival`);

    // Hard-delete only very old soft-deleted tasks (180+ days)
    const oneEightyDaysAgo = new Date();
    oneEightyDaysAgo.setDate(oneEightyDaysAgo.getDate() - 180);

    // Dependencies cascade automatically due to schema
    const hardDeleted = await db.task.deleteMany({
      where: {
        deletedAt: { lt: oneEightyDaysAgo },
      },
    });

    console.log(`[System] Hard-deleted ${hardDeleted.count} archived tasks`);
  },
},
```

---

### Issue 10: Task/Agent Updates Not Atomic

**File:** `apps/server/src/temporal/workflows/agentTaskWorkflow.ts:127-143`

**Problem:** Separate `updateTaskStatus` and `updateAgentStatus` calls can leave inconsistent state.

**Fix:**
```typescript
// agentActivities.ts - New combined activity

export async function startTaskExecution(params: {
  taskId: string;
  agentId: string;
}): Promise<void> {
  await db.$transaction([
    db.task.update({
      where: { id: params.taskId },
      data: {
        status: "in_progress",
        startedAt: new Date(),
        version: { increment: 1 },
      },
    }),
    db.agent.update({
      where: { id: params.agentId },
      data: {
        status: "working",
        currentTaskId: params.taskId,
        version: { increment: 1 },
      },
    }),
  ]);

  EventBus.emit("agent:status", { agentId: params.agentId, status: "working" });
  EventBus.emit("task:progress", { taskId: params.taskId, progress: 10 });
}

export async function completeTaskExecution(params: {
  taskId: string;
  agentId: string;
  success: boolean;
  result?: TaskResult;
}): Promise<void> {
  await db.$transaction([
    db.task.update({
      where: { id: params.taskId },
      data: {
        status: params.success ? "completed" : "failed",
        completedAt: new Date(),
        progressPercent: params.success ? 100 : undefined,
        progressDetails: params.result ? {
          output: params.result.output,
          tokensUsed: params.result.tokensUsed,
        } : undefined,
        version: { increment: 1 },
      },
    }),
    db.agent.update({
      where: { id: params.agentId },
      data: {
        status: "idle",
        currentTaskId: null,
        version: { increment: 1 },
      },
    }),
  ]);
}
```

---

### Issue 12: Version Field Not Used

**Files:** Multiple - add optimistic locking

**Fix:**
```typescript
// agentActivities.ts

export async function updateTaskStatus(params: {
  taskId: string;
  status: string;
  expectedVersion?: number;  // For optimistic locking
  // ... other fields
}): Promise<void> {
  const updateData: any = {
    status: params.status,
    version: { increment: 1 },
    // ... other fields
  };

  // If version provided, use optimistic locking
  if (params.expectedVersion !== undefined) {
    const result = await db.task.updateMany({
      where: {
        id: params.taskId,
        version: params.expectedVersion,
      },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error(`Optimistic lock failed: Task ${params.taskId} was modified by another process`);
    }
  } else {
    await db.task.update({
      where: { id: params.taskId },
      data: updateData,
    });
  }
}
```

---

### Issue 18: Missing createdById in Task Creation

**Files:** `apps/server/src/crons/ceo.ts`, `apps/server/src/crons/leads.ts`

**Problem:** Tasks created without `createdById` violate NOT NULL constraint.

**Fix:**
```typescript
// crons/ceo.ts and leads.ts

// At the top of each cron handler that creates tasks:
const systemAgent = await db.agent.findFirst({
  where: { name: "System" },
});

if (!systemAgent) {
  // Create system agent if not exists
  await db.agent.create({
    data: {
      id: "system",
      name: "System",
      role: "system",
      status: "offline",
      personalityPrompt: "System agent for automated tasks",
      capabilities: [],
      toolPermissions: {},
    },
  });
}

// Then in task creation:
const task = await db.task.create({
  data: {
    title: "Daily Priorities Review",
    description: `...`,
    priority: "high",
    status: "pending",
    agentId: ceo.id,
    createdById: systemAgent?.id || "system",  // Now properly set
  },
});
```

---

## Phase 4: Concurrency

**Estimated Scope:** 3 files, ~150 LOC changes

### Issue 11: Stuck Task Handler Race Condition

**File:** `apps/server/src/crons/workers.ts:77-127`

**Problem:** Cron marks tasks as blocked while Temporal workflow may be completing them.

**Fix:**
```typescript
// workers.ts

{
  name: "workers:check-stuck-tasks",
  pattern: "*/15 * * * *",
  handler: async (_job: Job) => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const stuckTasks = await db.task.findMany({
      where: {
        status: "in_progress",
        startedAt: { lt: thirtyMinutesAgo },
      },
      include: { agent: true },
    });

    for (const task of stuckTasks) {
      // Check if Temporal workflow is still running
      const workflowStatus = await getWorkflowExecutionStatus(task.id);

      if (workflowStatus && workflowStatus.status === "RUNNING") {
        console.log(`[Workers] Task "${task.title}" still has active workflow, skipping`);
        continue;
      }

      // Use optimistic locking to prevent race
      try {
        await db.$transaction(async (tx) => {
          // Re-fetch with lock
          const freshTask = await tx.task.findUnique({
            where: { id: task.id },
          });

          // Only update if still in_progress (not completed by workflow)
          if (freshTask?.status !== "in_progress") {
            console.log(`[Workers] Task "${task.title}" status changed, skipping`);
            return;
          }

          await tx.task.update({
            where: { id: task.id, version: freshTask.version },
            data: {
              status: "blocked",
              errorDetails: { reason: "Task exceeded 30 minute timeout" },
              version: { increment: 1 },
            },
          });

          if (task.agentId) {
            await tx.agent.update({
              where: { id: task.agentId },
              data: { status: "idle", currentTaskId: null },
            });
          }
        });

        // Cancel the Temporal workflow if it exists
        if (workflowStatus) {
          await cancelWorkflow(task.id);
        }

        EventBus.emit("task:failed", {
          taskId: task.id,
          agentId: task.agentId,
          error: "Task exceeded 30 minute timeout",
        });
      } catch (error) {
        // Optimistic lock failed - task was modified, skip
        console.log(`[Workers] Concurrent modification on task "${task.title}", skipping`);
      }
    }
  },
},
```

---

### Issue 15: Worker Task Assignment Bug

**File:** `apps/server/src/crons/workers.ts:12-74`

**Problem:** Logic `task.agentId !== agent.id` only processes pre-assigned tasks, never assigns new work.

**Fix:**
```typescript
// workers.ts

{
  name: "workers:process-pending-tasks",
  pattern: "*/5 * * * *",
  handler: async (_job: Job) => {
    // Get idle worker agents
    const idleAgents = await db.agent.findMany({
      where: {
        status: "idle",
        deletedAt: null,
        role: { in: ["engineer", "marketing", "sales", "operations"] },  // Exclude CEO
      },
    });

    if (idleAgents.length === 0) {
      console.log("[Workers] No idle agents available");
      return;
    }

    // Get unassigned OR assigned-but-idle pending tasks
    const pendingTasks = await db.task.findMany({
      where: {
        status: "pending",
        deletedAt: null,
        OR: [
          { agentId: null },  // Unassigned tasks
          { agentId: { in: idleAgents.map(a => a.id) } },  // Assigned to idle agents
        ],
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
      take: idleAgents.length,
    });

    if (pendingTasks.length === 0) {
      console.log("[Workers] No pending tasks");
      return;
    }

    // Cache game state once (not per task)
    const gameState = await db.gameState.findFirst();
    const playerId = gameState?.playerId || "default";

    // Match tasks to agents and start workflows in parallel
    const workflowPromises: Promise<void>[] = [];
    const usedAgents = new Set<string>();

    for (const task of pendingTasks) {
      // Find best agent for this task
      let agent: typeof idleAgents[0] | undefined;

      if (task.agentId) {
        // Task already assigned - use that agent if idle
        agent = idleAgents.find(a => a.id === task.agentId && !usedAgents.has(a.id));
      }

      if (!agent) {
        // Find first available idle agent (could add capability matching here)
        agent = idleAgents.find(a => !usedAgents.has(a.id));
      }

      if (!agent) continue;

      usedAgents.add(agent.id);

      // Assign task to agent if not already
      if (task.agentId !== agent.id) {
        await db.task.update({
          where: { id: task.id },
          data: { agentId: agent.id },
        });
      }

      console.log(`[Workers] Starting task "${task.title}" for agent ${agent.name}`);

      // Start workflow (collect promises for parallel execution)
      workflowPromises.push(
        startAgentTaskWorkflow({
          taskId: task.id,
          agentId: agent.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          playerId,
        }).catch(error => {
          console.error(`[Workers] Error starting task ${task.id}:`, error);
        })
      );
    }

    // Wait for all workflows to start (Issue 19 fix - parallel)
    await Promise.all(workflowPromises);
  },
},
```

---

### Issue 9: N+1 Query in Agent Stats

**File:** `apps/server/src/crons/system.ts:66-101`

**Problem:** Loop queries `db.task.count()` per agent = O(n) queries.

**Fix:**
```typescript
// system.ts

{
  name: "system:update-agent-stats",
  pattern: "0 * * * *",
  handler: async (_job: Job) => {
    // Single query with groupBy - O(1) instead of O(n)
    const taskStats = await db.task.groupBy({
      by: ["agentId", "status"],
      _count: true,
      where: {
        agent: { deletedAt: null },
      },
    });

    const sessionStats = await db.agentSession.groupBy({
      by: ["agentId"],
      _sum: {
        inputTokens: true,
        outputTokens: true,
      },
    });

    // Process in memory
    const agentStats = new Map<string, {
      completed: number;
      failed: number;
      total: number;
      tokensUsed: number;
    }>();

    for (const stat of taskStats) {
      if (!stat.agentId) continue;

      const existing = agentStats.get(stat.agentId) || {
        completed: 0,
        failed: 0,
        total: 0,
        tokensUsed: 0,
      };

      existing.total += stat._count;
      if (stat.status === "completed") existing.completed += stat._count;
      if (stat.status === "failed") existing.failed += stat._count;

      agentStats.set(stat.agentId, existing);
    }

    for (const stat of sessionStats) {
      if (!stat.agentId) continue;

      const existing = agentStats.get(stat.agentId) || {
        completed: 0,
        failed: 0,
        total: 0,
        tokensUsed: 0,
      };

      existing.tokensUsed = (stat._sum.inputTokens || 0) + (stat._sum.outputTokens || 0);
      agentStats.set(stat.agentId, existing);
    }

    // Log stats (or store in agent record if needed)
    for (const [agentId, stats] of agentStats) {
      const successRate = stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0;
      console.log(`[System] Agent ${agentId}: ${stats.completed}/${stats.total} tasks, ${successRate}% success, ${stats.tokensUsed} tokens`);
    }
  },
},
```

---

## Phase 5: Reliability

**Estimated Scope:** 4 files, ~100 LOC changes

### Issue 22: Temporal Timeout Too Short

**File:** `apps/server/src/temporal/workflows/agentTaskWorkflow.ts:14-34`

**Fix:**
```typescript
// agentTaskWorkflow.ts

// Fast activities (database, events) - short timeout
const fastActivities = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2,
  },
});

// Long-running activities (LLM calls) - longer timeout with heartbeat
const longActivities = proxyActivities<Pick<typeof activities, "executeAgentTask">>({
  startToCloseTimeout: "30 minutes",
  heartbeatTimeout: "2 minutes",  // Must heartbeat every 2 min
  retry: {
    maximumAttempts: 2,
    initialInterval: "5 seconds",
  },
});

// Use appropriate proxy for each activity
const { loadAgentConfig, updateTaskStatus, ... } = fastActivities;
const { executeAgentTask } = longActivities;
```

---

### Issue 17: BullMQ No Rate Limiting

**File:** `apps/server/src/services/CronManager.ts:49-59`

**Fix:**
```typescript
// CronManager.ts

this.worker = new Worker(
  "crons",
  async (job: Job) => {
    await this.executeJob(job);
  },
  {
    connection: redisConnection,
    concurrency: 5,
    limiter: {
      max: 10,        // Max 10 jobs
      duration: 1000, // Per second
    },
  }
);
```

Also add to task queue:
```typescript
// queues/index.ts

const taskQueue = new Queue("agent-tasks", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

const taskWorker = new Worker("agent-tasks", processor, {
  connection: redis,
  concurrency: 3,
  limiter: {
    max: 50,          // 50 API calls
    duration: 60000,  // Per minute (match Anthropic rate limit)
    groupKey: "agentId",  // Rate limit per agent
  },
});
```

---

### Issue 13: Verification Activity is Stub

**File:** `apps/server/src/temporal/activities/agentActivities.ts:246-314`

**Problem:** Just checks `task.status === "completed"` regardless of actual criteria.

**Fix:**
```typescript
// agentActivities.ts

export async function verifyTaskCompletion(params: {
  taskId: string;
  acceptanceCriteria: string[];
  repoPath?: string;
}): Promise<VerificationResult> {
  const task = await db.task.findUnique({
    where: { id: params.taskId },
    include: { agent: true },
  });

  if (!task) {
    return {
      allPassed: false,
      passedCriteria: [],
      failedCriteria: params.acceptanceCriteria,
    };
  }

  const passedCriteria: string[] = [];
  const failedCriteria: string[] = [];
  const repoPath = params.repoPath || process.cwd();

  for (const criterion of params.acceptanceCriteria) {
    const criterionLower = criterion.toLowerCase();
    let passed = false;

    try {
      if (criterionLower.includes("test") || criterionLower.includes("spec")) {
        // Run tests
        const { stdout, stderr } = await execFileAsync("npm", ["test"], {
          cwd: repoPath,
          timeout: 60000,
        });
        passed = !stderr.includes("FAIL") && !stderr.includes("failed");

      } else if (criterionLower.includes("lint") || criterionLower.includes("eslint")) {
        // Run linting
        const { stderr } = await execFileAsync("npm", ["run", "lint"], {
          cwd: repoPath,
          timeout: 30000,
        });
        passed = !stderr.includes("error");

      } else if (criterionLower.includes("build") || criterionLower.includes("compile")) {
        // Run build
        await execFileAsync("npm", ["run", "build"], {
          cwd: repoPath,
          timeout: 120000,
        });
        passed = true;

      } else if (criterionLower.includes("file") && criterionLower.includes("exist")) {
        // Check file existence - extract filename from criterion
        const fileMatch = criterion.match(/['"]([^'"]+)['"]/);
        if (fileMatch) {
          await fs.access(path.join(repoPath, fileMatch[1]));
          passed = true;
        }

      } else {
        // Default: mark as passed if task completed successfully
        passed = task.status === "completed";
      }
    } catch (error) {
      passed = false;
    }

    if (passed) {
      passedCriteria.push(criterion);
    } else {
      failedCriteria.push(criterion);
    }
  }

  return {
    allPassed: failedCriteria.length === 0,
    passedCriteria,
    failedCriteria,
  };
}
```

---

## Phase 6: Frontend

**Estimated Scope:** 1 file, ~20 LOC changes

### Issue 21: Missing useMemo in TaskQueue

**File:** `apps/game/src/components/TaskQueue.tsx:22`

**Fix:**
```typescript
// TaskQueue.tsx
import { useState, useMemo } from "react";

export function TaskQueue({ tasks, agents, onTaskClick, onCancelTask }: TaskQueueProps) {
  const [expandedSection, setExpandedSection] = useState<TaskStatus | null>("in_progress");

  // Memoize expensive computation
  const groupedTasks = useMemo(() => groupTasksByStatus(tasks), [tasks]);

  // Also memoize agent lookup map
  const agentsById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agents) {
      map.set(agent.id, agent);
    }
    return map;
  }, [agents]);

  // ... rest of component, using agentsById.get(task.agentId) instead of agents.find()
}
```

---

## Acceptance Criteria

### Security (Must Pass)

- [ ] Shell commands cannot be injected via any input vector
- [ ] Git commands cannot be injected via commit messages or file paths
- [ ] Symlinks cannot escape the filesystem sandbox
- [ ] WebSocket connections require valid authentication
- [ ] Tool permissions are always checked before execution
- [ ] Prompt injection markers are filtered from all user inputs

### Data Integrity (Must Pass)

- [ ] Budget updates are atomic - no negative balances possible
- [ ] Task/Agent status updates are atomic - no inconsistent states
- [ ] Task deletion doesn't cause FK violations
- [ ] Optimistic locking prevents lost updates
- [ ] All tasks have valid `createdById`

### Performance (Should Pass)

- [ ] Agent stats cron runs in O(1) database queries, not O(n)
- [ ] Workflow starts are parallelized
- [ ] React components don't re-render unnecessarily

### Reliability (Should Pass)

- [ ] Temporal activities have appropriate timeouts
- [ ] Rate limiting prevents API exhaustion
- [ ] Stuck tasks don't conflict with running workflows
- [ ] Verification activity runs actual checks

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Security vulnerabilities | 0 Critical, 0 High | Security audit |
| Race conditions | 0 detected | Concurrent test suite |
| FK violations in cleanup | 0 | Cleanup cron logs |
| Budget inconsistencies | 0 | Concurrent budget test |
| Agent stats cron time | < 1s for 100 agents | Performance monitoring |
| WebSocket auth failures | 100% for unauthenticated | Integration tests |

---

## Dependencies & Prerequisites

### External Dependencies
- JWT library for WebSocket authentication
- No new dependencies for other fixes

### Internal Dependencies
- Phase 2 depends on Phase 1 (security foundation)
- Phase 3 depends on Phase 2 (permission system working)
- Phase 4 depends on Phase 3 (data integrity)
- Phase 5 and 6 are independent

### Database Migration Required
- Add `deletedAt` to Task model
- Add `archivedAt` to ActivityLog model
- Update FK constraints on TaskDependency and ActivityLog

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| execFile breaks existing commands | Medium | High | Comprehensive test coverage of all shell commands |
| WebSocket auth breaks existing clients | High | Medium | Graceful degradation, clear error messages, client update |
| Transaction deadlocks | Low | Medium | Short timeouts, retry logic |
| Tool consolidation changes agent behavior | Medium | Medium | A/B test with feature flag |
| Temporal timeout increase exhausts resources | Low | Medium | Heartbeat requirement, max turns limit |

---

## Testing Plan

### Unit Tests
- Shell command parsing with malicious inputs
- Git command with injection attempts
- Symlink resolution edge cases
- Budget update concurrency simulation
- Optimistic locking conflict scenarios

### Integration Tests
- End-to-end task execution with authentication
- Cron job execution with large datasets
- Temporal workflow completion with verification

### Security Tests
- Penetration testing for command injection
- Authentication bypass attempts
- Path traversal fuzzing

---

## References

### Internal References
- PR #9: `claude/complete-project-phase-two-1lFmY`
- Security patterns: `apps/server/src/services/security.ts`
- Existing tool system: `apps/server/src/services/tools/index.ts`
- New tool system: `apps/server/src/tools/`

### External References
- Node.js child_process security: https://nodejs.org/api/child_process.html
- Temporal best practices: https://docs.temporal.io/dev-guide/typescript
- Prisma transactions: https://www.prisma.io/docs/concepts/components/prisma-client/transactions

### Related Work
- Commit 7441057: Previous security fix (command injection, event shape)
- AGENT_NATIVE_GUIDELINES.md: Architecture principles
