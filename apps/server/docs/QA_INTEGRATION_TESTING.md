# QA Integration Testing Guide

## Overview

This guide provides QA testers with instructions for testing the Claude Code Dashboard backend during Alpha testing.

## Prerequisites

1. **Server Running**: The backend server must be running
   ```bash
   cd apps/server
   pnpm dev
   ```

2. **Tools Installed**:
   - `curl` - For REST API testing
   - `wscat` (optional) - For WebSocket testing: `npm install -g wscat`
   - `jq` (optional) - For JSON parsing: `sudo apt install jq` or `brew install jq`

## Quick Start

Run the automated QA test script:

```bash
cd apps/server
./scripts/qa-integration-test.sh
```

This script tests:
- Server health check
- Task file watcher (create/update/delete)
- REST API endpoints (CRUD operations)
- Claude Events API
- File system synchronization

## Manual Testing Procedures

### Test 1: Kanban Task File Watcher

#### 1.1 Create Task File

**Steps:**
1. Create a test team directory:
   ```bash
   mkdir -p ~/.claude/tasks/qa-test-team
   ```

2. Create a task file:
   ```bash
   cat > ~/.claude/tasks/qa-test-team/1.json <<EOF
   {
     "id": "1",
     "subject": "Test Task",
     "description": "Testing file watcher",
     "status": "pending"
   }
   EOF
   ```

3. Check server logs for:
   ```
   [TaskWatcher] Task created: qa-test-team/1
   ```

**Expected Result**: Server detects new file and emits `task:created` WebSocket event

#### 1.2 Update Task File

**Steps:**
1. Modify the task file:
   ```bash
   cat > ~/.claude/tasks/qa-test-team/1.json <<EOF
   {
     "id": "1",
     "subject": "Test Task (Updated)",
     "description": "Testing file watcher updates",
     "status": "in_progress"
   }
   EOF
   ```

2. Check server logs for:
   ```
   [TaskWatcher] Task updated: qa-test-team/1
   ```

**Expected Result**: Server detects change and emits `task:updated` WebSocket event

#### 1.3 Delete Task File

**Steps:**
1. Delete the task file:
   ```bash
   rm ~/.claude/tasks/qa-test-team/1.json
   ```

2. Check server logs for:
   ```
   [TaskWatcher] Task deleted: qa-test-team/1
   ```

**Expected Result**: Server detects deletion and emits `task:deleted` WebSocket event

### Test 2: REST API - Task Operations

#### 2.1 List All Tasks

**Request:**
```bash
curl -s http://localhost:3000/api/claude-tasks/qa-test-team | jq
```

**Expected Response:** `200 OK`
```json
[
  {
    "id": "1",
    "subject": "Test Task",
    "description": "Testing",
    "status": "pending"
  }
]
```

#### 2.2 Get Single Task

**Request:**
```bash
curl -s http://localhost:3000/api/claude-tasks/qa-test-team/1 | jq
```

**Expected Response:** `200 OK` (task object) or `404 Not Found`

#### 2.3 Create Task

**Request:**
```bash
curl -s -X POST http://localhost:3000/api/claude-tasks/qa-test-team \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "New Task via API",
    "description": "Created through REST",
    "status": "pending"
  }' | jq
```

**Expected Response:** `201 Created`
```json
{
  "id": "2",
  "subject": "New Task via API",
  "description": "Created through REST",
  "status": "pending"
}
```

**Verification**: Check that file exists at `~/.claude/tasks/qa-test-team/2.json`

#### 2.4 Update Task

**Request:**
```bash
curl -s -X PUT http://localhost:3000/api/claude-tasks/qa-test-team/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' | jq
```

**Expected Response:** `200 OK` (updated task object)

**Verification**: Check that file at `~/.claude/tasks/qa-test-team/1.json` has updated status

#### 2.5 Update Task with Conflict Detection

**Request:**
```bash
# Get current mtime
MTIME=$(stat -c %Y ~/.claude/tasks/qa-test-team/1.json)
MTIME_ISO=$(date -u -d @$MTIME +"%Y-%m-%dT%H:%M:%SZ")

# Update with old timestamp
curl -s -X PUT http://localhost:3000/api/claude-tasks/qa-test-team/1 \
  -H "Content-Type: application/json" \
  -H "If-Unmodified-Since: 2020-01-01T00:00:00Z" \
  -d '{"status": "completed"}' | jq
```

**Expected Response:** `409 Conflict`
```json
{
  "error": "Conflict: Task has been modified since last read",
  "serverMtime": "2026-01-27T..."
}
```

#### 2.6 Delete Task

**Request:**
```bash
curl -s -X DELETE http://localhost:3000/api/claude-tasks/qa-test-team/1 -w "\nHTTP Status: %{http_code}\n"
```

**Expected Response:** `204 No Content`

**Verification**: File at `~/.claude/tasks/qa-test-team/1.json` should be deleted

### Test 3: Claude Events API

#### 3.1 Post Event

**Request:**
```bash
curl -s -X POST http://localhost:3000/api/claude-events \
  -H "Content-Type: application/json" \
  -d "{
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
    \"event\": \"SessionStart\",
    \"sessionId\": \"test-session-123\"
  }" | jq
```

**Expected Response:** `201 Created`
```json
{
  "success": true
}
```

#### 3.2 Post Invalid Event

