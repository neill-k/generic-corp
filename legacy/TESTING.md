# Testing Guide - Generic Corp Phase 1

This guide covers how to test all Phase 1 features, from basic setup to end-to-end scenarios.

## Prerequisites

1. **Environment Setup**
   ```bash
   # Ensure you have Node.js 20+ and pnpm 9+
   node --version  # Should be >= 20
   pnpm --version  # Should be >= 9
   ```

2. **Environment Variables**
   ```bash
   # Copy example env file
   cp apps/server/.env.example apps/server/.env
   
   # Agent execution runs via a configurable CLI runner.
   # By default it runs in "echo" mode (returns the prompt).
   ```

3. **Start Infrastructure**
   ```bash
   # Start PostgreSQL and Redis
   pnpm docker:up
   
   # Verify containers are running
   docker ps
   # Should see: generic-corp-postgres and generic-corp-redis
   ```

4. **Initialize Database**
   ```bash
   # Generate Prisma client
   pnpm db:generate
   
   # Push schema to database
   pnpm db:push
   ```

## Quick Start Testing

### 1. Start the Application

```bash
# Terminal 1: Start both server and game
pnpm dev

# Or start separately:
# Terminal 1: Server only
pnpm dev:server

# Terminal 2: Game only  
pnpm dev:game
```

**Expected Output:**
- Server: `[Server] Running on http://localhost:3000`
- Game: `VITE ready in XXX ms` → `http://localhost:5173`

### 2. Verify Services

```bash
# Health check
curl http://localhost:3000/health
# Expected: {"status":"ok","timestamp":...}

# Check agents endpoint
curl http://localhost:3000/api/agents
# Expected: JSON array with 5 agents (Marcus, Sable, DeVonte, Yuki, Gray)
```

## Manual Testing Scenarios

### Test 1: REST API - List Agents

```bash
# Get all agents
curl http://localhost:3000/api/agents | jq

# Get specific agent
curl http://localhost:3000/api/agents/<agent-id> | jq

# Expected: Agent objects with id, name, role, status, etc.
```

**Verify:**
- ✅ Returns array of 5 agents
- ✅ Each agent has required fields (id, name, role, status)
- ✅ Status is "idle" initially

### Test 2: REST API - Create Task

```bash
# Create a task for Sable
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Review code architecture",
    "description": "Review the current codebase architecture and suggest improvements",
    "priority": "high"
  }' | jq

# Expected: Task object with id, status: "pending"
```

**Verify:**
- ✅ Task created with status "pending"
- ✅ Task assigned to correct agent
- ✅ Task appears in `/api/tasks` endpoint

### Test 3: REST API - Execute Task (Agent Execution)

```bash
# First, create a task (get task ID from response)
TASK_ID=$(curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Write a hello world function",
    "description": "Write a simple hello world function in TypeScript",
    "priority": "normal"
  }' | jq -r '.id')

# Execute the task
curl -X POST http://localhost:3000/api/tasks/$TASK_ID/execute | jq

# Expected: {"success":true,"taskId":"..."}

# Check task status
curl http://localhost:3000/api/tasks/$TASK_ID | jq

# Expected: status changes to "in_progress" then "completed"
# result field contains agent output with tokensUsed > 0
```

**Verify:**
- ✅ Task status transitions: pending → in_progress → completed
- ✅ Task result contains agent output
- ✅ Token usage is tracked (input > 0, output > 0)
- ✅ Cost is calculated
- ✅ Tools used array is populated

### Test 4: Agent Tool Execution

Create a task that requires tool usage:

```bash
# Task that should trigger filesystem tool
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Read package.json",
    "description": "Use the filesystem_read tool to read the package.json file in the root directory and summarize its contents",
    "priority": "normal"
  }' | jq

# Execute and monitor
# Check logs for tool execution messages
```

**Verify:**
- ✅ Agent receives tool descriptions in prompt
- ✅ Tool calls are detected in agent output
- ✅ Tools are executed successfully
- ✅ Tool results are included in final output

### Test 5: WebSocket Connection

```bash
# Using wscat (install: npm install -g wscat)
wscat -c ws://localhost:3000

# Or use browser console:
# Open http://localhost:5173
# Open DevTools → Console
# Check for "[Socket] Connected" message
```

**Expected Events:**
- `connect` - Connection established
- `init` - Initial state with agents, drafts, game state
- `agent:status` - Agent status updates
- `task:progress` - Task progress updates
- `task:completed` - Task completion
- `heartbeat` - Keep-alive (every 30s)

### Test 6: Frontend - Agent Selection

1. Open http://localhost:5173
2. **Verify:**
   - ✅ See isometric office scene with agent sprites
   - ✅ Agent list in sidebar shows 5 agents
   - ✅ Click agent sprite → agent selected in sidebar
   - ✅ Agent status indicators show correct colors:
     - Green = idle
     - Yellow = working
     - Red = blocked
     - Gray = offline

### Test 7: Frontend - Task Assignment

1. Select an agent (click sprite or sidebar)
2. Enter task title: "Test task"
3. Enter description: "This is a test task"
4. Click "Assign Task"
5. **Verify:**
   - ✅ Task appears in task queue
   - ✅ Agent status changes to "working"
   - ✅ Task progress updates in real-time
   - ✅ Task completes and agent returns to "idle"

