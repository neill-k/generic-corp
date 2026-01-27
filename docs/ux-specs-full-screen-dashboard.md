# Generic Corp Full-Screen Real-Time Dashboard - UX Specification

**Document Version:** 1.0
**Last Updated:** January 26, 2026
**Status:** Ready for Implementation
**Author:** Product Team (product-2)

---

## Executive Summary

This document defines the UX specifications for a full-screen, immersive real-time monitoring dashboard for the Generic Corp AI agent management system. The dashboard provides immediate visibility into agent activity, task execution, message flows, resource consumption, and system health.

---

## 1. ARCHITECTURE OVERVIEW

### 1.1 Data Sources (What Flows Into Dashboard)

The dashboard consumes real-time activity data from multiple systems:

**A. Agent System**
- 10 agents with distinct roles: Marcus (CEO), Sable (Principal Engineer), DeVonte (Full-Stack Dev), Yuki (SRE), Graham (Data Engineer), Miranda (Software Engineer), Helen (Exec Assistant), Walter (CFO), Frankie (VP Sales), Kenji (Marketing)
- Each agent has: `status` (idle/working/blocked/offline), `currentTaskId`, `capabilities`, `toolPermissions`
- Real-time status updates via `agent:status` event

**B. Task Execution System**
- Task lifecycle: pending → in_progress → (completed/failed/blocked)
- Real-time tracking: `progressPercent` (0-100), `progressDetails`, `result`, `error`
- Priority levels: low/normal/high/urgent
- Events: `task:queued`, `task:progress` (continuous), `task:completed`, `task:failed`
- Metadata: `tokensUsed`, `costUsd`, `toolCalls[]`, `startedAt`, `completedAt`

**C. Message System**
- Internal agent-to-agent messages: `fromAgent` → `toAgent`
- Message types: direct/broadcast/system/external_draft
- Statuses: pending/delivered/read/approved/rejected
- Events: `message:new` with subject, body, timestamp
- External drafts require CEO approval before sending

**D. Activity Log Stream**
- Structured event log: `agentId`, `eventType`, `eventData`, `timestamp`
- Event types: task_started, task_completed, task_failed, message_sent, draft_created, etc.
- Designed for streaming consumption (ordered by timestamp desc)

**E. Session/Cost Tracking**
- `AgentSession` records: tokens consumed (input/output), tool usage, duration, status
- Cost estimation: input tokens @ $3/1M, output tokens @ $15/1M
- Cumulative budget tracking and burndown

**F. WebSocket Events (Real-Time Channels)**

```typescript
Server → Client (Push):
- AGENT_STATUS: { agentId, status, taskId }
- TASK_PROGRESS: { taskId, progress, details }
- TASK_COMPLETED: { taskId, result }
- TASK_FAILED: { taskId, error }
- MESSAGE_NEW: { toAgentId, message }
- DRAFT_PENDING: { draftId, fromAgent, content }
- ACTIVITY_LOG: { agentId, eventType, eventData, timestamp }
- HEARTBEAT: { timestamp } (every 30 seconds)

Client → Server (Commands):
- TASK_ASSIGN: { agentId, title, description, priority }
- DRAFT_APPROVE: { draftId }
- DRAFT_REJECT: { draftId, reason }
- MESSAGE_SEND: { toAgentId, subject, body }
- STATE_SYNC: { camera, ui }
```

---

## 2. DASHBOARD LAYOUT & COMPOSITION

### 2.1 Overall Structure

**Full-screen immersive interface** with tactical and strategic information density.

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER: System Status & Controls                                │
├─────────────────────────────────────────────────────────────────┤
│   LEFT PANEL          │      CENTER CANVAS        │   RIGHT PANEL│
│   (30% width)         │      (40% width)          │  (30% width) │
│                       │                           │              │
│   - Agent Grid        │  - Agent Swimlanes        │  - Live Feed │
│   - Task Pipeline     │  - Temporal Timeline      │  - Messages  │
│   - System Metrics    │  - Dependency Flows       │  - Alerts    │
│   - Controls          │                           │  - Budget    │
│                       │                           │              │
│                       │                           │              │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Data Refresh Strategy

| Component | Refresh Rate | Method | Rationale |
|-----------|--------------|--------|-----------|
| Agent Status Cards | Real-time (WebSocket) | Event-driven | Status changes immediately visible |
| Task Progress Bars | Real-time (WebSocket) | Event-driven | Smooth progress updates |
| Live Activity Feed | Real-time (WebSocket) | Event queue | Streaming log display |
| Timeline / Swimlanes | Real-time (WebSocket) | Event-driven | Visual representation updates |
| Message Center | Real-time (WebSocket) | Event-driven | New messages appear instantly |
| System Metrics | 5-second intervals | Polling | CPU, memory, latency metrics |
| Budget Burndown | 1-minute intervals | Polling | Cost is not critical real-time |
| Completed Tasks Archive | Batch (every 30s) | Polling | Historical data less critical |

---

## 3. DETAILED PANEL SPECIFICATIONS

### 3.1 LEFT PANEL: Tactical Control & Monitoring

**Height:** Full screen | **Width:** 30% | **Background:** Corp dark theme

#### 3.1.1 Agent Grid / Swimlane View

```
┌──────────────────────────────────┐
│ AGENTS (10/10 Online)            │ ← Expandable
├──────────────────────────────────┤
│ Marcus Bell [●] WORKING          │ ← Green dot = idle/yellow = working/red = blocked
│ ├─ Task: "Q1 Revenue Strategy"   │
│ ├─ Progress: 67% (02:15 elapsed) │
│ └─ Next: Review Sable's feedback │
│                                  │
│ Sable Chen [●] IDLE              │
│ ├─ Last Task: Code Review (5m)   │
│ ├─ Capabilities: 5               │
│ └─ Ready for assignment          │
│                                  │
│ DeVonte Jackson [●] WORKING      │
│ ├─ Task: "Build Kanban UI"       │
│ ├─ Progress: 43% (01:47 elapsed) │
│ ├─ Tools Used: Read, Edit, Bash  │
│ └─ Tokens: 145K input / 23K out  │
│ ...
└──────────────────────────────────┘
```

**Features:**
- Agent name, status indicator (color-coded dot), current role
- For working agents: active task title, progress %, elapsed time
- Last 2-3 tools used in current task
- Token usage live counter
- Scrollable, max 8 visible without scroll
- Click to expand detailed view

**Interactions:**
- **Click agent card** → Open agent detail panel (right side)
- **Hover on task** → Show task tooltip with full title
- **Right-click agent** → Quick actions menu (send message, assign task, view history)

#### 3.1.2 Active Tasks Pipeline

```
┌──────────────────────────────────┐
│ ACTIVE TASKS (8)                 │
├──────────────────────────────────┤
│ IN PROGRESS [3]                  │
│ ┌────────────────────────────────┐
│ │ ▶ Build Kanban UI              │
│ │   DeVonte • HIGH • 43% ░░░░░░░ │
│ │   Tools: Read, Edit, Bash      │
│ │                                │
│ │ ▶ Infrastructure Review         │
│ │   Yuki • URGENT • 67% ░░░░░░░░░│
│ │   Tools: Bash, Glob            │
│ │                                │
│ │ ▶ Market Analysis              │
│ │   Graham • NORMAL • 25% ░░░░░░░│
│ │   Tools: Grep, SQL             │
│ └────────────────────────────────┘
│                                  │
│ PENDING [4]                      │
│ ┌────────────────────────────────┐
│ │ ⏱ Dashboard Specs              │
│ │   Sable • HIGH                 │
│ │                                │
│ │ ⏱ Revenue Forecast             │
│ │   Walter • NORMAL              │
│ │                                │
│ │ ⏱ Customer Outreach            │
│ │   Frankie • URGENT             │
│ │                                │
│ │ ⏱ Social Media Strategy        │
│ │   Kenji • NORMAL               │
│ └────────────────────────────────┘
│                                  │
│ BLOCKED [1]                      │
│ ┌────────────────────────────────┐
│ │ ⚠ API Integration              │
│ │   Miranda • HIGH               │
│ │   Blocked by: "Build Kanban UI"│
│ └────────────────────────────────┘
└──────────────────────────────────┘
```

