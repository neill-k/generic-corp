#!/bin/bash
# Quick API testing script for Generic Corp

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Generic Corp API Testing"
echo "=========================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  echo -e "${GREEN}✅ Health check passed${NC}"
  echo "$body" | jq .
else
  echo -e "${RED}❌ Health check failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 2: List Agents
echo -e "${YELLOW}Test 2: List Agents${NC}"
response=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/agents")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
  agent_count=$(echo "$body" | jq '. | length')
  echo -e "${GREEN}✅ Found $agent_count agents${NC}"
  echo "$body" | jq '.[] | {id, name, role, status}'
else
  echo -e "${RED}❌ Failed to list agents (HTTP $http_code)${NC}"
fi
echo ""

# Test 3: Create Task
echo -e "${YELLOW}Test 3: Create Task${NC}"
task_response=$(curl -s -X POST "$BASE_URL/api/tasks" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Test Task",
    "description": "This is a test task created by the test script",
    "priority": "normal"
  }')

task_id=$(echo "$task_response" | jq -r '.id // empty')

if [ -n "$task_id" ] && [ "$task_id" != "null" ]; then
  echo -e "${GREEN}✅ Task created: $task_id${NC}"
  echo "$task_response" | jq '{id, title, status, agentId}'
  
  # Test 4: Execute Task
  echo ""
  echo -e "${YELLOW}Test 4: Execute Task${NC}"
  echo "Executing task $task_id..."
  
  exec_response=$(curl -s -X POST "$BASE_URL/api/tasks/$task_id/execute")
  success=$(echo "$exec_response" | jq -r '.success // false')
  
  if [ "$success" = "true" ]; then
    echo -e "${GREEN}✅ Task execution started${NC}"
    echo "$exec_response" | jq .
    
    # Wait a bit and check status
    echo ""
    echo "Waiting 5 seconds for task to process..."
    sleep 5
    
    task_status=$(curl -s "$BASE_URL/api/tasks/$task_id" | jq -r '.status')
    echo -e "${YELLOW}Task status: $task_status${NC}"
    
    if [ "$task_status" = "completed" ]; then
      echo -e "${GREEN}✅ Task completed successfully${NC}"
      curl -s "$BASE_URL/api/tasks/$task_id" | jq '{status, result: .result | {success, tokensUsed, costUsd, toolsUsed}}'
    elif [ "$task_status" = "in_progress" ]; then
      echo -e "${YELLOW}⏳ Task still in progress${NC}"
    elif [ "$task_status" = "failed" ]; then
      echo -e "${RED}❌ Task failed${NC}"
      curl -s "$BASE_URL/api/tasks/$task_id" | jq '.result'
    fi
  else
    echo -e "${RED}❌ Task execution failed${NC}"
    echo "$exec_response" | jq .
  fi
else
  echo -e "${RED}❌ Failed to create task${NC}"
  echo "$task_response" | jq .
fi
echo ""

# Test 5: List Tasks
echo -e "${YELLOW}Test 5: List Tasks${NC}"
tasks_response=$(curl -s "$BASE_URL/api/tasks?status=pending")
task_count=$(echo "$tasks_response" | jq '. | length')
echo -e "${GREEN}✅ Found $task_count pending tasks${NC}"
echo ""

# Test 6: Check Messages
echo -e "${YELLOW}Test 6: Check Messages${NC}"
messages_response=$(curl -s "$BASE_URL/api/messages")
message_count=$(echo "$messages_response" | jq '. | length')
echo -e "${GREEN}✅ Found $message_count messages${NC}"
echo ""

# Test 7: Check Activity Log
echo -e "${YELLOW}Test 7: Check Activity Log${NC}"
activity_response=$(curl -s "$BASE_URL/api/activity?limit=10")
activity_count=$(echo "$activity_response" | jq '. | length')
echo -e "${GREEN}✅ Found $activity_count activity entries${NC}"
echo ""

echo "=========================="
echo -e "${GREEN}✅ Testing complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:5173 to test frontend"
echo "2. Check server logs for detailed execution info"
echo "3. Use Prisma Studio: cd apps/server && pnpm db:studio"
