# Claude Code Integration Architecture

**Author:** eng-3
**Date:** 2026-01-27
**Status:** Design Document

## Executive Summary

This document defines the architecture for capturing Claude Code agent activity in real-time and syncing it with Generic Corp's visualization system. The integration uses Claude Code hooks for event capture and file watching for bidirectional task synchronization.

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Claude Code Session                          │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │   Hooks    │───│ Transcript │───│   Tasks    │              │
│  │  System    │   │   (JSONL)  │   │  (JSON)    │              │
│  └─────┬──────┘   └──────┬─────┘   └──────┬─────┘              │
└────────┼─────────────────┼────────────────┼────────────────────┘
         │                 │                │
         │ Hook Events     │ File Watch     │ File Watch
         │                 │                │
         ▼                 ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│               Generic Corp Integration Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Hook Handler │  │ Transcript   │  │ Task Sync    │          │
│  │   Service    │  │   Watcher    │  │   Service    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTP/WS          │ HTTP/WS          │ HTTP/WS
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Generic Corp Server                            │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │  Express   │───│ PostgreSQL │───│  Socket.io │              │
│  │    API     │   │     DB     │   │  Server    │              │
│  └────────────┘   └────────────┘   └────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                                      │
          │ REST API                             │ WebSocket
          │                                      │
          ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Frontend (React + Phaser)                        │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐              │
│  │  Zustand   │───│   React    │───│   Phaser   │              │
│  │   Store    │   │ Components │   │   Canvas   │              │
│  └────────────┘   └────────────┘   └────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Hook-Based Event Capture

### 2.1 Hook Configuration Strategy

We'll use **three primary hooks** for comprehensive activity capture:

| Hook | Purpose | Blocking | Data Captured |
|------|---------|----------|---------------|
| `PostToolUse` | Capture all tool executions | No | Tool name, inputs, outputs, timing |
| `UserPromptSubmit` | Track user interactions | No | Prompt content, timestamp |
| `SessionStart` | Initialize session tracking | No | Session ID, model, source |

**Configuration file location:** `~/.claude/settings.json`

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/generic-corp/integration/hooks/session-start.js"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/generic-corp/integration/hooks/user-prompt.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /path/to/generic-corp/integration/hooks/post-tool.js"
          }
        ]
      }
    ]
  }
}
```

### 2.2 Hook Handler Data Flow

```
┌─────────────────┐
│ Claude Code     │
│ Hook Trigger    │
└────────┬────────┘
         │ stdin: JSON event data
         ▼
┌─────────────────┐
│ Node.js Hook    │
│ Handler Script  │
├─────────────────┤
│ 1. Parse JSON   │
│ 2. Transform    │
│ 3. HTTP POST    │
└────────┬────────┘
         │ HTTP POST
         ▼
┌─────────────────┐
│ Generic Corp    │
│ Server Endpoint │
├─────────────────┤
│ /api/hooks/event│
└────────┬────────┘
         │ Store in DB
         ▼
┌─────────────────┐
│ PostgreSQL      │
│ agent_events    │
└────────┬────────┘
         │ Emit event
         ▼
┌─────────────────┐
│ Socket.io       │
│ Broadcast       │
└────────┬────────┘
         │ Real-time update
         ▼
┌─────────────────┐
│ Frontend        │
│ Visualization   │
└─────────────────┘
```

### 2.3 Hook Handler Implementation Pattern

**Example: `hooks/post-tool.js`**

```javascript
#!/usr/bin/env node
import { readFileSync } from 'fs';
import fetch from 'node-fetch';

const SERVER_URL = process.env.GENERIC_CORP_SERVER || 'http://localhost:3000';