### Test 8: Agent Messaging Tool

Create a task that uses messaging:

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "Sable Chen",
    "title": "Send message to DeVonte",
    "description": "Use the messaging_send tool to send a message to DeVonte Jackson with subject \"Code Review Request\" and body \"Can you review my latest changes?\"",
    "priority": "normal"
  }' | jq

# Execute task
# Then check messages:
curl http://localhost:3000/api/messages?agentId=<devonte-id> | jq
```

**Verify:**
- ✅ Message created in database
- ✅ Message appears in recipient's inbox
- ✅ WebSocket event emitted for new message

### Test 9: External Draft Approval Flow

```bash
# Create a task for an agent that can draft external emails
# (Frankie, Kenji, or Helen - but they're not implemented yet)
# For now, test via API:

curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "fromAgentId": "<agent-id>",
    "toAgentId": "<agent-id>",
    "subject": "Test External Email",
    "body": "This is a test external email",
    "type": "external_draft",
    "externalRecipient": "test@example.com"
  }' | jq

# Check pending drafts
curl http://localhost:3000/api/drafts/pending | jq

# Approve draft via WebSocket (use frontend) or API
```

**Verify:**
- ✅ Draft created with status "pending"
- ✅ Draft appears in pending drafts list
- ✅ Approval triggers email service
- ✅ Draft status changes to "approved"

## End-to-End Test Scenarios

### Scenario 1: Complete Agent Workflow

1. **Create Task**
   ```bash
   curl -X POST http://localhost:3000/api/tasks \
     -H "Content-Type: application/json" \
     -d '{
       "agentId": "Sable Chen",
       "title": "Analyze codebase structure",
       "description": "Analyze the current codebase structure and provide a summary of the architecture",
       "priority": "high"
     }'
   ```

2. **Execute Task**
   ```bash
   curl -X POST http://localhost:3000/api/tasks/<task-id>/execute
   ```

3. **Monitor Progress**
   - Watch server logs for agent execution
   - Check WebSocket events in browser console
   - Verify task status updates

4. **Verify Completion**
   - Task status = "completed"
   - Result contains meaningful output
   - Token usage tracked
   - Cost calculated
   - Agent status = "idle"

### Scenario 2: Multi-Agent Collaboration

1. Create task for Sable: "Design API endpoint"
2. Create task for DeVonte: "Implement frontend component"
3. Have Sable send message to DeVonte: "API is ready"
4. Verify message delivery and task coordination

### Scenario 3: Tool Usage Chain

1. Create task: "Read config file, modify it, commit changes"
2. Verify:
   - filesystem_read tool used
   - filesystem_write tool used
   - git_commit tool used
   - All tools executed in sequence

## Automated Testing (Future)

Currently, there are no automated tests. To add them:

```bash
# Install test dependencies
pnpm add -D vitest @vitest/ui

# Create test file
# apps/server/src/__tests__/agents.test.ts

# Run tests
pnpm --filter @generic-corp/server run test
```

## Debugging Tips

### Check Server Logs

```bash
# Watch server logs for agent execution
# Look for:
# - [Agent] Starting task: ...
# - [Tool] Executing: ...
# - Token usage: input: X, output: Y
```

### Check Database

```bash
# Open Prisma Studio
cd apps/server
pnpm db:studio

# Or query directly:
docker exec -it generic-corp-postgres psql -U genericcorp -d genericcorp
```

### Check Redis/Queue

```bash
# Connect to Redis CLI
docker exec -it generic-corp-redis redis-cli

# Check queue status
KEYS *
GET <queue-key>
```

### Common Issues

1. **Agent execution fails**
   - Verify your configured CLI tool is installed and on PATH
   - If your CLI tool requires credentials, verify they are configured for that tool
   - Check server logs for command/exit-code errors

2. **WebSocket not connecting**
   - Verify CORS settings in server
   - Check browser console for errors
   - Verify WebSocket URL is correct

3. **Tasks not executing**
   - Check Redis is running
   - Verify BullMQ worker is initialized
   - Check queue events in logs

4. **Tools not working**
   - Verify agent has tool permissions
   - Check tool executor logs
   - Verify file paths are valid

## Performance Testing

### Load Test

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API endpoint
ab -n 100 -c 10 http://localhost:3000/api/agents

# Test task creation
ab -n 50 -c 5 -p task.json -T application/json \
  http://localhost:3000/api/tasks
```

### Monitor Resources

```bash
# Watch Docker containers
docker stats

# Monitor server process
top -p $(pgrep -f "tsx watch")

# Check database connections
docker exec -it generic-corp-postgres \
  psql -U genericcorp -d genericcorp \
  -c "SELECT count(*) FROM pg_stat_activity;"
```

## Next Steps

After verifying Phase 1 works:

1. ✅ All agents can execute tasks
2. ✅ Tools are accessible and working
3. ✅ WebSocket updates are real-time
4. ✅ Frontend displays correct state
5. ✅ Task queue processes jobs correctly

You're ready for Phase 2 features!