**Features:**
- Grouped by status: In Progress | Pending | Blocked
- Each task shows: title, assigned agent (first name), priority badge, progress bar
- In progress: shows elapsed time or ETA
- Blocked: shows blocking task
- Collapsible sections (default: In Progress expanded)
- Status color-coded: yellow (in progress), gray (pending), red (blocked)

**Interactions:**
- **Click task** → Highlight in center canvas, show details in right panel
- **Expand section** → Toggle to show more/fewer tasks in that status
- **Drag task** → Drag onto agent to reassign (optional feature)

#### 3.1.3 System Metrics Summary

```
┌──────────────────────────────────┐
│ SYSTEM METRICS                   │
├──────────────────────────────────┤
│ Agents Working: 4/10            │ ← 40% utilization
│ Tasks Active: 8                 │
│ Avg Task Duration: 4m 32s       │
│ Completion Rate (24h): 94.2%    │
│                                  │
│ RESOURCE USAGE                   │
│ Token Budget:                    │
│ ████████░░ 80% ($12.50 / $15)   │
│                                  │
│ Est. Daily Burn: $18.50         │
│ Days Remaining: 2.7             │
│                                  │
│ API Latency (p95): 245ms        │
│ WebSocket Connections: 3        │
│ Temporal Workflows: 12 active   │
└──────────────────────────────────┘
```

**Features:**
- Key metrics for system health
- Token budget with burndown visualization
- Estimated runway calculation
- API performance indicators
- Infrastructure health (Temporal, WebSocket connections)

#### 3.1.4 Quick Actions Bar

```
┌──────────────────────────────────┐
│ ACTIONS                          │
├──────────────────────────────────┤
│ [+ New Task]  [Send Message]    │
│ [View Drafts]  [System Log]     │
│ [View History] [Settings]        │
└──────────────────────────────────┘
```

---

### 3.2 CENTER CANVAS: Visual Activity Flow

**Height:** Full screen | **Width:** 40% | **Background:** Gradient dark

The center canvas visualizes agent work in progress using multiple visualization options (switchable tabs).

#### 3.2.1 Agent Swimlanes View (Default)

```
Timeline ────────────────────────────────────────────────────
         Now -5m  -4m  -3m  -2m  -1m   0m (current)
         │    │    │    │    │    │    │

Marcus   ├─────────[Task 1: Strategy]─────┤ (67% done)

Sable    ├──[Code Review]──┤  [idle]

DeVonte  ├────────────[Build UI]──────┤ (43% done)

Yuki     ├──[Infra Review]──┤

Graham   ├──[Market Analysis]─────────┤ (25% done)

Miranda  [blocked]───────────────[waiting on DeVonte]

Helen    [idle, ready]

Walter   [idle]

Frankie  [idle]

Kenji    [idle]
```

**Features:**
- Each row = one agent
- Time axis shows past 5 minutes with current position marked
- Tasks rendered as colored bars from start to current time
- Current position marked with vertical line or cursor
- Colors: yellow (in progress), gray (completed earlier), blue (pending), red (blocked)
- Task bar width represents elapsed time, height represents progress % (darker = more complete)
- Hover over bar → show tooltip with task details
- Click bar → select task in right panel

**Interactions:**
- **Scroll left/right** → Pan timeline
- **Scroll up/down** → Scroll agent list
- **Click task bar** → Focus task in right panel, show details
- **Hover agent row** → Highlight all tasks for that agent

#### 3.2.2 Task Dependency Graph View

```
                    [Q1 Revenue Strategy] (Marcus)
                    /         |         \
                   /          |          \
        [Market Analysis]   [Cost Analysis]   [Sales Forecast]
        (Graham, 25%)       (Walter, 45%)     (Frankie, pending)
             |
        [Customer Outreach]
        (Frankie, blocked)
```

**Features:**
- Directed acyclic graph (DAG) of task dependencies
- Nodes are tasks with progress indicators
- Edges show dependencies (task A blocks task B)
- Node colors: yellow (in progress), green (completed), gray (pending), red (blocked)
- Progress shown inside/around node
- Blocked tasks shown in red with reason
- Auto-layout to minimize crossing edges

**Interactions:**
- **Click node** → Select task in right panel
- **Hover node** → Show task details tooltip
- **Zoom/pan** → Navigate graph
- **Highlight path** → Show all tasks blocking/unblocking a task

#### 3.2.3 Real-Time Activity Timeline

```
TIME   EVENT                                    AGENT        IMPACT
─────────────────────────────────────────────────────────────────────
14:47  ✓ Task completed: "Build Kanban UI"     DeVonte      Green
       Elapsed: 23m 45s | Tokens: 234K/45K

14:45  ▶ Task progress: 87%                    DeVonte      Yellow
       "Build Kanban UI" - Running tests

14:43  ✉ Message sent: "Feedback ready"       Sable → Marcus Blue

14:40  ⚠ Task blocked: "Customer Outreach"    Frankie      Red
       Waiting on: "Build Kanban UI"

14:38  ▶ Task started: "Infrastructure Review" Yuki         Yellow
       Priority: URGENT | Est: 15 minutes

14:35  ▶ Task progress: 45%                    Marcus       Yellow
       "Q1 Revenue Strategy"

14:32  ✓ Task completed: "Code Review"        Sable        Green
       Elapsed: 12m 30s | Cost: $0.45

14:30  ▶ Task started: "Build Kanban UI"     DeVonte      Yellow
       Priority: HIGH | Est: 20 minutes

14:27  ✓ Task completed: "Market Analysis"    Graham       Green
       Elapsed: 8m 12s | Tokens: 156K/32K

14:25  ▶ Task started: "Market Analysis"      Graham       Yellow
       Priority: NORMAL
```

**Features:**
- Chronological feed of all significant events (newest first, auto-scroll)
- Color-coded event icons: ✓ (completion), ▶ (start), ⚠ (blocked), ✉ (message), ● (progress update), ⚙ (system)
- Event details: agent name, event type, relevant data
- Expandable rows to show full task details/output
- Left margin color stripe indicates event type/severity

**Interactions:**
- **Click event** → Focus task in right panel / show full output
- **Scroll** → Browse historical events
- **Filter button** → Filter by event type, agent, task status
- **Search** → Find events by keyword

---

### 3.3 RIGHT PANEL: Details & Draft Approval

**Height:** Full screen | **Width:** 30% | **Background:** Corp dark theme

#### 3.3.1 Selected Agent / Task Details

When task selected from center or left panel:

```
┌──────────────────────────────────┐
│ [← Back]  TASK DETAILS          │
├──────────────────────────────────┤
│                                  │
│ Build Kanban UI                  │
│ HIGH PRIORITY • DeVonte Jackson  │
│ Status: IN PROGRESS ░░░░░░░░░░░░│
│ Progress: 87% (19m 23s elapsed)  │
│ ETA: ~3 min remaining            │
│                                  │
│ DESCRIPTION                      │
│ Create interactive Kanban board  │
│ with real-time task synchron...  │
│ [Show full]                      │
│                                  │
│ EXECUTION DETAILS                │
│ ├─ Started: 14:30 (now 14:49)   │
│ ├─ Assigned to: DeVonte Jackson  │
│ ├─ Creator: Marcus Bell          │
│ ├─ Priority: HIGH                │
│ └─ Dependencies: None            │
│                                  │
│ RESOURCE USAGE                   │
│ ├─ Tokens: 234K input / 45K out │
│ ├─ Cost so far: $0.73            │
│ ├─ Est. total: $0.95             │
│ └─ Tools used: 5                 │
│    • Read (18 calls)             │
│    • Edit (12 calls)             │
│    • Bash (5 calls)              │
│    • Glob (2 calls)              │
│    • Grep (1 call)               │
│                                  │
│ LIVE OUTPUT (Last 10 messages)   │
│ ┌──────────────────────────────┐ │
│ │ [14:48] Running test suite.. │ │
│ │ [14:47] 87% - Tests pass...  │ │
│ │ [14:46] 75% - Compiled CSS   │ │
│ │ [14:45] Bundling assets...   │ │
│ │ ... (scroll to see more)     │ │
│ └──────────────────────────────┘ │
│                                  │
│ [Cancel Task]  [Pause]  [View Log]
└──────────────────────────────────┘
```