async function main() {
  // Read hook input from stdin
  const input = JSON.parse(readFileSync(0, 'utf-8'));

  // Transform to our event schema
  const event = {
    type: 'tool_execution',
    timestamp: new Date().toISOString(),
    session_id: input.session_id,
    tool_name: input.tool_name,
    tool_input: input.tool_input,
    tool_response: input.tool_response,
    cwd: input.cwd,
    duration_ms: calculateDuration(input)
  };

  // Send to server (non-blocking)
  try {
    await fetch(`${SERVER_URL}/api/hooks/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
  } catch (error) {
    // Log but don't fail - hooks should never block Claude
    console.error('[Hook Error]', error.message);
  }

  // Return success (no blocking)
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
```

## 3. Transcript Watching Architecture

### 3.1 Transcript File Structure

Claude Code writes conversation history to JSONL files:

**Location:** `~/.claude/projects/<project-hash>/<session-id>.jsonl`

**Format:** Newline-delimited JSON (JSONL)

```jsonl
{"type":"user","content":"Fix the login bug"}
{"type":"tool_use","name":"Read","input":{"file_path":"/path/to/auth.ts"}}
{"type":"tool_result","tool_use_id":"toolu_123","content":"..."}
{"type":"assistant","content":"I found the issue..."}
```

### 3.2 Transcript Watcher Service

```
┌─────────────────────────────────────────────────────────────┐
│             Transcript Watcher Service                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐         ┌────────────────┐             │
│  │ File Watcher   │────────▶│ JSONL Parser   │             │
│  │ (chokidar)     │         │                │             │
│  └────────────────┘         └───────┬────────┘             │
│         │                           │                       │
│         │ file change event         │ parsed entries       │
│         │                           │                       │
│  ┌──────▼──────────────────────────▼────────┐             │
│  │     Event Buffer & Deduplicator          │             │
│  │  - Track last read position              │             │
│  │  - Buffer new entries                    │             │
│  │  - Deduplicate events                    │             │
│  └──────────────────┬───────────────────────┘             │
│                     │                                       │
│                     │ buffered events                       │
│                     │                                       │
│  ┌──────────────────▼───────────────────────┐             │
│  │     Event Transformer                    │             │
│  │  - Enrich with metadata                  │             │
│  │  - Extract key information               │             │
│  │  - Format for storage                    │             │
│  └──────────────────┬───────────────────────┘             │
│                     │                                       │
│                     │ transformed events                    │
│                     ▼                                       │
│  ┌─────────────────────────────────────────┐              │
│  │     Database Writer                     │              │
│  │  - Batch insert events                  │              │
│  │  - Update agent state                   │              │
│  └──────────────────┬──────────────────────┘              │
│                     │                                       │
│                     │ emit                                  │
│                     ▼                                       │
│  ┌─────────────────────────────────────────┐              │
│  │     WebSocket Broadcaster               │              │
│  │  - Emit real-time updates               │              │
│  └─────────────────────────────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Implementation Strategy

**Core Technology:** Node.js with `chokidar` for file watching

```typescript
import chokidar from 'chokidar';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

class TranscriptWatcher {
  private watcher: chokidar.FSWatcher;
  private lastPosition = new Map<string, number>();

  constructor(private transcriptDir: string) {
    this.watcher = chokidar.watch(`${transcriptDir}/**/*.jsonl`, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100
      }
    });

    this.watcher.on('add', this.handleNewFile.bind(this));
    this.watcher.on('change', this.handleFileChange.bind(this));
  }

  private async handleFileChange(path: string) {
    const lastPos = this.lastPosition.get(path) || 0;
    const newEntries = await this.readNewLines(path, lastPos);

    for (const entry of newEntries) {
      await this.processEntry(path, entry);
    }

    this.lastPosition.set(path, this.getCurrentPosition(path));
  }

  private async processEntry(path: string, entry: any) {
    // Transform and store in database
    const event = this.transformEntry(entry);
    await this.storeEvent(event);

    // Broadcast via WebSocket
    this.broadcast('transcript:update', event);
  }

  private transformEntry(entry: any): AgentEvent {
    return {
      id: generateId(),
      type: this.mapEntryType(entry.type),
      timestamp: new Date().toISOString(),
      session_id: this.extractSessionId(entry),
      content: this.extractContent(entry),
      metadata: this.extractMetadata(entry)
    };
  }
}
```

## 4. Task Synchronization Architecture

### 4.1 Task Directory Structure

```
~/.claude/tasks/
└── <team-name>/              # Team task list
    └── tasks.json            # JSONL format
```

### 4.2 Bidirectional Sync Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  Task Sync Service                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Direction 1: Claude → Server                │  │
│  │                                                        │  │
│  │  ~/.claude/tasks/         File Watch                  │  │
│  │    └── team/tasks.json ──────────────▶ Parse JSONL   │  │
│  │                                             │          │  │
│  │                                             ▼          │  │
│  │                                      Detect Changes   │  │
│  │                                             │          │  │
│  │                                             ▼          │  │
│  │                                      Update DB        │  │
│  │                                             │          │  │
│  │                                             ▼          │  │
│  │                                      Broadcast WS     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Direction 2: Server → Claude                │  │
│  │                                                        │  │
│  │  API Call                                              │  │
│  │   (Create/Update Task) ────────────▶ Validate        │  │
│  │                                             │          │  │
│  │                                             ▼          │  │
│  │                                      Update DB        │  │
│  │                                             │          │  │
│  │                                             ▼          │  │
│  │                                   Write JSONL Entry   │  │
│  │                                             │          │  │
│  │                                             ▼          │  │
│  │                           ~/.claude/tasks/team/       │  │
│  │                              tasks.json (append)      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Conflict Resolution                      │  │
│  │                                                        │  │
│  │  1. Last-Write-Wins with Timestamp                    │  │
│  │  2. Lock file mechanism for writes                    │  │
│  │  3. Version tracking per task                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Task Sync Implementation

```typescript
import chokidar from 'chokidar';
import { promises as fs } from 'fs';
import lockfile from 'proper-lockfile';

class TaskSyncService {
  private watcher: chokidar.FSWatcher;
  private taskDir: string;
  private syncInProgress = new Set<string>();

  constructor(taskDir: string) {
    this.taskDir = taskDir;
    this.watcher = chokidar.watch(`${taskDir}/**/tasks.json`, {
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 1000 }
    });

    this.watcher.on('change', this.syncFromClaude.bind(this));
  }

  // Direction 1: Claude → Server
  async syncFromClaude(filePath: string) {
    if (this.syncInProgress.has(filePath)) return;

    this.syncInProgress.add(filePath);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      const tasks = lines.map(line => JSON.parse(line));

      // Compare with DB state
      const dbTasks = await this.getTasksFromDB(this.extractTeamName(filePath));
      const changes = this.detectChanges(tasks, dbTasks);

      // Apply changes to DB
      for (const change of changes) {
        await this.applyChange(change);
        this.broadcast('task:update', change);
      }
    } finally {
      this.syncInProgress.delete(filePath);
    }
  }

  // Direction 2: Server → Claude
  async syncToClaude(teamName: string, task: Task) {
    const filePath = `${this.taskDir}/${teamName}/tasks.json`;

    // Acquire lock
    const release = await lockfile.lock(filePath, {
      retries: { retries: 5, minTimeout: 100 }
    });

    try {
      // Read existing tasks
      let existingTasks: Task[] = [];
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        existingTasks = content.trim().split('\n').map(line => JSON.parse(line));
      } catch (error) {
        // File doesn't exist yet
      }

      // Update or append task
      const index = existingTasks.findIndex(t => t.id === task.id);
      if (index >= 0) {
        existingTasks[index] = task;
      } else {
        existingTasks.push(task);
      }

      // Write back as JSONL
      const jsonl = existingTasks.map(t => JSON.stringify(t)).join('\n') + '\n';
      await fs.writeFile(filePath, jsonl, 'utf-8');
    } finally {
      await release();
    }
  }

  // Conflict resolution: last-write-wins with version tracking
  private detectChanges(claudeTasks: Task[], dbTasks: Task[]): Change[] {
    const changes: Change[] = [];

    for (const claudeTask of claudeTasks) {
      const dbTask = dbTasks.find(t => t.id === claudeTask.id);

      if (!dbTask) {
        // New task from Claude
        changes.push({ type: 'create', task: claudeTask });
      } else if (claudeTask.updated_at > dbTask.updated_at) {
        // Claude version is newer
        changes.push({ type: 'update', task: claudeTask });
      }
      // If DB version is newer, ignore (already synced to Claude)
    }

    return changes;
  }
}
```

### 4.4 Conflict Resolution Strategy

**Strategy:** Last-Write-Wins (LWW) with timestamp comparison

**Rules:**
1. Each task has `updated_at` timestamp
2. Compare timestamps when conflict detected
3. Newer timestamp wins
4. Lock files prevent simultaneous writes
5. Version tracking for audit trail

**Edge Cases:**
- **File deleted:** Sync deletion to DB, mark tasks as archived
- **Simultaneous writes:** Lock mechanism prevents corruption
- **Clock skew:** Use server timestamp as source of truth
- **Missing task:** Treat as deleted if not in Claude file

## 5. Data Schema

### 5.1 Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model AgentEvent {
  id          String   @id @default(cuid())
  type        String   // 'tool_execution', 'user_prompt', 'session_start', etc.
  timestamp   DateTime @default(now())
  session_id  String
  agent_id    String?

  // Event-specific data
  tool_name   String?
  tool_input  Json?
  tool_output Json?
  content     String?  @db.Text
  metadata    Json?

  // Performance tracking
  duration_ms Int?

  // Relations
  agent       Agent?   @relation(fields: [agent_id], references: [id])

  @@index([session_id])
  @@index([agent_id])
  @@index([timestamp])
  @@index([type])
}

model Task {
  id           String   @id @default(cuid())
  team_name    String
  subject      String
  description  String   @db.Text
  status       String   // 'pending', 'in_progress', 'completed'
  owner        String?

  // Sync metadata
  updated_at   DateTime @updatedAt
  version      Int      @default(0)
  claude_id    String?  @unique // ID from Claude's task system

  // Dependencies
  blocks       String[] // Task IDs
  blocked_by   String[] // Task IDs

  @@index([team_name])
  @@index([status])
  @@index([owner])
}

model Session {
  id           String   @id @default(cuid())
  claude_session_id String @unique
  model        String
  source       String   // 'startup', 'resume', etc.
  started_at   DateTime @default(now())
  ended_at     DateTime?

  // Relations
  events       AgentEvent[]

  @@index([claude_session_id])
}
```