**Request:**
```bash
curl -s -X POST http://localhost:3000/api/claude-events \
  -H "Content-Type: application/json" \
  -d '{
    "event": "InvalidEvent",
    "sessionId": "test"
  }' | jq
```

**Expected Response:** `400 Bad Request`
```json
{
  "error": "Invalid event type. Must be one of: PreToolUse, PostToolUse, SessionStart, SessionEnd, UserPromptSubmit, Stop"
}
```

#### 3.3 Get Recent Events

**Request:**
```bash
curl -s http://localhost:3000/api/claude-events?limit=10 | jq
```

**Expected Response:** `200 OK` (array of events)

#### 3.4 Get Events by Session

**Request:**
```bash
curl -s "http://localhost:3000/api/claude-events?sessionId=test-session-123&limit=50" | jq
```

**Expected Response:** `200 OK` (filtered array of events)

### Test 4: WebSocket Events

#### 4.1 Connect to WebSocket

**Using wscat:**
```bash
wscat -c ws://localhost:3000
```

**Expected**: Connection established

#### 4.2 Receive Initial State

**Expected Event** (after connection):
```json
{
  "type": "init",
  "agents": [...],
  "tasks": [...],
  "messages": [...],
  "gameState": {...},
  "timestamp": 1706312345678
}
```

#### 4.3 Receive Task Events

**Test**: Create a task file manually (see Test 1.1)

**Expected Event**:
```json
{
  "type": "task:created",
  "team": "qa-test-team",
  "taskId": "1",
  "task": {
    "id": "1",
    "subject": "Test Task",
    "description": "Testing",
    "status": "pending"
  }
}
```

**Test**: Update the task file (see Test 1.2)

**Expected Event**:
```json
{
  "type": "task:updated",
  "team": "qa-test-team",
  "taskId": "1",
  "task": {
    "id": "1",
    "subject": "Test Task (Updated)",
    "status": "in_progress"
  }
}
```

**Test**: Delete the task file (see Test 1.3)

**Expected Event**:
```json
{
  "type": "task:deleted",
  "team": "qa-test-team",
  "taskId": "1"
}
```

## Test Cases for Alpha Testing

### High Priority Test Cases

| ID | Test Case | Expected Result |
|----|-----------|----------------|
| TC-001 | Server responds to health check | 200 OK from /api/agents |
| TC-002 | File watcher detects new task file | task:created event emitted |
| TC-003 | File watcher detects task update | task:updated event emitted |
| TC-004 | File watcher detects task deletion | task:deleted event emitted |
| TC-005 | REST API lists all tasks for team | Returns array of tasks |
| TC-006 | REST API gets single task | Returns task object or 404 |
| TC-007 | REST API creates new task | Task file created on disk |
| TC-008 | REST API updates task | Task file updated on disk |
| TC-009 | REST API deletes task | Task file removed from disk |
| TC-010 | Conflict detection prevents overwrite | 409 Conflict when outdated |
| TC-011 | Events API accepts valid event | 201 Created |
| TC-012 | Events API rejects invalid event | 400 Bad Request |
| TC-013 | Events API returns recent events | Array of events |
| TC-014 | WebSocket connection establishes | Connected state |
| TC-015 | WebSocket receives initial state | init event with data |

### Medium Priority Test Cases

| ID | Test Case | Expected Result |
|----|-----------|----------------|
| TC-016 | Multiple teams have isolated tasks | No cross-team data leakage |
| TC-017 | Large task list (100+ tasks) | Performance acceptable |
| TC-018 | Rapid file changes (stress test) | All changes detected |
| TC-019 | Concurrent API requests | No race conditions |
| TC-020 | Invalid JSON in task file | Error handled gracefully |

### Low Priority Test Cases

| ID | Test Case | Expected Result |
|----|-----------|----------------|
| TC-021 | Task with all optional fields | Saved and retrieved correctly |
| TC-022 | Task with no optional fields | Saved and retrieved correctly |
| TC-023 | Special characters in task fields | Properly escaped and stored |
| TC-024 | Very long task descriptions | Handled without truncation |
| TC-025 | Empty team directory | Returns empty array |

## Known Issues

1. **messages.ts file corruption** - Pre-existing issue, does not affect task functionality
2. **TypeScript unused parameter warnings** - Cosmetic, does not affect runtime

## Troubleshooting

### Issue: Server not responding
**Solution**: Check server is running with `pnpm dev:server`

### Issue: Task events not firing
**Solution**:
1. Check server logs for "[TaskWatcher] Starting file watcher"
2. Verify ~/.claude/tasks directory exists
3. Check file permissions

### Issue: WebSocket connection fails
**Solution**:
1. Verify server port (default 3000)
2. Check CORS configuration
3. Try polling transport instead of websocket

### Issue: REST API returns 500 errors
**Solution**:
1. Check server logs for error details
2. Verify request payload format
3. Check task file JSON syntax

## Reporting Issues

When reporting issues, include:
1. Test case ID (if applicable)
2. Steps to reproduce
3. Expected vs actual result
4. Server logs (relevant portion)
5. Environment details (OS, Node version)

## Success Criteria

Backend is ready for frontend integration when:
- ✅ All high priority test cases pass
- ✅ No critical or high severity bugs
- ✅ WebSocket events fire consistently
- ✅ REST API handles errors gracefully
- ✅ Performance is acceptable under load