**Features:**
- Task title, priority, assigned agent
- Status badge with large progress bar
- Elapsed time and ETA countdown
- Full description (expandable)
- Execution metadata (start time, creator, dependencies)
- Real-time resource usage: tokens, cost, tools called
- Live output stream (last 10 events with timestamps)
- Action buttons: cancel, pause (if supported), view full log

**Interactions:**
- **Click [Show full]** → Expand description
- **Click tool name** → Show tool call details
- **Scroll output** → Browse task progress messages
- **Click [View Log]** → Open full activity log for this task
- **Hover timestamp** → Show full ISO timestamp
- **[Cancel Task]** → Confirm, then cancel execution

#### 3.3.2 Agent Detail View

When agent selected from left panel:

```
┌──────────────────────────────────┐
│ [← Back]  AGENT PROFILE         │
├──────────────────────────────────┤
│                                  │
│ DeVonte Jackson                  │
│ Full-Stack Developer             │
│ Status: WORKING                  │
│                                  │
│ CURRENT TASK                     │
│ ├─ Title: "Build Kanban UI"     │
│ ├─ Progress: 87%                 │
│ ├─ Elapsed: 19m 23s              │
│ └─ ETA: ~3 min                   │
│                                  │
│ CAPABILITIES (6)                 │
│ ├─ Frontend Development          │
│ ├─ Backend Development           │
│ ├─ React                         │
│ ├─ Node.js                       │
│ ├─ UI Development                │
│ └─ Database Design               │
│                                  │
│ TOOL PERMISSIONS (8 allowed)     │
│ ├─ ✓ Filesystem Read             │
│ ├─ ✓ Filesystem Write            │
│ ├─ ✓ Git Commit                  │
│ ├─ ✓ Messaging Send              │
│ ├─ ✓ Messaging Check             │
│ ├─ ✗ Credential Use              │
│ ├─ ✗ External Draft              │
│ └─ ✗ Database Query              │
│                                  │
│ RECENT ACTIVITY (Last 5 tasks)   │
│ ├─ [✓] Code Review (23m ago)     │
│ ├─ [✓] Build Dashboard (2h ago)  │
│ ├─ [✓] Feature Spec (4h ago)     │
│ ├─ [✓] Architecture Review (1d)  │
│ └─ [✓] Codebase Audit (2d)       │
│                                  │
│ SESSION STATS (This session)     │
│ ├─ Tasks completed: 3            │
│ ├─ Avg duration: 12m 45s         │
│ ├─ Total tokens: 523K / 98K      │
│ ├─ Total cost: $1.87             │
│ └─ Avg tokens/task: 174K / 32K   │
│                                  │
│ [Send Message] [Assign Task]     │
│ [View Full History]              │
└──────────────────────────────────┘
```

**Features:**
- Agent name, role, current status
- Current task summary (if working)
- List of capabilities (searchable)
- Tool permissions (checked/unchecked)
- Recent task history (clickable to see details)
- Session statistics (tokens, cost, completion rate)
- Quick action buttons

**Interactions:**
- **Click task in history** → Jump to that task in center panel
- **[Send Message]** → Open message compose (left panel)
- **[Assign Task]** → Show task assignment form

#### 3.3.3 Messages & Draft Approval Center

```
┌──────────────────────────────────┐
│ MESSAGES & DRAFTS                │
├──────────────────────────────────┤
│ [All] [Inbox] [Outbox] [Drafts] │
│                                  │
│ PENDING APPROVAL (2)             │
│ ┌──────────────────────────────┐ │
│ │ 📝 DeVonte wants to send:    │ │
│ │                              │ │
│ │ To: customer@acme.com        │ │
│ │ Subject: Project Update      │ │
│ │                              │ │
│ │ Hi ACME Team,                │ │
│ │ Happy to share an update     │ │
│ │ on our project progress...   │ │
│ │ [Show full]                  │ │
│ │                              │ │
│ │ [✓ Approve] [✗ Reject]      │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 📝 Marcus wants to send:     │ │
│ │                              │ │
│ │ To: investor@seedfund.io     │ │
│ │ Subject: Q1 Results          │ │
│ │ [Show full (847 chars)]      │ │
│ │                              │ │
│ │ [✓ Approve] [✗ Reject]      │ │
│ └──────────────────────────────┘ │
│                                  │
│ RECENT MESSAGES (8)              │
│ ┌──────────────────────────────┐ │
│ │ ✉ Sable → Marcus            │ │
│ │ "Code review feedback"       │ │
│ │ 5 minutes ago                │ │
│ │                              │ │
│ │ ✉ Graham → DeVonte          │ │
│ │ "Market data ready for..."   │ │
│ │ 12 minutes ago               │ │
│ │                              │ │
│ │ ✉ Yuki → Marcus             │ │
│ │ "Infrastructure check pass"  │ │
│ │ 23 minutes ago               │ │
│ │ ... (more)                   │ │
│ └──────────────────────────────┘ │
│                                  │
│ [View All Messages] [Compose]    │
└──────────────────────────────────┘
```

**Features:**
- Tabbed view: All | Inbox | Outbox | Pending Drafts
- Pending drafts section (most critical): shows external emails awaiting approval
- Each draft shows: sender, recipient, subject, preview of body
- Quick action buttons: Approve, Reject
- Recent messages list: type icon, participants, subject, time
- Expandable message preview
- Compose button for quick new message

**Interactions:**
- **[Approve]** → Send external email, mark draft as sent
- **[Reject]** → Reject draft (can be reworked)
- **Click message** → Expand to show full body
- **[Compose]** → Open message editor in modal
- **Tab switching** → Filter messages by direction/type

---

## 4. VISUAL DESIGN SYSTEM

### 4.1 Color Palette

**Base Theme:** Corporate Dark (inspired by terminal/command-line)

```
Primary Background:     #0F1620 (corp-dark)
Secondary Background:   #1A2234 (corp-mid)
Accent Background:      #2A3545 (corp-accent)
Highlight Color:        #00D9FF (cyan/corp-highlight)

Status Colors:
  Idle:                 #22C55E (green-500)
  Working:              #EAB308 (yellow-500)
  Blocked:              #EF4444 (red-500)
  Offline:              #6B7280 (gray-500)

Priority Colors:
  Low:                  #9CA3AF (gray-400)
  Normal:               #3B82F6 (blue-500)
  High:                 #FBBF24 (amber-500)
  Urgent:               #EF4444 (red-500)

Progress/Success:
  Complete:             #22C55E (green-500)
  Warning:              #EAB308 (yellow-500)
  Error:                #EF4444 (red-500)
  Info:                 #06B6D4 (cyan-500)

Text Colors:
  Primary:              #F3F4F6 (gray-100)
  Secondary:            #D1D5DB (gray-300)
  Tertiary:             #9CA3AF (gray-400)
  Muted:                #6B7280 (gray-500)
```

### 4.2 Typography