### 5.2 API Schema (TypeScript)

```typescript
// Event types from hooks
export interface HookEvent {
  type: 'tool_execution' | 'user_prompt' | 'session_start' | 'session_end';
  timestamp: string; // ISO 8601
  session_id: string;
  data: HookEventData;
}

export interface ToolExecutionData {
  tool_name: string;
  tool_input: Record<string, any>;
  tool_output?: string;
  duration_ms?: number;
  success: boolean;
}

export interface UserPromptData {
  prompt: string;
  prompt_length: number;
}

export interface SessionStartData {
  model: string;
  source: 'startup' | 'resume' | 'clear' | 'compact';
  cwd: string;
}

// Task sync types
export interface TaskUpdate {
  id: string;
  team_name: string;
  subject: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  owner?: string;
  updated_at: string; // ISO 8601
  version: number;
  blocks?: string[];
  blocked_by?: string[];
}

// WebSocket events
export type WebSocketEvent =
  | { type: 'agent:event'; data: HookEvent }
  | { type: 'transcript:update'; data: TranscriptEntry }
  | { type: 'task:update'; data: TaskUpdate }
  | { type: 'task:create'; data: TaskUpdate }
  | { type: 'task:delete'; data: { id: string; team_name: string } };
```

## 6. API Endpoints

