#!/bin/bash
# QA Integration Testing Script for Claude Code Dashboard Backend
# This script performs manual E2E tests that QA can run during Alpha testing

set -e

SERVER_URL="${SERVER_URL:-http://localhost:3000}"
TEST_TEAM="qa-test-$(date +%s)"
TASKS_DIR="$HOME/.claude/tasks/$TEST_TEAM"

echo "========================================="
echo "Claude Code Dashboard Backend QA Tests"
echo "========================================="
echo ""
echo "Server URL: $SERVER_URL"
echo "Test Team: $TEST_TEAM"
echo "Tasks Directory: $TASKS_DIR"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Create test directory
mkdir -p "$TASKS_DIR"
info "Created test directory: $TASKS_DIR"

echo ""
echo "========================================="
echo "Test 1: Server Health Check"
echo "========================================="
if curl -s "$SERVER_URL/api/agents" > /dev/null 2>&1; then
    pass "Server is responding"
else
    fail "Server is not responding at $SERVER_URL"
    echo "Please start the server with: pnpm dev:server"
    exit 1
fi

echo ""
echo "========================================="
echo "Test 2: Task File Watcher - Create"
echo "========================================="
info "Creating task file: 1.json"
cat > "$TASKS_DIR/1.json" <<EOF
{
  "id": "1",
  "subject": "QA Test Task 1",
  "description": "This task was created by the QA test script",
  "status": "pending",
  "owner": "qa-tester"
}
EOF
sleep 2
info "Task file created. Check server logs for 'Task created: $TEST_TEAM/1' message"
if [ -f "$TASKS_DIR/1.json" ]; then
    pass "Task file exists"
else
    fail "Task file was not created"
fi

echo ""
echo "========================================="
echo "Test 3: REST API - List Tasks"
echo "========================================="
RESPONSE=$(curl -s "$SERVER_URL/api/claude-tasks/$TEST_TEAM")
if echo "$RESPONSE" | grep -q "QA Test Task 1"; then
    pass "REST API returns task list"
else
    fail "REST API did not return expected task"
    echo "Response: $RESPONSE"
fi

echo ""
echo "========================================="
echo "Test 4: REST API - Get Single Task"
echo "========================================="
RESPONSE=$(curl -s "$SERVER_URL/api/claude-tasks/$TEST_TEAM/1")
if echo "$RESPONSE" | grep -q "QA Test Task 1"; then
    pass "REST API returns single task"
else
    fail "REST API did not return expected task"
    echo "Response: $RESPONSE"
fi

echo ""
echo "========================================="
echo "Test 5: REST API - Create Task"
echo "========================================="
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/claude-tasks/$TEST_TEAM" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Created via REST API",
    "description": "This task was created via REST",
    "status": "pending"
  }')
TASK_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$TASK_ID" ]; then
    pass "REST API created task with ID: $TASK_ID"
    if [ -f "$TASKS_DIR/$TASK_ID.json" ]; then
        pass "Task file was created on disk"
    else
        fail "Task file was not created on disk"
    fi
else
    fail "REST API did not create task"
    echo "Response: $RESPONSE"
fi

echo ""
echo "========================================="
echo "Test 6: Task File Watcher - Update"
echo "========================================="
info "Updating task file: 1.json"
cat > "$TASKS_DIR/1.json" <<EOF
{
  "id": "1",
  "subject": "QA Test Task 1 (Updated)",
  "description": "This task was updated by the QA test script",
  "status": "in_progress",
  "owner": "qa-tester"
}
EOF
sleep 2
info "Task file updated. Check server logs for 'Task updated: $TEST_TEAM/1' message"
RESPONSE=$(curl -s "$SERVER_URL/api/claude-tasks/$TEST_TEAM/1")
if echo "$RESPONSE" | grep -q "in_progress"; then
    pass "Task status was updated"
else
    fail "Task status was not updated"
fi

echo ""
echo "========================================="
echo "Test 7: REST API - Update Task"
echo "========================================="
RESPONSE=$(curl -s -X PUT "$SERVER_URL/api/claude-tasks/$TEST_TEAM/1" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}')
if echo "$RESPONSE" | grep -q "completed"; then
    pass "REST API updated task status"
    # Verify file was updated
    if grep -q "completed" "$TASKS_DIR/1.json"; then
        pass "Task file was updated on disk"
    else
        fail "Task file was not updated on disk"
    fi
else
    fail "REST API did not update task"
    echo "Response: $RESPONSE"
fi

echo ""
echo "========================================="
echo "Test 8: Claude Events API - Post Event"
echo "========================================="
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/claude-events" \
  -H "Content-Type: application/json" \
  -d "{
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
    \"event\": \"SessionStart\",
    \"sessionId\": \"qa-test-session-$(date +%s)\"
  }")
if echo "$RESPONSE" | grep -q "success"; then
    pass "Claude Events API accepted event"
else
    fail "Claude Events API rejected event"
    echo "Response: $RESPONSE"
fi

echo ""
echo "========================================="
echo "Test 9: Claude Events API - Get Events"
echo "========================================="
RESPONSE=$(curl -s "$SERVER_URL/api/claude-events?limit=10")
if echo "$RESPONSE" | grep -q "\["; then
    pass "Claude Events API returned events list"
else
    fail "Claude Events API did not return events"
    echo "Response: $RESPONSE"
fi

echo ""
echo "========================================="
echo "Test 10: REST API - Delete Task"
echo "========================================="
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$SERVER_URL/api/claude-tasks/$TEST_TEAM/1")
if [ "$STATUS" = "204" ]; then
    pass "REST API deleted task"
    sleep 1
    if [ ! -f "$TASKS_DIR/1.json" ]; then
        pass "Task file was deleted from disk"
    else
        fail "Task file still exists on disk"
    fi
else
    fail "REST API did not delete task (HTTP $STATUS)"
fi

echo ""
echo "========================================="
echo "Test 11: Task File Watcher - Delete"
echo "========================================="
if [ -n "$TASK_ID" ] && [ -f "$TASKS_DIR/$TASK_ID.json" ]; then
    info "Deleting task file: $TASK_ID.json"
    rm "$TASKS_DIR/$TASK_ID.json"
    sleep 2
    info "Task file deleted. Check server logs for 'Task deleted: $TEST_TEAM/$TASK_ID' message"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/api/claude-tasks/$TEST_TEAM/$TASK_ID")
    if [ "$RESPONSE" = "404" ]; then
        pass "REST API returns 404 for deleted task"
    else
        fail "REST API still returns deleted task (HTTP $RESPONSE)"
    fi
else
    info "Skipping delete test (no task file to delete)"
fi

echo ""
echo "========================================="
echo "Test 12: WebSocket Connection"
echo "========================================="
info "WebSocket testing requires a separate client connection"
info "Use tools like wscat or the frontend to test WebSocket events:"
info "  npm install -g wscat"
info "  wscat -c ws://localhost:3000"
info "Expected events: task:created, task:updated, task:deleted"

echo ""
echo "========================================="
echo "Cleanup"
echo "========================================="
info "Cleaning up test directory: $TASKS_DIR"
rm -rf "$TASKS_DIR"
if [ ! -d "$TASKS_DIR" ]; then
    pass "Test directory cleaned up"
else
    fail "Failed to clean up test directory"
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review the output above.${NC}"
    exit 1
fi