```
Font Family:           'Courier New', monospace (for data/metrics)
                       'Inter', 'Segoe UI', sans-serif (for UI text)

Size Scale:
  Hero (Headlines):    32px / bold / line-height 1.2
  Title (Sections):    18px / semibold / line-height 1.3
  Label:               12px / uppercase / letter-spacing 0.1em / gray-500
  Body:                14px / normal / line-height 1.5
  Small (Details):     12px / normal / line-height 1.4
  Tiny (Metadata):     10px / normal / line-height 1.3

Font Weights:
  Regular:             400
  Medium:              500
  Semibold:            600
  Bold:                700
```

### 4.3 Component Styling

**Status Badges:**
```
Idle:        bg-green-900/40    text-green-300    border-green-700
Working:     bg-yellow-900/40   text-yellow-300   border-yellow-700
Blocked:     bg-red-900/40      text-red-300      border-red-700
Offline:     bg-gray-800/40     text-gray-400     border-gray-700
```

**Progress Bars:**
```
Background:  bg-corp-mid (dark)
Progress:    bg-gradient-to-r from-corp-highlight to-cyan-400
Height:      2px (small) to 6px (large)
Border:      rounded-full
Animation:   smooth transition 300ms
```

**Task Cards:**
```
Default:     bg-corp-dark border-corp-accent
Hover:       bg-corp-mid transform scale-1.02
Selected:    ring-2 ring-corp-highlight bg-corp-accent
Active:      shadow-lg shadow-cyan-500/50
```

### 4.4 Icons & Indicators

```
Status Indicators:
  ● (solid circle):    Current/Active
  ○ (hollow circle):   Inactive/Pending
  ▶ (play):           Starting/In Progress
  ⏸ (pause):          Paused
  ✓ (check):          Completed/Success
  ✗ (cross):          Failed/Error
  ⚠ (warning):        Blocked/Alert
  ⏱ (hourglass):      Waiting/Pending

Message Types:
  ✉ (envelope):       Direct message
  📢 (megaphone):      Broadcast
  ⚙ (gear):           System message
  📝 (document):       Draft/External

Action Icons:
  ← / → (arrows):      Navigation
  ↻ / ⟳ (reload):      Refresh/Spinner
  ≡ (hamburger):       Menu
  ⊡ (maximize):        Fullscreen
  ▬ (minimize):        Collapse
```

---

## 5. INTERACTION PATTERNS & GESTURES

### 5.1 Navigation

**Mouse/Trackpad:**
- **Click** → Select/Focus element
- **Hover** → Show tooltip/highlight related items
- **Drag** → Pan timeline or reorder (if supported)
- **Scroll** → Scroll panels, zoom timeline
- **Right-click** → Context menu

**Keyboard Shortcuts:**
```
Tab          Forward through focusable elements
Shift+Tab    Backward through focusable elements
Enter        Activate focused button/item
Space        Toggle expanded state
Escape       Close detail panel / cancel action
Ctrl+F       Search/filter (open search modal)
Ctrl+K       Command palette (quick actions)
Ctrl+N       New task (assign)
Ctrl+M       New message (compose)
1-9          Switch between agents (quick select)
L            Go to live feed
T            Go to tasks panel
D            Go to drafts
A            Go to agents view
```

### 5.2 Real-Time Interactions

**Smooth Transitions:**
- Task progress bars animate smoothly (300ms ease-out)
- Status badge changes fade in (150ms)
- New events slide into activity feed (200ms)
- Agent status indicators pulse when updating

**Toast Notifications:**
```
Top-right corner, auto-dismiss after 5 seconds
- Success (green): "Task completed"
- Warning (yellow): "Agent blocked"
- Error (red): "Connection lost"
- Info (blue): "New message received"
```

**Auto-Refresh Behavior:**
- New activity prepends to feed (top of list)
- Completed tasks remove from active queue
- Agent status changes reflect immediately
- Progress bars update continuously (no jumps)
- Budget burndown updates every 60 seconds

### 5.3 Detail View Interactions

**Expand/Collapse:**
- Click section header to toggle expanded state
- Individual details can be expanded inline
- Task output scrolls independently

**Copy-to-Clipboard:**
- Hover over any copyable field (task ID, agent ID, etc.) → Copy button appears
- Click to copy to clipboard

**Export:**
- Right-click activity feed → Export as JSON/CSV
- Right-click task → Download detailed report

---

## 6. INFORMATION HIERARCHY & DENSITY

### 6.1 Priority Levels

**Highest Priority (Always Visible):**
1. Active task progress (center swimlanes)
2. Agent status (left agent grid)
3. Pending drafts requiring approval (right panel)
4. Blocked tasks with reasons (left task pipeline)
5. Critical alerts/errors (toast notifications)

**High Priority (Easily Accessible):**
6. Current metrics (system health)
7. Recent messages and events
8. Task details when selected
9. Agent details when selected
10. Budget/cost tracking

**Medium Priority (In Detail View):**
11. Token usage breakdown
12. Tool call history
13. Task dependencies
14. Agent session stats
15. Message threads

**Low Priority (Archived/Historical):**
16. Completed task history
17. Past agent activity
18. Historical metrics

### 6.2 Visual Density by Panel

**Left Panel:** Medium-High Density
- Multiple lists stacked
- Scrollable sections
- Compact item rows
- Minimal whitespace
- Efficient use of 30% width

**Center Canvas:** Low-Medium Density
- Timeline/swimlane view is sparse
- Task bars have breathing room
- Clear separation between agents
- Visual hierarchy clear
- Time axis provides context

**Right Panel:** Medium Density
- Detail view is more spacious
- Section breaks clearly labeled
- Relevant information highlighted
- White/dark space for readability
- Expandable sections for depth

---

## 7. DATA DISPLAY CONVENTIONS

### 7.1 Time Display

```
Relative Time (< 1 hour):
  "just now", "2m ago", "45s ago"

Absolute Time (same day):
  "14:47" (24-hour format)

Absolute Time (recent past):
  "Yesterday 09:30", "3 days ago"

Elapsed Duration:
  "2m 15s", "1h 30m", "23h 45m"

Remaining Time:
  "~5 min remaining", "~2 hours remaining"
```

### 7.2 Number Formatting

```
Tokens:
  1,234 → "1.2K"
  234,567 → "234.5K"
  1,234,567 → "1.2M"

Cost:
  $0.45 → "$0.45"
  $1.87 → "$1.87"
  Burndown rate: "$0.50/min"

Percentages:
  67% → "67%" (with progress bar)
  94.2% → "94.2%" (for metrics)

Duration:
  3600 seconds → "1h"
  125 seconds → "2m 5s"
```

### 7.3 Status Representations

**Task Status:**
```
State           Badge           Color      Icon
pending         "Pending"       Gray       ⏱
in_progress     "Working"       Yellow     ▶
blocked         "Blocked"       Red        ⚠
completed       "Done"          Green      ✓
failed          "Failed"        Red        ✗
cancelled       "Cancelled"     Gray       ○
```

**Agent Status:**
```
State       Indicator   Color    Meaning
idle        ● (green)   Green    Ready for work
working     ● (yellow)  Yellow   Currently executing task
blocked     ● (red)     Red      Waiting for dependency
offline     ● (gray)    Gray     Connection lost
```

---

## 8. PERFORMANCE & OPTIMIZATION

### 8.1 Data Management

**Message Buffering:**
- Live feed keeps last 100 events in memory
- Older events archived in database
- New events prepend to view
- No full re-render on new event

**Virtualization:**
- Visible task list virtualized (render only visible rows)
- Agent swimlanes virtualized if > 15 agents
- Activity feed uses virtual scrolling

**Update Batching:**
- Multiple events in same tick batched into single render
- Progress updates batched from 100ms+ granularity
- Agent status updates debounced (100ms)

### 8.2 Network Optimization

**WebSocket Events:**
- Only meaningful state changes transmitted
- Incremental updates (delta) not full data structures
- Heartbeat every 30 seconds to detect disconnects
- Automatic reconnect with exponential backoff