### 6.1 Hook Event Ingestion

```typescript
// POST /api/hooks/event
// Receives events from Claude Code hooks

interface HookEventRequest {
  type: string;
  timestamp: string;
  session_id: string;
  data: Record<string, any>;
}

interface HookEventResponse {
  success: boolean;
  event_id?: string;
  error?: string;
}
```

### 6.2 Task Management

```typescript
// GET /api/tasks/:teamName
// List all tasks for a team
interface ListTasksResponse {
  tasks: TaskUpdate[];
}

// POST /api/tasks
// Create new task (synced to Claude)
interface CreateTaskRequest {
  team_name: string;
  subject: string;
  description: string;
  owner?: string;
}

// PUT /api/tasks/:id
// Update task (synced to Claude)
interface UpdateTaskRequest {
  status?: 'pending' | 'in_progress' | 'completed';
  owner?: string;
  subject?: string;
  description?: string;
}

// DELETE /api/tasks/:id
// Delete task (synced to Claude)
interface DeleteTaskResponse {
  success: boolean;
}
```

### 6.3 Session Management

```typescript
// GET /api/sessions
// List active sessions
interface ListSessionsResponse {
  sessions: {
    id: string;
    claude_session_id: string;
    model: string;
    started_at: string;
    event_count: number;
  }[];
}

// GET /api/sessions/:sessionId/events
// Get events for a session
interface SessionEventsResponse {
  events: HookEvent[];
  pagination: {
    total: number;
    page: number;
    page_size: number;
  };
}
```

## 7. WebSocket Protocol

