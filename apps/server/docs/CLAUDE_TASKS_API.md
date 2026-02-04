# Claude Code Tasks API

This API provides REST endpoints and WebSocket events for managing Claude Code task files stored in `~/.claude/tasks/{team}/`.

## Architecture

- **File Watcher**: `src/services/taskWatcher.ts` - Watches task JSON files using chokidar
- **REST API**: `src/api/tasks.ts` - CRUD operations for task files
- **WebSocket Events**: Real-time sync via Socket.io

## REST Endpoints

### GET /api/claude-tasks/:team

List all tasks for a team.

**Response**: `200 OK`
```json
[
  {
    "id": "1",
    "subject": "Implement feature X",
    "description": "Detailed description...",
    "status": "pending",
    "owner": "eng-1",
    "blocks": ["2"],
    "blockedBy": [],
    "metadata": {}
  }
]
```

### GET /api/claude-tasks/:team/:taskId

Get a single task.

**Response**: `200 OK` or `404 Not Found`
```json
{
  "id": "1",
  "subject": "Implement feature X",
  "description": "Detailed description...",
  "status": "in_progress",
  "owner": "eng-1"
}
```

### POST /api/claude-tasks/:team

Create a new task.

**Request Body**:
```json
{
  "subject": "Implement feature X",
  "description": "Detailed description...",
  "status": "pending",
  "owner": "eng-1"
}
```

**Response**: `201 Created`
```json
{
  "id": "3",
  "subject": "Implement feature X",
  "description": "Detailed description...",
  "status": "pending",
  "owner": "eng-1"
}
```

### PUT /api/claude-tasks/:team/:taskId

Update a task. Supports optimistic concurrency control via `If-Unmodified-Since` header.

**Headers** (optional):
- `If-Unmodified-Since`: ISO timestamp of last read

**Request Body**: Partial task object
```json
{
  "status": "completed"
}
```

**Response**: `200 OK` or `409 Conflict` (if file was modified)

### DELETE /api/claude-tasks/:team/:taskId

Delete a task.

**Response**: `204 No Content` or `404 Not Found`

## WebSocket Events

### Server → Client

#### task:created
Emitted when a new task file is detected.

```json
{
  "team": "my-team",
  "taskId": "3",
  "task": {
    "id": "3",
    "subject": "New task",
    "status": "pending"
  }
}
```

#### task:updated
Emitted when a task file changes.

```json
{
  "team": "my-team",
  "taskId": "1",
  "task": {
    "id": "1",
    "subject": "Updated task",
    "status": "in_progress"
  }
}
```

#### task:deleted
Emitted when a task file is removed.

```json
{
  "team": "my-team",
  "taskId": "2"
}
```

## Task File Format

Task files are stored as JSON in `~/.claude/tasks/{team}/{id}.json`:

```json
{
  "id": "1",
  "subject": "Task title",
  "description": "Detailed description",
  "status": "pending",
  "owner": "eng-1",
  "blocks": ["2", "3"],
  "blockedBy": ["0"],
  "metadata": {
    "priority": "high",
    "custom": "data"
  }
}
```

### Fields

- **id** (string, required): Unique task identifier
- **subject** (string, required): Task title
- **description** (string, required): Detailed task description
- **status** (string, required): One of: `pending`, `in_progress`, `completed`
- **owner** (string, optional): Agent or user assigned to the task
- **blocks** (array, optional): Task IDs that are blocked by this task
- **blockedBy** (array, optional): Task IDs that block this task
- **metadata** (object, optional): Custom key-value data

## Conflict Handling

The API uses optimistic concurrency control:

1. Client reads task and notes the `Last-Modified` time
2. Client makes changes and sends update with `If-Unmodified-Since: <timestamp>`
3. Server checks if file was modified since that time
4. If modified, returns `409 Conflict` with current server timestamp
5. Client must re-fetch, merge changes, and retry

## Example Usage

### JavaScript/TypeScript Client

```typescript
// List all tasks for a team
const tasks = await fetch('/api/claude-tasks/my-team').then(r => r.json());

// Create a new task
const newTask = await fetch('/api/claude-tasks/my-team', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subject: 'Implement feature',
    description: 'Details here...',
    status: 'pending'
  })
}).then(r => r.json());

// Update a task with conflict detection
const response = await fetch(`/api/claude-tasks/my-team/${taskId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'If-Unmodified-Since': lastModified
  },
  body: JSON.stringify({ status: 'completed' })
});

if (response.status === 409) {
  // Conflict! File was modified by another client
  const { serverMtime } = await response.json();
  // Re-fetch and retry...
}

// Listen for real-time updates
socket.on('task:updated', ({ team, taskId, task }) => {
  console.log(`Task ${team}/${taskId} updated:`, task);
});
```

## Performance Notes

- The file watcher uses chokidar's `awaitWriteFinish` to avoid partial reads
- All file operations are async and non-blocking
- WebSocket broadcasts are efficient (single message per change)
- Task metadata is cached in memory for quick access

## Future Enhancements

- [ ] Add task search/filter endpoints
- [ ] Support bulk operations
- [ ] Add task history/audit log
- [ ] Implement task templates