**REST Polling:**
- System metrics polled every 5 seconds
- Budget/cost metrics polled every 60 seconds
- Historical data fetched on demand (pagination)

### 8.3 UI Rendering

**Rendering Strategy:**
- React components with Zustand store
- Memoized components to prevent unnecessary re-renders
- CSS animations for smooth transitions (GPU-accelerated)
- Lazy-loaded detail panels

**Bundle Size:**
- No heavy chart libraries; custom SVG rendering
- Minimal icons (Unicode symbols + custom SVG)
- CSS-in-JS or Tailwind for styling (avoid large CSS files)

---

## 9. RESPONSIVE BEHAVIOR & FALLBACKS

### 9.1 Full-Screen Layout

The dashboard is designed for desktop/large screens (1920x1080+).

**Responsive Adjustments:**
```
Breakpoint         Layout                           Left Panel Width
≥ 2560px          Ultra-wide (add metrics column)  32%
1920px - 2559px   Standard (current spec)          30%
1366px - 1919px   Compressed (tighter spacing)     28%
< 1366px          Vertical stack (not recommended) N/A
```

### 9.2 Mobile/Tablet Fallback

For mobile, switch to simplified modal-based interface (out of scope for this spec, but should degrade gracefully):
- Tab-based navigation instead of panel layout
- Touch-friendly buttons and scrolling
- Simplified timeline view

### 9.3 Connection Loss

When WebSocket connection is lost:
- **Visual Indicator:** "Offline" badge in header with red background
- **Data Behavior:** Cached data remains visible but marked as stale
- **Refresh:** Display "Reconnecting..." spinner with retry count
- **Fallback:** Fall back to polling REST API every 5 seconds
- **Recovery:** Auto-reconnect when connection restored, fetch missed events

---

## 10. ACCESSIBILITY REQUIREMENTS

### 10.1 WCAG 2.1 Level AA

**Color Contrast:**
- All text ≥ 4.5:1 contrast ratio
- Status badges ≥ 3:1 for large text
- Don't rely on color alone to convey status (use icons + text)

**Keyboard Navigation:**
- All interactive elements focusable via Tab
- Focus indicators visible (highlight ring)
- Keyboard shortcuts available for common actions
- Focus trap in modals

**Screen Reader Support:**
- ARIA labels on all icons
- Semantic HTML: `<button>`, `<table>`, `<nav>`
- Live regions for activity feed updates
- Descriptions for complex visualizations

**Readability:**
- Font sizes ≥ 12px
- Line height ≥ 1.4
- Avoid blink/flash (≥ 3 Hz)

---

## 11. ERROR HANDLING & EDGE CASES

### 11.1 Error States

**Connection Errors:**
```
"WebSocket disconnected"
"Failed to load agent data"
"API timeout (30s)"
"Reconnecting... (attempt 3/5)"
```

**Task Errors:**
```
"Task failed: Insufficient permissions"
"Task cancelled by user"
"Task timeout exceeded"
"Error: Failed to read file - permission denied"
```

**UI Errors:**
```
"Unknown agent: <name>"
"Task not found"
"Invalid task state"
"Message could not be sent"
```

### 11.2 Edge Cases

**No Data:**
```
"No agents online" → Show gray agent grid with placeholder text
"No active tasks" → "All tasks completed! 🎉"
"No messages" → "Inbox is empty"
"Connection never established" → Show offline UI with retry button
```

**Stale Data:**
```
"This data is from 5 minutes ago" → Italic text + refresh button
Agent status hasn't updated in > 60 seconds → Fade out or mark as offline
```

**Overload/Performance:**
```
> 100 active tasks → Show warning: "Dashboard optimized for ≤ 100 tasks"
> 1000 events in feed → Auto-archive oldest events
Memory usage > 200MB → Alert and suggest reload
```

---

## 12. USER STORIES WITH ACCEPTANCE CRITERIA

### 12.1 User Story: Monitor Agent Execution

**As an** Operations Manager
**I want to** track Marcus working on revenue strategy in real-time
**So that** I can ensure tasks are progressing and identify blockers early

**Acceptance Criteria:**

1. **Given** the dashboard has loaded and connected to WebSocket
   **When** Marcus starts working on "Q1 Revenue Strategy"
   **Then** I see:
   - Marcus's card in left panel shows status "WORKING" with yellow indicator
   - Center swimlane shows task bar extending from start time
   - Progress bar displays current completion % (updating every 2s)
   - Activity feed logs "Task started" event with timestamp

2. **Given** Marcus is actively working on a task
   **When** progress updates occur
   **Then** I see:
   - Progress bar animates smoothly (no jumps)
   - Elapsed time counter increments in real-time
   - Live output stream shows last 10 progress messages
   - Token usage counter increments: "234K input / 45K output"

3. **Given** I want to see detailed task information
   **When** I click on Marcus's task bar in the swimlane
   **Then** right panel expands showing:
   - Task title, priority, status, progress %
   - Execution metadata (start time, creator, dependencies)
   - Resource usage: tokens, cost estimate, tools used
   - Live output with timestamps
   - Action buttons: Cancel, Pause, View Log

4. **Given** Marcus completes the task
   **When** task execution finishes
   **Then** I see:
   - Activity feed shows "✓ Task completed" event (green)
   - Center swimlane task bar turns green
   - Left panel removes task from "In Progress" section
   - Toast notification: "Marcus completed Q1 Revenue Strategy (19m 23s, $0.92 cost)"
   - Marcus's status changes to "IDLE" with green indicator

**Performance Requirements:**
- Update latency: < 100ms from event to UI render
- Progress bar updates: smooth 300ms transitions
- No visible lag when switching between tasks

---

### 12.2 User Story: Approve External Email

**As a** CEO
**I want to** review and approve outbound customer emails before sending
**So that** I maintain control over external communications

**Acceptance Criteria:**

1. **Given** DeVonte creates an external email draft
   **When** the draft is ready for approval
   **Then** I see:
   - Toast notification: "New draft pending approval from DeVonte Jackson"
   - Right panel "PENDING APPROVAL (1)" section highlighted
   - Draft card shows: sender, recipient, subject, body preview

2. **Given** a draft is pending in the right panel
   **When** I click on the draft card
   **Then** I see:
   - Full email content displayed inline
   - To: recipient email address
   - Subject: email subject line
   - Body: full message text (expandable if > 200 chars)
   - [✓ Approve] and [✗ Reject] buttons

3. **Given** I've reviewed the draft and it looks good
   **When** I click [✓ Approve]
   **Then** I see:
   - Toast: "Draft approved, sending..."
   - Email service sends via SMTP
   - Toast: "Email sent to customer@acme.com ✓" (green)
   - Draft removed from pending section
   - Activity feed logs "Draft approved and sent" event

4. **Given** the draft needs revisions
   **When** I click [✗ Reject]
   **Then** I see:
   - Modal opens: "Reason for rejection (optional)"
   - I enter feedback: "Please add pricing details"
   - Toast: "Draft rejected with feedback"
   - Draft removed from my pending list
   - DeVonte receives rejection notification with feedback
   - Activity feed logs "Draft rejected" event

**Performance Requirements:**
- Drafts appear within 1 second of creation
- Approve/Reject actions complete within 2 seconds
- Confirmation toasts appear immediately

---

### 12.3 User Story: Assign Task to Agent

**As a** Marcus (CEO)
**I want to** delegate market research task to Graham
**So that** I can distribute work efficiently and leverage team expertise

**Acceptance Criteria:**

1. **Given** I want to assign work to Graham
   **When** I click on "Graham Sutton" in the left agent grid
   **Then** right panel expands showing:
   - Agent name: "Graham Sutton"
   - Role: "Data Engineer"
   - Status: "IDLE" with green indicator
   - Recent tasks (last 5 completed)
   - Capabilities list
   - [Assign Task] button