### 7.1 Connection

```typescript
// Client connects to Socket.io
const socket = io('http://localhost:3000', {
  auth: { token: 'optional-auth-token' }
});

// Subscribe to events
socket.on('connect', () => {
  socket.emit('subscribe', { room: 'agents' });
});
```

### 7.2 Event Types

```typescript
// Real-time agent event
socket.on('agent:event', (event: HookEvent) => {
  console.log('Agent action:', event);
});

// Task update from Claude
socket.on('task:update', (task: TaskUpdate) => {
  console.log('Task changed:', task);
});

// Transcript update
socket.on('transcript:update', (entry: TranscriptEntry) => {
  console.log('New transcript entry:', entry);
});

// Session lifecycle
socket.on('session:start', (session: Session) => {
  console.log('Session started:', session);
});

socket.on('session:end', (session: Session) => {
  console.log('Session ended:', session);
});
```

## 8. Deployment Architecture

### 8.1 Service Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Integration Services                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Hook Handlers (Node.js scripts)                   │    │
│  │  - Location: ~/.claude/hooks/generic-corp/         │    │
│  │  - Invoked by Claude Code hooks                    │    │
│  │  - Send HTTP POST to server                        │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Transcript Watcher (systemd service)              │    │
│  │  - Watches ~/.claude/projects/**/session.jsonl     │    │
│  │  - Parses JSONL and streams to server              │    │
│  │  - Buffers events, deduplicates                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Task Sync Service (systemd service)               │    │
│  │  - Watches ~/.claude/tasks/**/tasks.json           │    │
│  │  - Bidirectional sync with PostgreSQL              │    │
│  │  - Conflict resolution with LWW                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 systemd Service Files

**Transcript Watcher Service:**

```ini
# /etc/systemd/system/generic-corp-transcript-watcher.service
[Unit]
Description=Generic Corp Claude Transcript Watcher
After=network.target

[Service]
Type=simple
User=nkillgore
WorkingDirectory=/home/nkillgore/generic-corp
ExecStart=/usr/bin/node apps/server/src/integration/transcript-watcher.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="GENERIC_CORP_SERVER=http://localhost:3000"
Environment="CLAUDE_PROJECTS_DIR=/home/nkillgore/.claude/projects"

[Install]
WantedBy=multi-user.target
```

**Task Sync Service:**

```ini
# /etc/systemd/system/generic-corp-task-sync.service
[Unit]
Description=Generic Corp Claude Task Sync
After=network.target

[Service]
Type=simple
User=nkillgore
WorkingDirectory=/home/nkillgore/generic-corp
ExecStart=/usr/bin/node apps/server/src/integration/task-sync.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
Environment="GENERIC_CORP_SERVER=http://localhost:3000"
Environment="CLAUDE_TASKS_DIR=/home/nkillgore/.claude/tasks"

[Install]
WantedBy=multi-user.target
```

### 8.3 Installation Script

```bash
#!/bin/bash
# install-integration.sh

set -e

echo "Installing Generic Corp Claude Code Integration..."

# 1. Install hook handlers
HOOKS_DIR="$HOME/.claude/hooks/generic-corp"
mkdir -p "$HOOKS_DIR"
cp -r integration/hooks/* "$HOOKS_DIR/"
chmod +x "$HOOKS_DIR"/*.js

# 2. Update Claude settings
CLAUDE_SETTINGS="$HOME/.claude/settings.json"
if [ ! -f "$CLAUDE_SETTINGS" ]; then
  echo '{"hooks":{}}' > "$CLAUDE_SETTINGS"
fi

# Merge hook configuration
node integration/scripts/merge-settings.js

# 3. Install systemd services
sudo cp integration/systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable generic-corp-transcript-watcher
sudo systemctl enable generic-corp-task-sync
sudo systemctl start generic-corp-transcript-watcher
sudo systemctl start generic-corp-task-sync

# 4. Test connection
sleep 2
curl http://localhost:3000/api/health || {
  echo "Error: Server not responding"
  exit 1
}

echo "Installation complete!"
echo "Services running:"
sudo systemctl status generic-corp-transcript-watcher --no-pager
sudo systemctl status generic-corp-task-sync --no-pager
```

## 9. Performance Considerations

### 9.1 Hook Execution Performance

