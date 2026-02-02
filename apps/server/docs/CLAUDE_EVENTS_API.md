# Claude Code Events API

Real-time event ingestion and broadcasting for Claude Code hook integration.

## Overview

This API enables Claude Code to send hook events to the Generic Corp dashboard, where they are:
1. Stored in-memory (with Redis persistence if available)
2. Broadcast to all connected WebSocket clients in real-time
3. Sent as history to newly connecting clients

## API Endpoints

### POST /api/claude-events

Ingest a new Claude Code event.

**Request Body:**
```typescript
{
  timestamp: string;        // ISO 8601 timestamp
  event: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "UserPromptSubmit" | "Stop";
  sessionId: string;        // Unique session identifier
  data: {
    tool_name?: string;
    tool_input?: Record<string, unknown>;
    tool_response?: Record<string, unknown>;
    prompt?: string;
  };
}
```

**Response:**
- `201 Created` - Event accepted
- `400 Bad Request` - Invalid event structure
- `500 Internal Server Error` - Server error

**Example:**
```bash
curl -X POST http://localhost:3000/api/claude-events \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2024-01-26T10:30:00.000Z",
    "event": "PreToolUse",
    "sessionId": "abc-123",
    "data": {
      "tool_name": "Read",
      "tool_input": {"file_path": "/path/to/file.ts"}
    }
  }'
```

### GET /api/claude-events

Retrieve recent events.

**Query Parameters:**
- `sessionId` (optional) - Filter by session ID
- `limit` (optional, default: 100) - Maximum events to return

**Response:**
```typescript
Array<{
  id: string;
  timestamp: string;
  event: string;
  sessionId: string;
  data: Record<string, unknown>;
}>
```

**Example:**
```bash
# Get all recent events
curl http://localhost:3000/api/claude-events

# Get events for specific session
curl http://localhost:3000/api/claude-events?sessionId=abc-123&limit=50
```

## WebSocket Events

### Server → Client

#### `claude:event`
Emitted when a new event is received.

```typescript
{
  id: string;
  timestamp: string;
  event: string;
  sessionId: string;
  data: Record<string, unknown>;
}
```

#### `claude:events:history`
Sent to newly connected clients with recent event history.

```typescript
Array<{
  id: string;
  timestamp: string;
  event: string;
  sessionId: string;
  data: Record<string, unknown>;
}>
```

## Hook Integration

See `docs/claude-hook-example.sh` for an example hook script that sends events to this API.

### Setup Steps

1. Create a hook script that posts to `/api/claude-events`
2. Make it executable: `chmod +x your-hook.sh`
3. Configure Claude Code to call your hook on events
4. Set environment variables:
   - `API_URL` - Your server URL (default: http://localhost:3000)
   - `CLAUDE_SESSION_ID` - Unique session identifier

## Storage

Events are stored with a hybrid approach:

1. **In-Memory Buffer** (always available)
   - Stores last 1000 events
   - Fast access
   - Survives server restarts if Redis is available

2. **Redis** (optional, auto-detected)
   - Persistent storage
   - Supports horizontal scaling
   - Automatically falls back to memory if unavailable

## Event Types

- **SessionStart** - New Claude Code session started
- **SessionEnd** - Claude Code session ended
- **PreToolUse** - Before a tool is executed
- **PostToolUse** - After a tool completes
- **UserPromptSubmit** - User submitted a prompt
- **Stop** - User stopped execution

## Testing

Run unit tests:
```bash
pnpm --filter @generic-corp/server test src/__tests__/claude-events.test.ts
```

Test the service directly:
```bash
tsx src/test-claude-events.ts
```

Test the API endpoint:
```bash
# Start the server
pnpm dev:server

# In another terminal, send a test event
curl -X POST http://localhost:3000/api/claude-events \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "'"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)"'",
    "event": "SessionStart",
    "sessionId": "test-123",
    "data": {}
  }'
```