2. **Given** Graham's detail view is open
   **When** I click [Assign Task]
   **Then** I see:
   - Modal opens with task assignment form
   - Fields: Title (required), Description (required), Priority (dropdown)
   - Priority options: Low, Normal, High, Urgent
   - [Cancel] and [Assign Task] buttons

3. **Given** the task form is open
   **When** I fill in:
   - Title: "Analyze Q1 Market Trends"
   - Priority: "HIGH"
   - Description: "Review competitor data and identify opportunities..."
   **And** I click [Assign Task]
   **Then** I see:
   - Toast: "Task assigned to Graham Sutton"
   - Modal closes
   - Left panel updates: new task appears in "Pending" section
   - Graham's status changes to "WORKING"
   - Center swimlane adds new task bar for Graham
   - Activity feed logs "Task assigned" event

4. **Given** Graham's task is now in progress
   **When** I view the dashboard
   **Then** I see:
   - Task progress bar updates: 0% → 25% → 50% → 75% → 100%
   - Activity feed logs events from Graham's execution
   - Token usage and cost tracked in real-time
   - Toast notification when Graham completes the task

**Performance Requirements:**
- Task creation completes within 1 second
- UI updates reflect immediately after assignment
- No lag in progress bar updates

---

## 13. ACTIVITY EVENT TAXONOMY

### 13.1 Event Categories

All events stored in `ActivityEvent` model with:
- `id`: Unique event identifier
- `agentId`: Agent who triggered the event
- `taskId`: Related task (if applicable)
- `eventType`: Category of event
- `eventData`: JSON payload with event-specific data
- `timestamp`: ISO 8601 timestamp

### 13.2 Event Types

#### Task Lifecycle Events

**task_started**
```json
{
  "taskId": "uuid",
  "taskTitle": "Build Kanban UI",
  "priority": "high",
  "estimatedDuration": 1200
}
```

**task_progress**
```json
{
  "taskId": "uuid",
  "progressPercent": 67,
  "progressDetails": {
    "currentStep": "Running tests",
    "tokensUsed": 234000,
    "toolsCalled": ["Read", "Edit", "Bash"]
  }
}
```

**task_completed**
```json
{
  "taskId": "uuid",
  "result": "Success",
  "elapsedSeconds": 1163,
  "tokensUsed": { "input": 234000, "output": 45000 },
  "costUsd": 0.92
}
```

**task_failed**
```json
{
  "taskId": "uuid",
  "error": "Permission denied",
  "errorDetails": "Failed to read file: /protected/config.json",
  "elapsedSeconds": 45,
  "tokensUsed": { "input": 12000, "output": 2000 }
}
```

**task_blocked**
```json
{
  "taskId": "uuid",
  "blockingTaskId": "uuid-2",
  "reason": "Waiting on: Build Kanban UI"
}
```

**task_cancelled**
```json
{
  "taskId": "uuid",
  "cancelledBy": "user",
  "reason": "Requirements changed",
  "elapsedSeconds": 300
}
```

#### Agent Status Events

**agent_status_changed**
```json
{
  "agentId": "uuid",
  "previousStatus": "idle",
  "newStatus": "working",
  "currentTaskId": "uuid"
}
```

**agent_idle**
```json
{
  "agentId": "uuid",
  "lastTaskId": "uuid",
  "idleTimestamp": "2026-01-26T14:30:00Z"
}
```

**agent_offline**
```json
{
  "agentId": "uuid",
  "reason": "Connection lost",
  "lastSeen": "2026-01-26T14:25:00Z"
}
```

#### Message Events

**message_sent**
```json
{
  "messageId": "uuid",
  "fromAgentId": "uuid",
  "toAgentId": "uuid",
  "subject": "Code review feedback",
  "type": "direct"
}
```

**message_broadcast**
```json
{
  "messageId": "uuid",
  "fromAgentId": "uuid",
  "recipientCount": 9,
  "subject": "System maintenance scheduled"
}
```

**draft_created**
```json
{
  "draftId": "uuid",
  "fromAgentId": "uuid",
  "externalRecipient": "customer@acme.com",
  "subject": "Project Update"
}
```

**draft_approved**
```json
{
  "draftId": "uuid",
  "approvedBy": "uuid",
  "sentAt": "2026-01-26T14:35:00Z"
}
```

**draft_rejected**
```json
{
  "draftId": "uuid",
  "rejectedBy": "uuid",
  "feedback": "Please add pricing details"
}
```

#### Tool Usage Events

**tool_called**
```json
{
  "toolName": "Read",
  "taskId": "uuid",
  "parameters": {
    "file_path": "/path/to/file.ts"
  },
  "success": true,
  "durationMs": 45
}
```

**tool_error**
```json
{
  "toolName": "Edit",
  "taskId": "uuid",
  "error": "File not found",
  "parameters": {
    "file_path": "/nonexistent.ts"
  }
}
```

#### Cost & Resource Events

**session_started**
```json
{
  "sessionId": "uuid",
  "agentId": "uuid",
  "taskId": "uuid",
  "startedAt": "2026-01-26T14:30:00Z"
}
```

**session_ended**
```json
{
  "sessionId": "uuid",
  "totalTokens": { "input": 234000, "output": 45000 },
  "totalCostUsd": 0.92,
  "durationSeconds": 1163
}
```

**budget_warning**
```json
{
  "currentSpend": 12.50,
  "budget": 15.00,
  "percentUsed": 83,
  "estimatedDaysRemaining": 2.7
}
```

#### System Events

**websocket_connected**
```json
{
  "connectionId": "uuid",
  "clientIp": "192.168.1.100",
  "timestamp": "2026-01-26T14:30:00Z"
}
```

**websocket_disconnected**
```json
{
  "connectionId": "uuid",
  "reason": "Client timeout",
  "durationSeconds": 3600
}
```

**error_occurred**
```json
{
  "errorType": "DatabaseConnectionError",
  "message": "Connection pool exhausted",
  "severity": "high",
  "affectedAgents": ["uuid-1", "uuid-2"]
}
```

---

## 14. FILTER & SEARCH INTERACTION SPECS

### 14.1 Global Search

**Location:** Header bar (top-right)
**Trigger:** Ctrl+F or click search icon
**Interface:** Modal overlay with search input

**Search Functionality:**
- Full-text search across:
  - Task titles and descriptions
  - Agent names and roles
  - Message subjects and bodies
  - Activity event data
- Real-time search results (debounced 300ms)
- Results grouped by type: Tasks | Agents | Messages | Events
- Keyboard navigation: Arrow keys to select, Enter to open

**Search Results Display:**
```
Search: "kanban"
─────────────────────────────────────
TASKS (2)
  ▶ Build Kanban UI - DeVonte • HIGH • 87%
  ⏱ Design Kanban Board - Sable • NORMAL

MESSAGES (1)
  ✉ "Kanban specs ready" - Sable → Marcus

EVENTS (4)
  [14:47] task_started: Build Kanban UI
  [14:30] message_sent: Kanban specs ready
  [14:15] draft_created: Kanban demo for client
  [13:45] task_completed: Kanban wireframes
```

**Interactions:**
- Click result → Navigate to that item (close modal)
- Escape → Close search modal
- Ctrl+F → Focus search input

---

### 14.2 Activity Feed Filters

**Location:** Center canvas (above activity timeline)
**Interface:** Filter bar with dropdowns and toggles

**Filter Options:**

1. **Event Type** (Multi-select dropdown)
   - All Events (default)
   - Task Events: started, progress, completed, failed, blocked
   - Message Events: sent, broadcast, draft actions
   - Agent Events: status changes, idle, offline
   - Tool Events: tool calls, errors
   - System Events: connections, errors, warnings

2. **Agent** (Multi-select dropdown)
   - All Agents (default)
   - Individual agents: Marcus, Sable, DeVonte, Yuki, etc.