- **Hook timeout:** 5 seconds (non-blocking)
- **HTTP timeout:** 5 seconds max
- **Async execution:** Hooks never block Claude
- **Error handling:** Log errors, never crash

### 9.2 File Watching Performance

- **Debounce:** 500ms stability threshold
- **Batch processing:** Buffer events for 100ms
- **Memory usage:** Stream large files, don't load entirely
- **CPU usage:** Throttle processing to 100 events/sec

### 9.3 Database Performance

- **Batch inserts:** Group events in 50-event batches
- **Indexes:** On session_id, agent_id, timestamp, type
- **Retention:** Archive events older than 30 days
- **Pagination:** 50 events per page

### 9.4 WebSocket Performance

- **Throttling:** Max 10 events/sec per client
- **Compression:** Enable Socket.io compression
- **Rooms:** Isolate broadcasts by team/agent
- **Reconnection:** Automatic with exponential backoff

## 10. Security Considerations

### 10.1 Hook Security

- **Input validation:** Sanitize all hook inputs
- **Command injection:** Never eval or shell-execute hook data
- **File path traversal:** Validate file paths
- **Rate limiting:** Max 100 hooks/sec per session

### 10.2 API Security

- **Authentication:** JWT tokens for API access
- **Authorization:** Role-based access control
- **Input validation:** Zod schemas for all endpoints
- **Rate limiting:** Express rate-limit middleware

### 10.3 File Watching Security

- **Path validation:** Only watch ~/.claude/ directories
- **Permissions:** Read-only access to transcript files
- **Symlink protection:** Resolve and validate symlinks
- **Lock files:** Prevent race conditions

## 11. Testing Strategy

### 11.1 Hook Testing

```typescript
// integration/hooks/__tests__/post-tool.test.ts
import { describe, it, expect, vi } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('PostToolUse Hook', () => {
  it('should parse hook input and send to server', async () => {
    const input = {
      session_id: 'test-session',
      tool_name: 'Bash',
      tool_input: { command: 'echo test' },
      tool_response: 'test'
    };

    const { stdout } = await execFileAsync('node', [
      'integration/hooks/post-tool.js'
    ], {
      input: JSON.stringify(input)
    });

    const output = JSON.parse(stdout);
    expect(output.continue).toBe(true);
  });

  it('should handle server errors gracefully', async () => {
    // Mock server down
    process.env.GENERIC_CORP_SERVER = 'http://localhost:9999';

    const input = { session_id: 'test' };
    const { stdout } = await execFileAsync('node', [
      'integration/hooks/post-tool.js'
    ], {
      input: JSON.stringify(input)
    });

    const output = JSON.parse(stdout);
    expect(output.continue).toBe(true); // Never block Claude
  });
});
```

### 11.2 File Watching Tests

```typescript
// integration/services/__tests__/transcript-watcher.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { TranscriptWatcher } from '../transcript-watcher';

describe('TranscriptWatcher', () => {
  const testDir = '/tmp/claude-test-transcripts';
  let watcher: TranscriptWatcher;

  beforeEach(async () => {
    await mkdir(testDir, { recursive: true });
    watcher = new TranscriptWatcher(testDir);
  });

  afterEach(async () => {
    await watcher.stop();
    await rm(testDir, { recursive: true });
  });

  it('should detect new JSONL entries', async () => {
    const events: any[] = [];
    watcher.on('event', (event) => events.push(event));

    const testFile = `${testDir}/session.jsonl`;
    await writeFile(testFile, '{"type":"user","content":"test"}\n');

    // Wait for file watcher
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('user');
  });
});
```

### 11.3 Integration Tests

```typescript
// integration/__tests__/end-to-end.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io } from 'socket.io-client';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

describe('End-to-End Integration', () => {
  let socket: any;

  beforeAll(() => {
    socket = io('http://localhost:3000');
  });

  afterAll(() => {
    socket.close();
  });

  it('should flow from hook to frontend', async () => {
    const events: any[] = [];
    socket.on('agent:event', (event: any) => events.push(event));

    // Simulate hook execution
    const hookInput = {
      session_id: 'test-e2e',
      tool_name: 'Read',
      tool_input: { file_path: '/test.txt' }
    };

    await execFileAsync('node', [
      'integration/hooks/post-tool.js'
    ], {
      input: JSON.stringify(hookInput)
    });

    // Wait for WebSocket delivery
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('tool_execution');
    expect(events[0].tool_name).toBe('Read');
  });
});
```

