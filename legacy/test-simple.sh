#!/bin/bash
# Simple test script without jq dependency

BASE_URL="http://localhost:3000"

echo "🧪 Generic Corp Simple API Tests"
echo "=================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo "✅ Health check passed"
  echo "$body"
else
  echo "❌ Health check failed (HTTP $http_code)"
  echo "$body"
fi
echo ""

# Test 2: List Agents
echo "Test 2: List Agents"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents" 2>&1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  agent_count=$(echo "$body" | grep -o '"id"' | wc -l)
  echo "✅ Found $agent_count agents"
  echo "$body" | head -20
else
  echo "❌ Failed to list agents (HTTP $http_code)"
  echo "$body"
fi
echo ""

# Test 3: Create Task
echo "Test 3: Create Task"
task_response=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Test Task",
    "description": "This is a test task",
    "priority": "normal"
  }' 2>&1)

if echo "$task_response" | grep -q '"id"'; then
  task_id=$(echo "$task_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "✅ Task created: $task_id"
  echo "$task_response" | head -10
else
  echo "❌ Failed to create task"
  echo "$task_response"
fi
echo ""

echo "=================================="
echo "✅ Basic tests complete!"
echo ""
echo "Note: For full testing with agent execution, ensure:"
echo "1. Database connection is working"
echo "2. Claude credentials are in ~/.claude/.credentials.json"
echo "3. Server is running: pnpm dev:server"