3. **Time Range** (Dropdown)
   - Last 5 minutes (default)
   - Last 15 minutes
   - Last hour
   - Last 4 hours
   - Last 24 hours
   - Custom range (date picker)

4. **Severity** (Toggle buttons)
   - All (default)
   - Info (blue)
   - Success (green)
   - Warning (yellow)
   - Error (red)

5. **Task Filter** (Dropdown)
   - All Tasks
   - Active Tasks Only
   - Completed Tasks Only
   - Failed Tasks Only
   - Specific task (searchable dropdown)

**Filter UI:**
```
┌─────────────────────────────────────────────────────────┐
│ [Event Type ▼] [Agent ▼] [Time Range ▼] [Severity ▼]  │
│ [All] [Info] [Success] [Warning] [Error]               │
│ [Clear Filters]                                         │
└─────────────────────────────────────────────────────────┘
```

**Filter Behavior:**
- Filters are cumulative (AND logic)
- Filter changes update feed in real-time
- Selected filters persist until cleared
- Visual indicator: selected filters shown as chips
- [Clear Filters] resets all to defaults

**Filter Chips:**
```
Active Filters: [Event: Task ✕] [Agent: DeVonte ✕] [Severity: Error ✕]
```

---

### 14.3 Agent List Filters

**Location:** Left panel (above agent grid)
**Interface:** Compact filter controls

**Filter Options:**

1. **Status** (Toggle buttons)
   - All (default)
   - Working
   - Idle
   - Blocked
   - Offline

2. **Role** (Dropdown)
   - All Roles (default)
   - Engineering
   - Product
   - Operations
   - Leadership

3. **Sort By** (Dropdown)
   - Status (default)
   - Name (A-Z)
   - Current Task Progress
   - Tokens Used (descending)
   - Last Active

**Filter UI:**
```
┌──────────────────────────────────┐
│ AGENTS                           │
│ [All] [Working] [Idle] [Blocked] │
│ Sort: [Status ▼]                 │
└──────────────────────────────────┘
```

---

### 14.4 Task Pipeline Filters

**Location:** Left panel (above task pipeline)
**Interface:** Compact filter controls

**Filter Options:**

1. **Priority** (Toggle buttons)
   - All (default)
   - Urgent
   - High
   - Normal
   - Low

2. **Sort By** (Dropdown)
   - Priority (default)
   - Progress %
   - Elapsed Time
   - Agent Name
   - Created Date

**Filter UI:**
```
┌──────────────────────────────────┐
│ ACTIVE TASKS                     │
│ [All] [Urgent] [High] [Normal]   │
│ Sort: [Priority ▼]               │
└──────────────────────────────────┘
```

---

## 15. TIMELINE VISUALIZATION DESIGN

### 15.1 Swimlane Timeline (Default View)

**Visual Specifications:**

**Layout:**
- Horizontal time axis (X-axis): represents time elapsed
- Vertical agent rows (Y-axis): one row per agent
- Task bars: colored rectangles representing task execution

**Time Axis:**
```
─────────────────────────────────────────────────────────
Now   -10m    -9m    -8m    -7m    -6m    -5m    -4m    -3m    -2m    -1m    0m
│      │      │      │      │      │      │      │      │      │      │      │
```

- Scale: 1 minute per major tick
- Range: Configurable (default: last 10 minutes)
- Current time marker: Vertical line with label "NOW"
- Pan: Scroll left/right to view past/future
- Zoom: Ctrl+Scroll to change time scale

**Task Bars:**

Dimensions:
- Width: Proportional to elapsed time
- Height: 80% of row height (with 10% margin top/bottom)
- Border: 1px solid (matches status color)
- Border radius: 4px