## 12. Monitoring & Observability

### 12.1 Metrics to Track

- **Hook execution rate:** hooks/second
- **Hook failure rate:** failures/total
- **File watch latency:** time from file change to DB write
- **Event processing latency:** time from hook to WebSocket
- **Database write latency:** P50, P95, P99
- **WebSocket connection count:** active connections
- **Event backlog size:** queued events

### 12.2 Logging Strategy

```typescript
// Structured logging with pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

// Hook execution
logger.info({
  component: 'hook',
  event: 'execution',
  tool_name: 'Bash',
  duration_ms: 120
}, 'Hook executed successfully');

// File watch
logger.info({
  component: 'transcript-watcher',
  event: 'file_change',
  file: 'session.jsonl',
  new_lines: 3
}, 'Transcript updated');

// Error logging
logger.error({
  component: 'task-sync',
  event: 'sync_error',
  error: error.message,
  task_id: '123'
}, 'Failed to sync task to Claude');
```

## 13. Rollout Plan

### Phase 1: Hook Integration (Week 1)
- [ ] Implement hook handlers
- [ ] Deploy hook configuration
- [ ] Test with single agent session
- [ ] Monitor hook execution rates

### Phase 2: Transcript Watching (Week 2)
- [ ] Implement transcript watcher service
- [ ] Deploy as systemd service
- [ ] Test with historical transcripts
- [ ] Verify data accuracy

### Phase 3: Task Sync (Week 3)
- [ ] Implement task sync service
- [ ] Test bidirectional sync
- [ ] Deploy conflict resolution
- [ ] End-to-end testing

### Phase 4: Production Rollout (Week 4)
- [ ] Deploy to production
- [ ] Monitor performance metrics
- [ ] Gather user feedback
- [ ] Iterate based on learnings

## 14. Open Questions & Future Work

### Open Questions
1. Should we store full tool outputs or just summaries?
2. What retention policy for transcript data?
3. How to handle multi-user scenarios?
4. Performance impact of 100+ concurrent sessions?

### Future Enhancements
- **ML-based event filtering:** Smart filtering of noisy events
- **Event replay:** Time-travel debugging of agent sessions
- **Custom hook types:** User-defined hooks for specific tools
- **Multi-project support:** Watch multiple Claude projects simultaneously
- **Analytics dashboard:** Aggregate metrics and insights
- **Alert system:** Notify on suspicious agent behavior

---

## Appendix A: File Structure

```
generic-corp/
├── apps/
│   └── server/
│       └── src/
│           └── integration/
│               ├── hooks/              # Hook handler scripts
│               │   ├── session-start.js
│               │   ├── user-prompt.js
│               │   └── post-tool.js
│               ├── services/           # Background services
│               │   ├── transcript-watcher.ts
│               │   └── task-sync.ts
│               ├── api/               # API endpoints
│               │   ├── hooks.ts
│               │   └── tasks.ts
│               ├── systemd/           # Service files
│               │   ├── transcript-watcher.service
│               │   └── task-sync.service
│               └── scripts/           # Installation scripts
│                   ├── install.sh
│                   └── merge-settings.js
└── docs/
    └── CLAUDE_CODE_INTEGRATION_ARCHITECTURE.md  # This document
```

## Appendix B: Configuration Examples

### Complete Hook Configuration

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /home/nkillgore/generic-corp/integration/hooks/session-start.js"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /home/nkillgore/generic-corp/integration/hooks/user-prompt.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node /home/nkillgore/generic-corp/integration/hooks/post-tool.js"
          }
        ]
      }
    ]
  }
}
```

### Environment Variables

```bash
# Server configuration
GENERIC_CORP_SERVER=http://localhost:3000
NODE_ENV=production

# Claude directories
CLAUDE_PROJECTS_DIR=/home/nkillgore/.claude/projects
CLAUDE_TASKS_DIR=/home/nkillgore/.claude/tasks

# Performance tuning
MAX_EVENTS_PER_BATCH=50
FILE_WATCH_DEBOUNCE_MS=500
HOOK_TIMEOUT_MS=5000

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/generic-corp/integration.log
```

---

**Document Version:** 1.0
**Last Updated:** 2026-01-27
**Next Review:** 2026-02-27