Colors:
- In Progress: Yellow (#EAB308) with gradient
- Completed: Green (#22C55E)
- Failed: Red (#EF4444)
- Blocked: Red (#EF4444) with diagonal stripes
- Pending: Gray (#6B7280) with dashed border

Progress Indicator:
- Task bars partially filled based on progress %
- Darker shade = completed portion
- Lighter shade = remaining portion
- Example: 67% complete = 67% dark yellow, 33% light yellow

**Task Bar Content:**
```
┌─────────────────────────────────┐
│ Build Kanban UI (DeVonte)       │ ← Task title + agent
│ 67% • 19m 23s • $0.73           │ ← Progress, time, cost
└─────────────────────────────────┘
```

**Row Layout:**
```
Marcus Bell        │──[Q1 Strategy]───────────────────67%──│
Sable Chen         │──[Code Review]─✓─│ [idle]
DeVonte Jackson    │────────[Build Kanban UI]──────────43%─│
Yuki Tanaka        │──[Infra Review]──67%──│
Graham Sutton      │───[Market Analysis]───────────────25%─│
Miranda Lee        [blocked by Build Kanban UI]
Helen Park         [idle, ready]
Walter Brown       [idle]
Frankie Miller     [idle]
Kenji Yamamoto     [idle]
```

**Hover Interactions:**
- Hover on task bar → Show tooltip with full details
- Hover on agent row → Highlight all tasks for that agent
- Hover on time axis → Show timestamp

**Click Interactions:**
- Click task bar → Select task, show details in right panel
- Click agent name → Show agent details in right panel
- Drag timeline → Pan left/right

---

### 15.2 Dependency Graph View

**Visual Specifications:**

**Layout:**
- Directed acyclic graph (DAG) layout
- Nodes: Tasks
- Edges: Dependencies (task A blocks task B)
- Auto-layout algorithm: Hierarchical top-to-bottom

**Node Design:**
```
┌────────────────────────┐
│ Build Kanban UI        │ ← Task title
│ DeVonte • HIGH         │ ← Agent + priority
│ ████████░░ 87%         │ ← Progress bar
└────────────────────────┘
```

Node dimensions:
- Width: 200px
- Height: 80px
- Border: 2px solid (status color)
- Background: Corp dark (#0F1620)
- Border radius: 8px

Node colors (border):
- In Progress: Yellow
- Completed: Green
- Pending: Gray
- Blocked: Red
- Failed: Red

**Edge Design:**
- Style: Solid line with arrow
- Color: Gray (#6B7280)
- Width: 2px
- Arrow: Triangle pointer at target node

**Graph Layout:**
```
                 [Q1 Revenue Strategy]
                   Marcus • HIGH • 67%
                  /         |         \
                 /          |          \
        [Market Analysis]  [Cost Analysis]  [Sales Forecast]
        Graham • 25%       Walter • 45%     Frankie • pending
             |
        [Customer Outreach]
        Frankie • blocked
```

**Interactions:**
- Click node → Show task details in right panel
- Hover node → Highlight dependencies (upstream + downstream)
- Drag node → Reposition (manual layout adjustment)
- Zoom: Ctrl+Scroll
- Pan: Click+Drag on background

---

### 15.3 Activity Timeline View

**Visual Specifications:**

**Layout:**
- Vertical chronological feed
- Newest events at top
- Auto-scroll on new events
- Infinite scroll (load more on scroll bottom)

**Event Item Design:**
```
┌──────────────────────────────────────────────────────┐
│ 14:47  ✓  Task completed: "Build Kanban UI"          │ ← Time + icon + title
│            DeVonte Jackson • Elapsed: 23m 45s         │ ← Agent + metadata
│            Tokens: 234K input / 45K output • $0.92    │ ← Resource usage
│            [View Details]                             │ ← Action button
└──────────────────────────────────────────────────────┘
```

**Event Item Components:**

Left margin (10px width):
- Color stripe indicates severity
  - Green: Success/Completion
  - Yellow: Progress/Working
  - Blue: Info/Message
  - Red: Error/Blocked

Icon (24x24):
- Unicode symbols (see Section 4.4)
- Color matches event severity

Timestamp:
- Format: "HH:MM" (24-hour)
- Relative time on hover: "5 minutes ago"

Event title:
- Bold font, 14px
- Truncated at 60 characters with "..."
- Full text on hover tooltip

Event details:
- Secondary text, 12px
- Agent name, metadata
- Expandable "Show more" for full output

Action button:
- [View Details] → Opens task/agent in right panel
- [Expand] → Shows full event data inline

**Grouping:**

Events can be grouped by time:
```
TODAY
─────────────────────────────────────────────────────
14:47  ✓ Task completed: "Build Kanban UI"
14:45  ▶ Task progress: 87%
14:43  ✉ Message sent: "Feedback ready"

YESTERDAY
─────────────────────────────────────────────────────
23:15  ✓ Task completed: "Code Review"
22:30  ▶ Task started: "Market Analysis"
```

**Interactions:**
- Click event → Open related task/agent in right panel
- Click [Expand] → Show full event JSON
- Scroll down → Load more events (infinite scroll)
- Filters → Apply filters from section 14.2

---

## 16. TECHNICAL IMPLEMENTATION NOTES

### 16.1 Component Structure

```
<DashboardContainer>
  ├─ <Header /> (status, controls, search)
  ├─ <LeftPanel>
  │  ├─ <AgentGrid />
  │  ├─ <TaskPipeline />
  │  └─ <SystemMetrics />
  ├─ <CenterCanvas>
  │  ├─ <SwimlanesView /> (default)
  │  ├─ <DependencyGraph />
  │  └─ <ActivityTimeline />
  └─ <RightPanel>
     ├─ <TaskDetailView /> (conditional)
     ├─ <AgentDetailView /> (conditional)
     └─ <MessageCenter />
```

### 16.2 State Management

**Zustand Store Structure:**
```typescript
{
  // Connection
  isConnected: boolean

  // Agents
  agents: Agent[]
  selectedAgentId: string | null

  // Tasks
  tasks: Task[]
  selectedTaskId: string | null

  // Messages
  messages: Message[]
  pendingDrafts: Message[]

  // Activity
  activities: ActivityEvent[]  // Last 100

  // UI State
  centerViewType: 'swimlanes' | 'dependency' | 'timeline'
  panelVisibility: { left: bool, right: bool, center: bool }
  filters: { agentId?, status?, priority? }

  // Display
  camera: { x, y, zoom }  // For timeline/graph panning
  expandedSections: Record<string, bool>
}
```

### 16.3 WebSocket Event Handling

All real-time events:
1. Received via `socket.on(WS_EVENTS.*)`
2. Processed by event handler functions
3. Update Zustand store
4. Components automatically re-render via hooks
5. CSS transitions provide smooth animations

### 16.4 Data Updates Pattern

```javascript
// Example: Agent status change
EventBus.on('agent:status', (data) => {
  io.emit(WS_EVENTS.AGENT_STATUS, data)
})

// Client receives:
socket.on(WS_EVENTS.AGENT_STATUS, (data) => {
  // Update Zustand store
  useGameStore.setState(state => ({
    agents: state.agents.map(a =>
      a.id === data.agentId ? { ...a, status: data.status } : a
    )
  }))
  // Component re-renders automatically
})
```

---

## 17. SUCCESS METRICS & KPIS

### 17.1 Performance Metrics

**Dashboard Performance:**
- Initial load time: < 2 seconds
- Time to first interaction: < 3 seconds
- Frame rate: ≥ 60 FPS during normal operation
- Update latency (event → UI render): < 100ms
- Memory usage: < 150MB
- WebSocket connection success rate: ≥ 99.5%

### 17.2 Usage Metrics

**User Engagement:**
- Percentage of tasks monitored via dashboard: ≥ 85%
- Average session duration: ≥ 30 minutes
- Daily active users: Tracked over time
- Feature usage: Which panels/views most used

### 17.3 Business Metrics

**Operational Impact:**
- Time to identify blocked tasks: < 2 minutes
- Time from problem detection to resolution: < 10 minutes
- Approval turnaround for external emails: < 5 minutes
- Cost visibility accuracy: ≥ 99%

---

## 18. FUTURE ENHANCEMENTS (Phase 2+)

1. **Advanced Visualizations:**
   - D3.js-based network graph showing agent collaboration
   - Sankey diagram for token flow and cost allocation
   - Heatmap of task duration by agent/type

2. **Predictive Analytics:**
   - ETA recalculation using historical agent performance
   - Proactive alerts: "Task likely to exceed budget by 23%"
   - Recommendation engine: "Move task to Sable (30% faster)"

3. **Collaboration Features:**
   - Multi-user dashboard with synchronized cursors
   - Comments/annotations on tasks and agents
   - Shared saved views and filters

4. **Advanced Control:**
   - Pause/resume tasks mid-execution
   - Redirect active task to different agent
   - Manual progress correction for simulation testing

5. **Mobile Companion:**
   - Simplified mobile app for on-the-go monitoring
   - Push notifications for critical alerts
   - Quick action buttons (approve, reject)

6. **Integrations:**
   - Export dashboards to Slack notifications
   - Log all activity to external audit system
   - Connect to Grafana/Prometheus for infra metrics

7. **Customization:**
   - Save custom dashboard layouts (profiles)
   - Theme editor (custom colors, fonts)
   - Widget library (drag-and-drop panels)

---

## APPENDIX A: DATA MODEL REFERENCE

### A.1 Agent Model

```typescript
type Agent = {
  id: string
  name: string                      // "Marcus Bell"
  role: string                      // "CEO/Supervisor"
  status: AgentStatus              // "idle" | "working" | "blocked" | "offline"
  currentTaskId: string | null
  capabilities: string[]
  toolPermissions: Record<string, boolean>
  createdAt: Date
  updatedAt: Date
}
```

### A.2 Task Model

```typescript
type Task = {
  id: string
  agentId: string
  createdById: string
  title: string
  description: string
  status: TaskStatus              // "pending" | "in_progress" | "completed" | "failed" | "blocked" | "cancelled"
  priority: TaskPriority           // "low" | "normal" | "high" | "urgent"
  progressPercent: number          // 0-100
  progressDetails: Record<string, unknown>
  result: unknown
  errorDetails: unknown
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
}
```

### A.3 Message Model

```typescript
type Message = {
  id: string
  fromAgentId: string
  toAgentId: string
  subject: string
  body: string
  type: MessageType               // "direct" | "broadcast" | "system" | "external_draft"
  status: MessageStatus           // "pending" | "delivered" | "read" | "approved" | "rejected"
  isExternalDraft: boolean
  externalRecipient: string | null
  createdAt: Date
  readAt: Date | null
}
```

### A.4 Activity Event Model

```typescript
type ActivityEvent = {
  id: string
  agentId: string
  taskId: string | null
  eventType: string               // "task_started", "task_completed", "message_sent", etc.
  eventData: Record<string, unknown>
  timestamp: Date
}
```

---

## Document Summary

This UX specification provides comprehensive design guidelines for the Generic Corp Full-Screen Real-Time Dashboard, covering:

✅ **Layout & Composition** - 3-panel design with tactical control, visual canvas, and detail views
✅ **Data Sources** - Complete integration with existing agent, task, message, and activity systems
✅ **Visual Design** - Corporate dark theme with color palette, typography, and component styling
✅ **Interactions** - Detailed specifications for navigation, real-time updates, and user actions
✅ **User Stories** - 3 complete flows with acceptance criteria for QA testing
✅ **Event Taxonomy** - Comprehensive event types and data structures for activity logging
✅ **Filters & Search** - Multi-axis filtering and global search functionality
✅ **Timeline Visualizations** - 3 switchable views (swimlanes, dependency graph, activity feed)
✅ **Performance** - Optimization strategies for real-time updates and rendering
✅ **Accessibility** - WCAG 2.1 Level AA compliance
✅ **Technical Implementation** - Component structure, state management, and WebSocket patterns

This specification is ready for engineering implementation and QA test plan development.

---

**End of Document**
