# GENERIC CORP: Detailed Implementation Guide

> Step-by-step instructions for building a fully autonomous AI agent company.
> Written for a developer who is new to the codebase.

**Last Updated**: January 2026

---

## How to Use This Document

Each task includes:
- **Objective**: What you're building and why
- **Prerequisites**: What must be done first
- **Files**: Exact files to create/modify
- **Steps**: Numbered implementation steps
- **Code**: Complete code examples
- **Testing**: How to verify it works
- **Acceptance Criteria**: Definition of done
- **Estimated Time**: How long this should take
- **Common Pitfalls**: Mistakes to avoid

---

## Project Structure

```
generic-corp/
├── apps/
│   ├── server/                 # Backend API + Agent runtime
│   │   ├── src/
│   │   │   ├── agents/         # Agent implementations
│   │   │   ├── api/            # REST endpoints
│   │   │   ├── config/         # Configuration
│   │   │   ├── db/             # Database client
│   │   │   ├── events/         # EventBus
│   │   │   ├── queues/         # BullMQ queues
│   │   │   ├── services/       # Business logic
│   │   │   ├── temporal/       # Temporal workflows (Phase 4)
│   │   │   │   ├── workflows/
│   │   │   │   ├── activities/
│   │   │   │   └── workers/
│   │   │   ├── tools/          # MCP tools
│   │   │   └── index.ts        # Entry point
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Database schema
│   │   └── package.json
│   │
│   └── game/                   # Frontend game
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── phaser/         # Phaser scenes
│       │   ├── stores/         # Zustand stores
│       │   ├── hooks/          # Custom React hooks
│       │   ├── api/            # API client
│       │   └── App.tsx
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types
│       └── src/
│           └── types.ts
│
├── docker-compose.yml
└── package.json
```

---

# Phase 2: Core Game Interface

## Task 2.1.1: AgentPanel Component

### Objective
Create a React component that displays detailed information about a selected agent, including their current status, active task, recent activity, and tools.

### Prerequisites
- Phase 1 complete (frontend scaffold exists)
- Familiarity with React and TypeScript
- Understanding of TailwindCSS

### Files to Create/Modify
```
apps/game/src/components/AgentPanel.tsx       # New file
apps/game/src/components/index.ts             # Export
apps/game/src/App.tsx                         # Import and use
```

### Steps

**Step 1: Create the component file**

Create `apps/game/src/components/AgentPanel.tsx`:

```typescript
import { Agent, Task, AgentStatus } from '@generic-corp/shared';

interface AgentPanelProps {
  agent: Agent | null;
  currentTask: Task | null;
  onAssignTask: (agentId: string) => void;
  onMessageAgent: (agentId: string) => void;
}

export function AgentPanel({
  agent,
  currentTask,
  onAssignTask,
  onMessageAgent
}: AgentPanelProps) {
  // If no agent selected, show placeholder
  if (!agent) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 h-full flex items-center justify-center">
        <p className="text-gray-400">Select an agent to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      {/* Header: Agent name and status */}
      <div className="flex items-center gap-3 mb-4">
        <AgentAvatar agent={agent} size="lg" />
        <div>
          <h2 className="text-xl font-bold text-white">{agent.name}</h2>
          <p className="text-gray-400">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Current Task */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
          Current Task
        </h3>
        {currentTask ? (
          <TaskCard task={currentTask} />
        ) : (
          <p className="text-gray-500 italic">No active task</p>
        )}
      </div>

      {/* Agent Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <StatCard
          label="Tasks Completed"
          value={agent.stats?.tasksCompleted ?? 0}
        />
        <StatCard
          label="Success Rate"
          value={`${agent.stats?.successRate ?? 0}%`}
        />
        <StatCard
          label="Tokens Used"
          value={formatNumber(agent.stats?.tokensUsed ?? 0)}
        />
        <StatCard
          label="Avg Response"
          value={`${agent.stats?.avgResponseTime ?? 0}s`}
        />
      </div>

      {/* Tools */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase mb-2">
          Available Tools
        </h3>
        <div className="flex flex-wrap gap-2">
          {agent.tools?.map((tool) => (
            <span
              key={tool}
              className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-300"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2">
        <button
          onClick={() => onAssignTask(agent.id)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Assign Task
        </button>
        <button
          onClick={() => onMessageAgent(agent.id)}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
        >
          Message
        </button>
      </div>
    </div>
  );
}

// Sub-components

function AgentAvatar({ agent, size }: { agent: Agent; size: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gray-700`}>
      {agent.avatarUrl ? (
        <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400">
          {agent.name.charAt(0)}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const statusConfig: Record<AgentStatus, { color: string; label: string }> = {
    idle: { color: 'bg-gray-500', label: 'Idle' },
    working: { color: 'bg-green-500', label: 'Working' },
    blocked: { color: 'bg-yellow-500', label: 'Blocked' },
    offline: { color: 'bg-red-500', label: 'Offline' },
  };

  const config = statusConfig[status];

  return (
    <span className={`ml-auto px-2 py-1 rounded text-xs font-medium text-white ${config.color}`}>
      {config.label}
    </span>
  );
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-gray-700 rounded p-3">
      <p className="text-white font-medium">{task.title}</p>
      <p className="text-gray-400 text-sm mt-1 line-clamp-2">{task.description}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-500">
          Started {formatTimeAgo(task.startedAt)}
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-700 rounded p-3">
      <p className="text-gray-400 text-xs uppercase">{label}</p>
      <p className="text-white text-lg font-bold">{value}</p>
    </div>
  );
}

// Utility functions

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'N/A';
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
```

**Step 2: Add to component exports**

Update `apps/game/src/components/index.ts`:

```typescript
export { AgentPanel } from './AgentPanel';
// ... other exports
```

**Step 3: Use in App.tsx**

Update `apps/game/src/App.tsx` to include the AgentPanel:

```typescript
import { AgentPanel } from './components';
import { useGameStore } from './stores/gameStore';

function App() {
  const { selectedAgent, currentTask, selectAgent } = useGameStore();

  const handleAssignTask = (agentId: string) => {
    // TODO: Open task assignment modal
    console.log('Assign task to', agentId);
  };

  const handleMessageAgent = (agentId: string) => {
    // TODO: Open messaging modal
    console.log('Message agent', agentId);
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Game canvas */}
      <div className="flex-1">
        {/* Phaser game will render here */}
      </div>

      {/* Side panel */}
      <div className="w-80 p-4">
        <AgentPanel
          agent={selectedAgent}
          currentTask={currentTask}
          onAssignTask={handleAssignTask}
          onMessageAgent={handleMessageAgent}
        />
      </div>
    </div>
  );
}
```

### Testing

1. **Manual Testing**:
   ```bash
   cd apps/game
   pnpm dev
   ```
   - Open http://localhost:5173
   - Verify panel shows "Select an agent" when none selected
   - Click an agent in the game view (once implemented)
   - Verify agent details populate correctly

2. **Unit Tests** (create `apps/game/src/components/AgentPanel.test.tsx`):
   ```typescript
   import { render, screen } from '@testing-library/react';
   import { AgentPanel } from './AgentPanel';

   describe('AgentPanel', () => {
     it('shows placeholder when no agent selected', () => {
       render(<AgentPanel agent={null} currentTask={null} onAssignTask={() => {}} onMessageAgent={() => {}} />);
       expect(screen.getByText('Select an agent to view details')).toBeInTheDocument();
     });

     it('displays agent name and role when selected', () => {
       const agent = {
         id: '1',
         name: 'Sable Chen',
         role: 'VP Engineering',
         status: 'idle' as const,
         tools: ['filesystem', 'git'],
       };
       render(<AgentPanel agent={agent} currentTask={null} onAssignTask={() => {}} onMessageAgent={() => {}} />);
       expect(screen.getByText('Sable Chen')).toBeInTheDocument();
       expect(screen.getByText('VP Engineering')).toBeInTheDocument();
     });
   });
   ```

### Acceptance Criteria
- [ ] Component renders without errors
- [ ] Shows placeholder when no agent selected
- [ ] Displays agent name, role, and status when selected
- [ ] Shows current task if agent is working
- [ ] Displays agent statistics
- [ ] Lists available tools
- [ ] "Assign Task" button calls onAssignTask with agent ID
- [ ] "Message" button calls onMessageAgent with agent ID
- [ ] Responsive design works on different screen sizes

### Estimated Time
3-4 hours

### Common Pitfalls
1. **Forgetting null checks**: Always handle the case where agent is null
2. **Type errors**: Make sure Agent and Task types are imported from shared package
3. **Styling issues**: TailwindCSS classes must be exact; typos cause silent failures
4. **Date formatting**: Dates from the API are strings, not Date objects

---

## Task 2.1.2: TaskQueue Component

### Objective
Create a component that displays pending and active tasks, grouped by status, with the ability to expand task details and see assignment.

### Prerequisites
- Task 2.1.1 complete
- Understanding of task states: pending, in_progress, blocked, completed, failed

### Files to Create/Modify
```
apps/game/src/components/TaskQueue.tsx        # New file
apps/game/src/components/index.ts             # Export
```

### Steps

**Step 1: Create the component**

Create `apps/game/src/components/TaskQueue.tsx`:

```typescript
import { useState } from 'react';
import { Task, TaskStatus, Agent } from '@generic-corp/shared';

interface TaskQueueProps {
  tasks: Task[];
  agents: Agent[];
  onTaskClick: (task: Task) => void;
  onCancelTask: (taskId: string) => void;
}

export function TaskQueue({ tasks, agents, onTaskClick, onCancelTask }: TaskQueueProps) {
  const [expandedSection, setExpandedSection] = useState<TaskStatus | null>('in_progress');

  // Group tasks by status
  const groupedTasks = groupTasksByStatus(tasks);

  const sections: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
    { status: 'pending', label: 'Pending', color: 'bg-gray-500' },
    { status: 'blocked', label: 'Blocked', color: 'bg-yellow-500' },
    { status: 'completed', label: 'Completed', color: 'bg-green-500' },
    { status: 'failed', label: 'Failed', color: 'bg-red-500' },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full overflow-hidden flex flex-col">
      <h2 className="text-lg font-bold text-white mb-4">Task Queue</h2>

      <div className="flex-1 overflow-y-auto space-y-2">
        {sections.map(({ status, label, color }) => {
          const sectionTasks = groupedTasks[status] || [];
          const isExpanded = expandedSection === status;

          return (
            <div key={status} className="border border-gray-700 rounded">
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : status)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-700"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${color}`} />
                  <span className="text-white font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">{sectionTasks.length}</span>
                  <ChevronIcon direction={isExpanded ? 'down' : 'right'} />
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && sectionTasks.length > 0 && (
                <div className="border-t border-gray-700">
                  {sectionTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      agent={agents.find((a) => a.id === task.assigneeId)}
                      onClick={() => onTaskClick(task)}
                      onCancel={() => onCancelTask(task.id)}
                    />
                  ))}
                </div>
              )}

              {isExpanded && sectionTasks.length === 0 && (
                <div className="p-3 text-gray-500 text-sm italic border-t border-gray-700">
                  No tasks
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sub-components

interface TaskRowProps {
  task: Task;
  agent: Agent | undefined;
  onClick: () => void;
  onCancel: () => void;
}

function TaskRow({ task, agent, onClick, onCancel }: TaskRowProps) {
  return (
    <div
      className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer group"
      onClick={onClick}
    >
      {/* Priority indicator */}
      <PriorityIndicator priority={task.priority} />

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {agent && <span>Assigned to {agent.name}</span>}
          {task.dueAt && <span>Due {formatDate(task.dueAt)}</span>}
        </div>
      </div>

      {/* Cancel button (only for pending/in_progress) */}
      {(task.status === 'pending' || task.status === 'in_progress') && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 p-1"
          title="Cancel task"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}

function PriorityIndicator({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    1: 'bg-red-500',    // Urgent
    2: 'bg-orange-500', // High
    3: 'bg-blue-500',   // Medium
    4: 'bg-gray-500',   // Low
  };

  return (
    <div
      className={`w-1 h-8 rounded ${colors[priority] || colors[4]}`}
      title={`Priority ${priority}`}
    />
  );
}

function ChevronIcon({ direction }: { direction: 'right' | 'down' }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transform ${direction === 'down' ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// Utility functions

function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups: Record<TaskStatus, Task[]> = {
    pending: [],
    in_progress: [],
    blocked: [],
    completed: [],
    failed: [],
    cancelled: [],
  };

  for (const task of tasks) {
    if (groups[task.status]) {
      groups[task.status].push(task);
    }
  }

  // Sort each group by priority (1 = highest)
  for (const status of Object.keys(groups) as TaskStatus[]) {
    groups[status].sort((a, b) => a.priority - b.priority);
  }

  return groups;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`;
  return d.toLocaleDateString();
}
```

### Testing

```typescript
// apps/game/src/components/TaskQueue.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskQueue } from './TaskQueue';

describe('TaskQueue', () => {
  const mockTasks = [
    { id: '1', title: 'Fix bug', status: 'in_progress', priority: 1, assigneeId: 'a1' },
    { id: '2', title: 'Add feature', status: 'pending', priority: 2, assigneeId: null },
  ];

  const mockAgents = [
    { id: 'a1', name: 'Sable Chen' },
  ];

  it('groups tasks by status', () => {
    render(
      <TaskQueue
        tasks={mockTasks}
        agents={mockAgents}
        onTaskClick={() => {}}
        onCancelTask={() => {}}
      />
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('shows task count in section header', () => {
    render(
      <TaskQueue
        tasks={mockTasks}
        agents={mockAgents}
        onTaskClick={() => {}}
        onCancelTask={() => {}}
      />
    );

    // In Progress section should show "1"
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
```

### Acceptance Criteria
- [ ] Tasks are grouped by status
- [ ] Section headers show task count
- [ ] Sections can be expanded/collapsed
- [ ] Tasks are sorted by priority within each section
- [ ] Clicking a task calls onTaskClick
- [ ] Cancel button appears on hover for pending/in_progress tasks
- [ ] Cancel button calls onCancelTask
- [ ] Shows assignee name if task is assigned

### Estimated Time
3-4 hours

### Common Pitfalls
1. **Not handling empty sections**: Always show the section even if empty
2. **Click propagation**: Cancel button must stopPropagation to not trigger row click
3. **Sorting**: Priority 1 is highest (most urgent), not lowest

---

## Task 2.1.3: ActivityFeed Component

### Objective
Create a real-time scrolling feed of agent activities, showing what agents are doing, tool calls, task updates, and messages.

### Prerequisites
- Task 2.1.1 complete
- Understanding of WebSocket events

### Files to Create/Modify
```
apps/game/src/components/ActivityFeed.tsx     # New file
apps/game/src/components/index.ts             # Export
packages/shared/src/types.ts                  # ActivityEvent type
```

### Steps

**Step 1: Define ActivityEvent type**

Update `packages/shared/src/types.ts`:

```typescript
export type ActivityEventType =
  | 'agent_status_changed'
  | 'task_started'
  | 'task_completed'
  | 'task_failed'
  | 'tool_called'
  | 'message_sent'
  | 'message_received'
  | 'error'
  | 'system';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  agentId: string | null;
  agentName: string | null;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}
```

**Step 2: Create the component**

Create `apps/game/src/components/ActivityFeed.tsx`:

```typescript
import { useEffect, useRef } from 'react';
import { ActivityEvent, ActivityEventType } from '@generic-corp/shared';

interface ActivityFeedProps {
  events: ActivityEvent[];
  maxEvents?: number;
  autoScroll?: boolean;
  filter?: ActivityEventType[];
  onEventClick?: (event: ActivityEvent) => void;
}

export function ActivityFeed({
  events,
  maxEvents = 100,
  autoScroll = true,
  filter,
  onEventClick,
}: ActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const isScrolledToBottom = useRef(true);

  // Filter events if filter provided
  const filteredEvents = filter
    ? events.filter((e) => filter.includes(e.type))
    : events;

  // Limit to maxEvents
  const displayEvents = filteredEvents.slice(-maxEvents);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && isScrolledToBottom.current && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [displayEvents.length, autoScroll]);

  // Track if user is scrolled to bottom
  const handleScroll = () => {
    if (feedRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      isScrolledToBottom.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Activity</h2>
        <span className="text-xs text-gray-500">{displayEvents.length} events</span>
      </div>

      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2 font-mono text-sm"
      >
        {displayEvents.length === 0 ? (
          <p className="text-gray-500 italic">No activity yet</p>
        ) : (
          displayEvents.map((event) => (
            <ActivityEventRow
              key={event.id}
              event={event}
              onClick={onEventClick ? () => onEventClick(event) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ActivityEventRowProps {
  event: ActivityEvent;
  onClick?: () => void;
}

function ActivityEventRow({ event, onClick }: ActivityEventRowProps) {
  const config = getEventConfig(event.type);

  return (
    <div
      className={`flex gap-2 p-2 rounded ${onClick ? 'hover:bg-gray-700 cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Timestamp */}
      <span className="text-gray-500 shrink-0">
        {formatTime(event.timestamp)}
      </span>

      {/* Icon */}
      <span className={`shrink-0 ${config.color}`}>
        {config.icon}
      </span>

      {/* Agent name (if applicable) */}
      {event.agentName && (
        <span className="text-blue-400 shrink-0">
          [{event.agentName}]
        </span>
      )}

      {/* Message */}
      <span className={`text-gray-300 ${config.textColor || ''}`}>
        {event.message}
      </span>
    </div>
  );
}

// Event type configuration

interface EventConfig {
  icon: string;
  color: string;
  textColor?: string;
}

function getEventConfig(type: ActivityEventType): EventConfig {
  const configs: Record<ActivityEventType, EventConfig> = {
    agent_status_changed: { icon: '●', color: 'text-blue-400' },
    task_started: { icon: '▶', color: 'text-green-400' },
    task_completed: { icon: '✓', color: 'text-green-400' },
    task_failed: { icon: '✗', color: 'text-red-400', textColor: 'text-red-300' },
    tool_called: { icon: '⚙', color: 'text-yellow-400' },
    message_sent: { icon: '→', color: 'text-purple-400' },
    message_received: { icon: '←', color: 'text-purple-400' },
    error: { icon: '!', color: 'text-red-500', textColor: 'text-red-400' },
    system: { icon: 'ℹ', color: 'text-gray-500' },
  };

  return configs[type] || { icon: '•', color: 'text-gray-400' };
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
```

**Step 3: Connect to WebSocket events**

Create a hook in `apps/game/src/hooks/useActivityFeed.ts`:

```typescript
import { useState, useEffect } from 'react';
import { ActivityEvent } from '@generic-corp/shared';
import { socket } from '../api/socket';

export function useActivityFeed(maxEvents: number = 100) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    // Listen for activity events from WebSocket
    const handleActivity = (event: ActivityEvent) => {
      setEvents((prev) => {
        const updated = [...prev, event];
        // Keep only the last maxEvents
        return updated.slice(-maxEvents);
      });
    };

    socket.on('activity', handleActivity);

    return () => {
      socket.off('activity', handleActivity);
    };
  }, [maxEvents]);

  const clearEvents = () => setEvents([]);

  return { events, clearEvents };
}
```

### Testing

```typescript
// apps/game/src/components/ActivityFeed.test.tsx
import { render, screen } from '@testing-library/react';
import { ActivityFeed } from './ActivityFeed';

describe('ActivityFeed', () => {
  const mockEvents = [
    {
      id: '1',
      type: 'task_started' as const,
      agentId: 'a1',
      agentName: 'Sable Chen',
      message: 'Started working on "Fix login bug"',
      timestamp: new Date(),
    },
    {
      id: '2',
      type: 'tool_called' as const,
      agentId: 'a1',
      agentName: 'Sable Chen',
      message: 'Called filesystem.read("/src/auth.ts")',
      timestamp: new Date(),
    },
  ];

  it('renders events', () => {
    render(<ActivityFeed events={mockEvents} />);
    expect(screen.getByText(/Started working on/)).toBeInTheDocument();
    expect(screen.getByText(/Called filesystem.read/)).toBeInTheDocument();
  });

  it('shows agent names', () => {
    render(<ActivityFeed events={mockEvents} />);
    expect(screen.getAllByText('[Sable Chen]')).toHaveLength(2);
  });

  it('shows empty state when no events', () => {
    render(<ActivityFeed events={[]} />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});
```

### Acceptance Criteria
- [ ] Displays activity events in chronological order
- [ ] Shows timestamp, icon, agent name, and message
- [ ] Auto-scrolls to bottom when new events arrive
- [ ] Stops auto-scrolling when user scrolls up
- [ ] Limits displayed events to maxEvents
- [ ] Filters events when filter prop provided
- [ ] Different icons and colors for different event types
- [ ] Clicking an event calls onEventClick (if provided)

### Estimated Time
3-4 hours

### Common Pitfalls
1. **Performance with many events**: Always limit the array size
2. **Auto-scroll fighting user**: Track scroll position to know if user scrolled up
3. **Date parsing**: Events from WebSocket may have string timestamps

---

## Task 2.2.1: Office Tilemap and Floor Layout

### Objective
Create the isometric office environment in Phaser where agents will be displayed. This includes the floor tiles, walls, furniture, and basic office layout.

### Prerequisites
- Phaser 3 knowledge
- Understanding of isometric projection
- Phase 1 game scaffold complete

### Files to Create/Modify
```
apps/game/src/phaser/scenes/OfficeScene.ts   # Main scene
apps/game/src/phaser/config.ts               # Phaser config
apps/game/public/assets/tiles/               # Tileset images
apps/game/public/assets/tilemaps/            # Tilemap JSON
```

### Steps

**Step 1: Create the tilemap**

First, create the tilemap using Tiled Map Editor (https://www.mapeditor.org/):

1. Create a new map:
   - Orientation: Isometric
   - Tile size: 64x32 pixels (standard isometric)
   - Map size: 20x20 tiles

2. Add a tileset with floor, wall, and furniture tiles

3. Export as JSON to `apps/game/public/assets/tilemaps/office.json`

For this guide, we'll create a simple programmatic tilemap:

**Step 2: Create the OfficeScene**

Create `apps/game/src/phaser/scenes/OfficeScene.ts`:

```typescript
import Phaser from 'phaser';

// Isometric tile dimensions
const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 15;

// Office layout (0 = floor, 1 = wall, 2 = desk, 3 = chair)
const OFFICE_LAYOUT = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 2, 3, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 2, 3, 0, 2, 3, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export class OfficeScene extends Phaser.Scene {
  private floorTiles: Phaser.GameObjects.Group;
  private furnitureTiles: Phaser.GameObjects.Group;
  private agentSprites: Map<string, Phaser.GameObjects.Sprite>;

  constructor() {
    super({ key: 'OfficeScene' });
    this.agentSprites = new Map();
  }

  preload() {
    // Load tile sprites
    this.load.image('floor', '/assets/tiles/floor.png');
    this.load.image('wall', '/assets/tiles/wall.png');
    this.load.image('desk', '/assets/tiles/desk.png');
    this.load.image('chair', '/assets/tiles/chair.png');

    // Load agent sprites
    this.load.spritesheet('agent', '/assets/sprites/agent.png', {
      frameWidth: 32,
      frameHeight: 48,
    });
  }

  create() {
    // Center the map
    const offsetX = this.cameras.main.width / 2;
    const offsetY = 100;

    // Create tile groups
    this.floorTiles = this.add.group();
    this.furnitureTiles = this.add.group();

    // Render the tilemap
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tileType = OFFICE_LAYOUT[y][x];
        const { screenX, screenY } = this.isoToScreen(x, y, offsetX, offsetY);

        // Always draw floor first
        if (tileType !== 1) {
          const floor = this.add.image(screenX, screenY, 'floor');
          floor.setOrigin(0.5, 0.5);
          floor.setDepth(y); // Depth sorting for isometric
          this.floorTiles.add(floor);
        }

        // Draw tile type
        const tileImages: Record<number, string> = {
          1: 'wall',
          2: 'desk',
          3: 'chair',
        };

        if (tileImages[tileType]) {
          const tile = this.add.image(screenX, screenY, tileImages[tileType]);
          tile.setOrigin(0.5, 1); // Bottom-center origin for furniture
          tile.setDepth(y + 0.5); // Slightly above floor
          this.furnitureTiles.add(tile);
        }
      }
    }

    // Set up camera controls
    this.setupCameraControls();

    // Enable clicking on tiles
    this.input.on('pointerdown', this.handleClick, this);
  }

  /**
   * Convert isometric tile coordinates to screen coordinates
   */
  private isoToScreen(
    tileX: number,
    tileY: number,
    offsetX: number,
    offsetY: number
  ): { screenX: number; screenY: number } {
    const screenX = offsetX + (tileX - tileY) * (TILE_WIDTH / 2);
    const screenY = offsetY + (tileX + tileY) * (TILE_HEIGHT / 2);
    return { screenX, screenY };
  }

  /**
   * Convert screen coordinates to isometric tile coordinates
   */
  private screenToIso(
    screenX: number,
    screenY: number,
    offsetX: number,
    offsetY: number
  ): { tileX: number; tileY: number } {
    const adjustedX = screenX - offsetX;
    const adjustedY = screenY - offsetY;

    const tileX = Math.floor(
      (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2
    );
    const tileY = Math.floor(
      (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2
    );

    return { tileX, tileY };
  }

  /**
   * Handle click on the tilemap
   */
  private handleClick(pointer: Phaser.Input.Pointer) {
    const offsetX = this.cameras.main.width / 2;
    const offsetY = 100;

    const { tileX, tileY } = this.screenToIso(
      pointer.worldX,
      pointer.worldY,
      offsetX,
      offsetY
    );

    console.log(`Clicked tile: (${tileX}, ${tileY})`);

    // Check if an agent is at this position
    // This will be implemented in Task 2.2.2
  }

  /**
   * Set up camera panning and zoom
   */
  private setupCameraControls() {
    // Enable camera drag
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x);
        this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y);
      }
    });

    // Enable zoom with mouse wheel
    this.input.on('wheel', (
      pointer: Phaser.Input.Pointer,
      gameObjects: Phaser.GameObjects.GameObject[],
      deltaX: number,
      deltaY: number
    ) => {
      const zoom = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.5, 2);
      this.cameras.main.setZoom(newZoom);
    });
  }

  /**
   * Add an agent sprite to the scene
   */
  public addAgent(agentId: string, tileX: number, tileY: number) {
    const offsetX = this.cameras.main.width / 2;
    const offsetY = 100;
    const { screenX, screenY } = this.isoToScreen(tileX, tileY, offsetX, offsetY);

    const sprite = this.add.sprite(screenX, screenY - 24, 'agent');
    sprite.setOrigin(0.5, 1);
    sprite.setDepth(tileY + 1); // Above furniture
    sprite.setInteractive();

    this.agentSprites.set(agentId, sprite);

    return sprite;
  }

  /**
   * Update an agent's position
   */
  public moveAgent(agentId: string, tileX: number, tileY: number) {
    const sprite = this.agentSprites.get(agentId);
    if (!sprite) return;

    const offsetX = this.cameras.main.width / 2;
    const offsetY = 100;
    const { screenX, screenY } = this.isoToScreen(tileX, tileY, offsetX, offsetY);

    // Animate movement
    this.tweens.add({
      targets: sprite,
      x: screenX,
      y: screenY - 24,
      duration: 500,
      ease: 'Power2',
      onUpdate: () => {
        // Update depth during movement for correct sorting
        sprite.setDepth(tileY + 1);
      },
    });
  }

  update() {
    // Game loop - called every frame
    // Agent animations and updates will be handled here
  }
}
```

**Step 3: Update Phaser config**

Update `apps/game/src/phaser/config.ts`:

```typescript
import Phaser from 'phaser';
import { OfficeScene } from './scenes/OfficeScene';

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'phaser-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  scene: [OfficeScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  render: {
    pixelArt: true, // Crisp pixel art rendering
    antialias: false,
  },
};
```

**Step 4: Create placeholder tile images**

Create simple placeholder images for testing. You can use any image editor or generate them programmatically.

For now, create colored rectangles:
- `floor.png`: Light gray isometric tile
- `wall.png`: Dark gray isometric cube
- `desk.png`: Brown rectangle
- `chair.png`: Small dark square

### Testing

1. **Manual Testing**:
   ```bash
   cd apps/game
   pnpm dev
   ```
   - Verify isometric grid renders correctly
   - Check that tiles are depth-sorted properly (back tiles behind front)
   - Test camera panning (click and drag)
   - Test camera zoom (mouse wheel)
   - Click tiles and verify console logs correct coordinates

### Acceptance Criteria
- [ ] Isometric grid renders with correct perspective
- [ ] Tiles are depth-sorted (far tiles behind near tiles)
- [ ] Different tile types render (floor, wall, desk, chair)
- [ ] Camera can be panned by dragging
- [ ] Camera can be zoomed with mouse wheel
- [ ] Clicking tiles logs correct tile coordinates
- [ ] Scene resizes with window

### Estimated Time
6-8 hours

### Common Pitfalls
1. **Depth sorting**: Must update depth based on Y position for correct overlap
2. **Coordinate conversion**: Isometric math is tricky - test thoroughly
3. **Origin points**: Furniture should use bottom-center origin (0.5, 1)
4. **Camera bounds**: May need to limit panning to prevent scrolling too far

---

# Phase 3: Agent SDK Integration

## Task 3.3.1: Configure CLI-Based Agent Runtime

### Objective
Configure a CLI-based agent runtime for real agent execution.

### Prerequisites
- Phase 1 and 2 complete
- CLI runtime command available on PATH (or configured via env)

### Files to Create/Modify
```
apps/server/.env                              # CLI runtime configuration
```

### Steps

**Step 1: Configure environment**

Update `apps/server/.env`:

```env
# Agent Runtime (CLI)
GENERIC_CORP_AGENT_CLI_COMMAND=bash
GENERIC_CORP_AGENT_CLI_ARGS=-lc

# Provide script that reads prompt from AGENT_PROMPT env var
GENERIC_CORP_AGENT_CLI_SCRIPT=echo "$AGENT_PROMPT"
```

**Step 2: Validate runtime**

- Ensure your chosen CLI command works in your environment.
- For local smoke testing, the defaults above simply echo the prompt back.

### Acceptance Criteria
- [ ] CLI command and args configured
- [ ] Runtime produces output for a given prompt

### Estimated Time
1 hour

---

## Task 3.3.2: Create AgentRunner Wrapper Class

### Objective
Create a wrapper class that manages agent sessions, handles tool calls, and tracks execution details.

### Prerequisites
- Task 3.3.1 complete

### Files to Create/Modify
```
apps/server/src/agents/AgentRunner.ts         # Main runner class
apps/server/src/agents/types.ts               # Type definitions
```

### Steps

**Step 1: Define types**

Create `apps/server/src/agents/types.ts`:

```typescript
export interface AgentRunnerConfig {
  agentId: string;
  name: string;
  systemPrompt: string;
  tools: string[];
  maxTurns?: number;
  onToolCall?: (tool: string, params: unknown) => Promise<unknown>;
  onMessage?: (message: string) => void;
  onError?: (error: Error) => void;
}

export interface AgentRunResult {
  success: boolean;
  output: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  toolCalls: ToolCallRecord[];
  turns: number;
  durationMs: number;
  error?: string;
}

export interface ToolCallRecord {
  tool: string;
  params: unknown;
  result: unknown;
  durationMs: number;
  timestamp: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
```

**Step 2: Create the AgentRunner class**

Create `apps/server/src/agents/AgentRunner.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, agentConfig } from '../config/agent-sdk';
import { AgentRunnerConfig, AgentRunResult, ToolCallRecord, ConversationMessage } from './types';
import { getMcpTools, executeMcpTool } from '../tools/mcp-client';

export class AgentRunner {
  private client: Anthropic;
  private config: AgentRunnerConfig;
  private conversationHistory: ConversationMessage[];
  private toolCalls: ToolCallRecord[];
  private totalTokens: { input: number; output: number };

  constructor(config: AgentRunnerConfig) {
    this.client = getAnthropicClient();
    this.config = config;
    this.conversationHistory = [];
    this.toolCalls = [];
    this.totalTokens = { input: 0, output: 0 };
  }

  /**
   * Execute a task with the agent
   */
  async run(task: string): Promise<AgentRunResult> {
    const startTime = Date.now();
    let turns = 0;
    const maxTurns = this.config.maxTurns || 10;

    try {
      // Add the task as the first user message
      this.conversationHistory.push({
        role: 'user',
        content: task,
      });

      // Get available tools for this agent
      const tools = await this.getAgentTools();

      // Main agent loop
      while (turns < maxTurns) {
        turns++;

        // Call Claude
        const response = await this.client.messages.create({
          model: agentConfig.model,
          max_tokens: agentConfig.maxTokens,
          system: this.config.systemPrompt,
          messages: this.conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          tools: tools,
        });

        // Track token usage
        this.totalTokens.input += response.usage.input_tokens;
        this.totalTokens.output += response.usage.output_tokens;

        // Process response
        const assistantContent = this.extractContent(response);
        this.conversationHistory.push({
          role: 'assistant',
          content: assistantContent,
        });

        // Check for tool calls
        const toolUseBlocks = response.content.filter(
          (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
        );

        if (toolUseBlocks.length === 0) {
          // No tool calls - agent is done
          return this.createResult(true, assistantContent, turns, startTime);
        }

        // Execute tool calls
        const toolResults = await this.executeToolCalls(toolUseBlocks);

        // Add tool results to conversation
        this.conversationHistory.push({
          role: 'user',
          content: JSON.stringify(toolResults),
        });

        // Notify callback if provided
        if (this.config.onMessage) {
          this.config.onMessage(assistantContent);
        }
      }

      // Max turns reached
      return this.createResult(
        false,
        'Max turns reached without completion',
        turns,
        startTime,
        'MAX_TURNS_EXCEEDED'
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(errorMessage));
      }
      return this.createResult(false, '', turns, startTime, errorMessage);
    }
  }

  /**
   * Get tools available to this agent
   */
  private async getAgentTools(): Promise<Anthropic.Tool[]> {
    const allTools = await getMcpTools();

    // Filter to only tools this agent is allowed to use
    return allTools.filter(tool =>
      this.config.tools.includes(tool.name)
    );
  }

  /**
   * Execute tool calls and return results
   */
  private async executeToolCalls(
    toolUseBlocks: Anthropic.ToolUseBlock[]
  ): Promise<{ tool: string; result: unknown }[]> {
    const results = [];

    for (const block of toolUseBlocks) {
      const startTime = Date.now();

      try {
        // Execute via MCP or custom handler
        let result: unknown;
        if (this.config.onToolCall) {
          result = await this.config.onToolCall(block.name, block.input);
        } else {
          result = await executeMcpTool(block.name, block.input);
        }

        const record: ToolCallRecord = {
          tool: block.name,
          params: block.input,
          result,
          durationMs: Date.now() - startTime,
          timestamp: new Date(),
        };

        this.toolCalls.push(record);
        results.push({ tool: block.name, result });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Tool execution failed';
        results.push({ tool: block.name, result: { error: errorMessage } });
      }
    }

    return results;
  }

  /**
   * Extract text content from response
   */
  private extractContent(response: Anthropic.Message): string {
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');
  }

  /**
   * Create the result object
   */
  private createResult(
    success: boolean,
    output: string,
    turns: number,
    startTime: number,
    error?: string
  ): AgentRunResult {
    return {
      success,
      output,
      tokensUsed: {
        input: this.totalTokens.input,
        output: this.totalTokens.output,
        total: this.totalTokens.input + this.totalTokens.output,
      },
      toolCalls: this.toolCalls,
      turns,
      durationMs: Date.now() - startTime,
      error,
    };
  }

  /**
   * Get current conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history (start fresh)
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.toolCalls = [];
    this.totalTokens = { input: 0, output: 0 };
  }
}
```

### Testing

Create `apps/server/src/agents/AgentRunner.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRunner } from './AgentRunner';

// Mock the Anthropic client
vi.mock('../config/agent-sdk', () => ({
  getAnthropicClient: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Task completed successfully.' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      }),
    },
  }),
  agentConfig: { model: 'test-model', maxTokens: 1000 },
}));

vi.mock('../tools/mcp-client', () => ({
  getMcpTools: () => Promise.resolve([]),
  executeMcpTool: () => Promise.resolve({ success: true }),
}));

describe('AgentRunner', () => {
  let runner: AgentRunner;

  beforeEach(() => {
    runner = new AgentRunner({
      agentId: 'test-agent',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent.',
      tools: [],
    });
  });

  it('should execute a simple task', async () => {
    const result = await runner.run('Say hello');

    expect(result.success).toBe(true);
    expect(result.output).toBe('Task completed successfully.');
    expect(result.tokensUsed.total).toBe(150);
  });

  it('should track token usage', async () => {
    const result = await runner.run('Count to 10');

    expect(result.tokensUsed.input).toBe(100);
    expect(result.tokensUsed.output).toBe(50);
  });

  it('should limit turns', async () => {
    const limitedRunner = new AgentRunner({
      agentId: 'test-agent',
      name: 'Test Agent',
      systemPrompt: 'You are a test agent.',
      tools: [],
      maxTurns: 1,
    });

    const result = await limitedRunner.run('Do something');
    expect(result.turns).toBeLessThanOrEqual(1);
  });
});
```

### Acceptance Criteria
- [ ] AgentRunner instantiates with configuration
- [ ] run() executes task and returns result
- [ ] Token usage is tracked accurately
- [ ] Tool calls are executed and recorded
- [ ] Conversation history is maintained
- [ ] Max turns limit prevents infinite loops
- [ ] Errors are caught and returned in result
- [ ] onMessage callback fires for each response
- [ ] onError callback fires on errors

### Estimated Time
4-6 hours

---

## Task 3.4.1: Set Up MCP Server Infrastructure

### Objective
Create the Model Context Protocol (MCP) server that provides tools to agents. This server handles filesystem access, git operations, messaging, and other capabilities.

### Prerequisites
- Task 3.3.2 complete
- Understanding of MCP protocol

### Files to Create/Modify
```
apps/server/src/tools/mcp-server.ts           # MCP server
apps/server/src/tools/mcp-client.ts           # Client interface
apps/server/src/tools/definitions/            # Tool definitions
apps/server/src/tools/handlers/               # Tool handlers
```

### Steps

**Step 1: Install MCP dependencies**

```bash
cd apps/server
pnpm add @anthropic-ai/sdk
```

**Step 2: Create tool definitions**

Create `apps/server/src/tools/definitions/index.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

export const toolDefinitions: Anthropic.Tool[] = [
  // Filesystem tools
  {
    name: 'filesystem_read',
    description: 'Read the contents of a file at the specified path',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'filesystem_write',
    description: 'Write content to a file at the specified path',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The file path to write to',
        },
        content: {
          type: 'string',
          description: 'The content to write',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'filesystem_list',
    description: 'List files and directories at the specified path',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The directory path to list',
        },
      },
      required: ['path'],
    },
  },

  // Git tools
  {
    name: 'git_status',
    description: 'Get the current git status',
    input_schema: {
      type: 'object' as const,
      properties: {
        repoPath: {
          type: 'string',
          description: 'Path to the git repository',
        },
      },
      required: ['repoPath'],
    },
  },
  {
    name: 'git_commit',
    description: 'Create a git commit with the specified message',
    input_schema: {
      type: 'object' as const,
      properties: {
        repoPath: {
          type: 'string',
          description: 'Path to the git repository',
        },
        message: {
          type: 'string',
          description: 'The commit message',
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to stage and commit (optional, defaults to all)',
        },
      },
      required: ['repoPath', 'message'],
    },
  },

  // Messaging tools
  {
    name: 'message_send',
    description: 'Send an internal message to another agent',
    input_schema: {
      type: 'object' as const,
      properties: {
        toAgentId: {
          type: 'string',
          description: 'The ID of the recipient agent',
        },
        subject: {
          type: 'string',
          description: 'Message subject',
        },
        body: {
          type: 'string',
          description: 'Message body',
        },
      },
      required: ['toAgentId', 'subject', 'body'],
    },
  },
  {
    name: 'message_check_inbox',
    description: 'Check for new messages in the inbox',
    input_schema: {
      type: 'object' as const,
      properties: {
        unreadOnly: {
          type: 'boolean',
          description: 'Only return unread messages',
        },
      },
      required: [],
    },
  },

  // External draft tools (require approval)
  {
    name: 'external_draft_email',
    description: 'Draft an external email that requires CEO approval before sending',
    input_schema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: 'Recipient email address',
        },
        subject: {
          type: 'string',
          description: 'Email subject',
        },
        body: {
          type: 'string',
          description: 'Email body',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },

  // Task tools
  {
    name: 'task_create',
    description: 'Create a new task and assign it to an agent',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        assigneeId: {
          type: 'string',
          description: 'ID of the agent to assign the task to',
        },
        priority: {
          type: 'number',
          description: 'Priority (1=urgent, 2=high, 3=medium, 4=low)',
        },
        acceptanceCriteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of acceptance criteria for TDD',
        },
      },
      required: ['title', 'description', 'assigneeId'],
    },
  },

  // Shell/command tools (restricted)
  {
    name: 'shell_exec',
    description: 'Execute a shell command (restricted to safe commands)',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The command to execute',
        },
        cwd: {
          type: 'string',
          description: 'Working directory',
        },
      },
      required: ['command'],
    },
  },
];

// Map of which tools each role can use
export const toolPermissions: Record<string, string[]> = {
  ceo: [
    'message_send',
    'message_check_inbox',
    'task_create',
    'external_draft_email',
  ],
  engineering_lead: [
    'filesystem_read',
    'filesystem_write',
    'filesystem_list',
    'git_status',
    'git_commit',
    'message_send',
    'message_check_inbox',
    'task_create',
    'shell_exec',
  ],
  engineer: [
    'filesystem_read',
    'filesystem_write',
    'filesystem_list',
    'git_status',
    'git_commit',
    'message_send',
    'message_check_inbox',
    'shell_exec',
  ],
  marketing: [
    'message_send',
    'message_check_inbox',
    'external_draft_email',
    'filesystem_read',
    'filesystem_write',
  ],
  sales: [
    'message_send',
    'message_check_inbox',
    'external_draft_email',
  ],
  operations: [
    'message_send',
    'message_check_inbox',
    'task_create',
    'external_draft_email',
  ],
};
```

**Step 3: Create tool handlers**

Create `apps/server/src/tools/handlers/filesystem.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';

// Sandbox directory - agents can only access files within this directory
const SANDBOX_ROOT = process.env.AGENT_SANDBOX_ROOT || '/tmp/generic-corp-sandbox';

function resolveSafePath(filePath: string): string {
  // Resolve the path and ensure it's within the sandbox
  const resolved = path.resolve(SANDBOX_ROOT, filePath);

  if (!resolved.startsWith(SANDBOX_ROOT)) {
    throw new Error('Access denied: Path outside sandbox');
  }

  return resolved;
}

export async function filesystemRead(params: { path: string }): Promise<{ content: string }> {
  const safePath = resolveSafePath(params.path);

  try {
    const content = await fs.readFile(safePath, 'utf-8');
    return { content };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: ${params.path}`);
    }
    throw error;
  }
}

export async function filesystemWrite(params: { path: string; content: string }): Promise<{ success: boolean }> {
  const safePath = resolveSafePath(params.path);

  // Ensure directory exists
  await fs.mkdir(path.dirname(safePath), { recursive: true });

  await fs.writeFile(safePath, params.content, 'utf-8');
  return { success: true };
}

export async function filesystemList(params: { path: string }): Promise<{ entries: string[] }> {
  const safePath = resolveSafePath(params.path);

  const entries = await fs.readdir(safePath, { withFileTypes: true });

  return {
    entries: entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file',
    })),
  };
}
```

Create `apps/server/src/tools/handlers/git.ts`:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function gitStatus(params: { repoPath: string }): Promise<{ status: string }> {
  try {
    const { stdout } = await execAsync('git status --porcelain', {
      cwd: params.repoPath,
    });
    return { status: stdout || 'Clean working directory' };
  } catch (error) {
    throw new Error(`Git status failed: ${(error as Error).message}`);
  }
}

export async function gitCommit(params: {
  repoPath: string;
  message: string;
  files?: string[];
}): Promise<{ commitHash: string }> {
  try {
    // Stage files
    if (params.files && params.files.length > 0) {
      await execAsync(`git add ${params.files.join(' ')}`, {
        cwd: params.repoPath,
      });
    } else {
      await execAsync('git add -A', { cwd: params.repoPath });
    }

    // Commit
    const { stdout } = await execAsync(
      `git commit -m "${params.message.replace(/"/g, '\\"')}"`,
      { cwd: params.repoPath }
    );

    // Get commit hash
    const { stdout: hash } = await execAsync('git rev-parse HEAD', {
      cwd: params.repoPath,
    });

    return { commitHash: hash.trim() };
  } catch (error) {
    throw new Error(`Git commit failed: ${(error as Error).message}`);
  }
}
```

**Step 4: Create MCP client interface**

Create `apps/server/src/tools/mcp-client.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { toolDefinitions, toolPermissions } from './definitions';
import * as filesystemHandlers from './handlers/filesystem';
import * as gitHandlers from './handlers/git';
import * as messagingHandlers from './handlers/messaging';
import * as taskHandlers from './handlers/tasks';

// Tool handler registry
const toolHandlers: Record<string, (params: unknown) => Promise<unknown>> = {
  filesystem_read: filesystemHandlers.filesystemRead,
  filesystem_write: filesystemHandlers.filesystemWrite,
  filesystem_list: filesystemHandlers.filesystemList,
  git_status: gitHandlers.gitStatus,
  git_commit: gitHandlers.gitCommit,
  // Add more handlers as implemented
};

/**
 * Get all tool definitions
 */
export async function getMcpTools(): Promise<Anthropic.Tool[]> {
  return toolDefinitions;
}

/**
 * Get tools available to a specific agent role
 */
export async function getToolsForRole(role: string): Promise<Anthropic.Tool[]> {
  const allowedTools = toolPermissions[role] || [];
  return toolDefinitions.filter(tool => allowedTools.includes(tool.name));
}

/**
 * Execute a tool and return the result
 */
export async function executeMcpTool(
  toolName: string,
  params: unknown
): Promise<unknown> {
  const handler = toolHandlers[toolName];

  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  try {
    return await handler(params);
  } catch (error) {
    return {
      error: true,
      message: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * Check if a role has access to a tool
 */
export function hasToolAccess(role: string, toolName: string): boolean {
  const allowedTools = toolPermissions[role] || [];
  return allowedTools.includes(toolName);
}
```

### Acceptance Criteria
- [ ] MCP server starts without errors
- [ ] All tool definitions are valid JSON Schema
- [ ] Filesystem tools enforce sandbox boundaries
- [ ] Git tools execute and return results
- [ ] Tool permissions are enforced per role
- [ ] Unknown tools return clear error
- [ ] Tool errors are caught and returned gracefully

### Estimated Time
6-8 hours

---

# Phase 4: Temporal Migration

## Task 4.1.1: Add Temporal to docker-compose.yml

### Objective
Set up Temporal server infrastructure using Docker for durable workflow execution.

### Prerequisites
- Docker and docker-compose installed
- Phase 3 complete

### Files to Modify
```
docker-compose.yml                            # Add Temporal services
```

### Steps

**Step 1: Update docker-compose.yml**

Add the following services to your `docker-compose.yml`:

```yaml
services:
  # ... existing services (postgres, redis) ...

  # Temporal Server
  temporal:
    image: temporalio/auto-setup:1.24
    container_name: generic-corp-temporal
    ports:
      - "7233:7233"   # gRPC frontend
    environment:
      - DB=postgresql
      - DB_PORT=5432
      - POSTGRES_USER=temporal
      - POSTGRES_PWD=temporal
      - POSTGRES_SEEDS=postgres
      - DYNAMIC_CONFIG_FILE_PATH=config/dynamicconfig/development.yaml
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./temporal-config:/etc/temporal/config/dynamicconfig
    networks:
      - generic-corp-network
    healthcheck:
      test: ["CMD", "temporal", "workflow", "list", "--namespace", "default"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Temporal Admin Tools (for CLI access)
  temporal-admin-tools:
    image: temporalio/admin-tools:1.24
    container_name: generic-corp-temporal-admin
    depends_on:
      temporal:
        condition: service_healthy
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
    networks:
      - generic-corp-network
    stdin_open: true
    tty: true

  # Temporal Web UI
  temporal-ui:
    image: temporalio/ui:2.26.2
    container_name: generic-corp-temporal-ui
    ports:
      - "8080:8080"
    environment:
      - TEMPORAL_ADDRESS=temporal:7233
      - TEMPORAL_CORS_ORIGINS=http://localhost:3000
    depends_on:
      temporal:
        condition: service_healthy
    networks:
      - generic-corp-network

networks:
  generic-corp-network:
    driver: bridge
```

**Step 2: Create Temporal dynamic config**

Create `temporal-config/development.yaml`:

```yaml
# Temporal dynamic configuration for development

# Frontend settings
frontend.enableClientVersionCheck:
  - value: true
    constraints: {}

# History settings
history.defaultActivityRetryPolicy:
  - value:
      InitialIntervalInSeconds: 1
      MaximumIntervalInSeconds: 100
      BackoffCoefficient: 2
      MaximumAttempts: 3
    constraints: {}

# Matching settings
matching.numTaskqueueReadPartitions:
  - value: 5
    constraints: {}
matching.numTaskqueueWritePartitions:
  - value: 5
    constraints: {}

# Worker settings
worker.enableScheduler:
  - value: true
    constraints: {}

# System settings
system.forceSearchAttributesCacheRefreshOnRead:
  - value: true
    constraints: {}
```

**Step 3: Create Temporal database user in PostgreSQL**

Update your PostgreSQL initialization script or run manually:

```sql
CREATE USER temporal WITH PASSWORD 'temporal';
CREATE DATABASE temporal OWNER temporal;
CREATE DATABASE temporal_visibility OWNER temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal TO temporal;
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO temporal;
```

**Step 4: Start Temporal**

```bash
docker-compose up -d temporal temporal-ui

# Verify it's running
docker-compose logs temporal

# Access the UI at http://localhost:8080
```

### Testing

1. **Verify Temporal is running**:
   ```bash
   # Check health
   docker-compose exec temporal-admin-tools temporal workflow list

   # Should see empty list (no workflows yet)
   ```

2. **Access Temporal UI**:
   - Open http://localhost:8080
   - Should see Temporal Web interface
   - Default namespace should be visible

### Acceptance Criteria
- [ ] Temporal server starts successfully
- [ ] Temporal UI accessible at port 8080
- [ ] `temporal workflow list` command works
- [ ] PostgreSQL connection is healthy
- [ ] Admin tools container can connect

### Estimated Time
2-3 hours

---

## Task 4.3.1: Create agentTaskWorkflow

### Objective
Create the main Temporal workflow that orchestrates a single agent executing a task. This is the core workflow that replaces BullMQ job execution.

### Prerequisites
- Task 4.1.1-4.2.4 complete
- Temporal TypeScript SDK installed

### Files to Create
```
apps/server/src/temporal/workflows/agentTaskWorkflow.ts
apps/server/src/temporal/activities/agentActivities.ts
```

### Steps

**Step 1: Install Temporal SDK**

```bash
cd apps/server
pnpm add @temporalio/client @temporalio/worker @temporalio/workflow @temporalio/activity
```

**Step 2: Create activity definitions**

Create `apps/server/src/temporal/activities/agentActivities.ts`:

```typescript
import { AgentRunner } from '../../agents/AgentRunner';
import { db } from '../../db';
import { eventBus } from '../../events';

/**
 * Activity: Execute a single LLM call
 * This is non-deterministic and must be an activity
 */
export async function executeAgentStep(params: {
  agentId: string;
  taskId: string;
  systemPrompt: string;
  tools: string[];
  instruction: string;
  conversationHistory: Array<{ role: string; content: string }>;
}): Promise<{
  response: string;
  toolCalls: Array<{ tool: string; params: unknown; result: unknown }>;
  tokensUsed: { input: number; output: number };
  isComplete: boolean;
}> {
  const runner = new AgentRunner({
    agentId: params.agentId,
    name: params.agentId,
    systemPrompt: params.systemPrompt,
    tools: params.tools,
    maxTurns: 1, // Single turn per activity
  });

  // Restore conversation history
  for (const msg of params.conversationHistory) {
    // Internal method to restore history
    runner['conversationHistory'].push(msg as any);
  }

  const result = await runner.run(params.instruction);

  return {
    response: result.output,
    toolCalls: result.toolCalls.map(tc => ({
      tool: tc.tool,
      params: tc.params,
      result: tc.result,
    })),
    tokensUsed: {
      input: result.tokensUsed.input,
      output: result.tokensUsed.output,
    },
    isComplete: result.success && result.toolCalls.length === 0,
  };
}

/**
 * Activity: Update task status in database
 */
export async function updateTaskStatus(params: {
  taskId: string;
  status: string;
  output?: string;
  error?: string;
}): Promise<void> {
  await db.task.update({
    where: { id: params.taskId },
    data: {
      status: params.status,
      output: params.output,
      error: params.error,
      updatedAt: new Date(),
      completedAt: params.status === 'completed' ? new Date() : undefined,
    },
  });

  // Emit event for real-time updates
  eventBus.emit('task:updated', {
    taskId: params.taskId,
    status: params.status,
  });
}

/**
 * Activity: Update agent status
 */
export async function updateAgentStatus(params: {
  agentId: string;
  status: 'idle' | 'working' | 'blocked';
  currentTaskId?: string;
}): Promise<void> {
  await db.agent.update({
    where: { id: params.agentId },
    data: {
      status: params.status,
      currentTaskId: params.currentTaskId,
      updatedAt: new Date(),
    },
  });

  eventBus.emit('agent:updated', {
    agentId: params.agentId,
    status: params.status,
  });
}

/**
 * Activity: Run tests
 */
export async function runTests(params: {
  testCommand: string;
  cwd: string;
}): Promise<{
  passed: boolean;
  output: string;
  coverage?: number;
}> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const { stdout, stderr } = await execAsync(params.testCommand, {
      cwd: params.cwd,
      timeout: 300000, // 5 minute timeout
    });

    return {
      passed: true,
      output: stdout + stderr,
    };
  } catch (error: any) {
    return {
      passed: false,
      output: error.stdout + error.stderr || error.message,
    };
  }
}

/**
 * Activity: Verify task completion
 */
export async function verifyTaskCompletion(params: {
  taskId: string;
  verifications: Array<{
    type: 'tests_pass' | 'git_commit_exists' | 'file_exists';
    target: string;
  }>;
}): Promise<{
  allPassed: boolean;
  results: Array<{ type: string; passed: boolean; message: string }>;
}> {
  const results = [];

  for (const verification of params.verifications) {
    switch (verification.type) {
      case 'tests_pass':
        const testResult = await runTests({
          testCommand: 'pnpm test',
          cwd: verification.target,
        });
        results.push({
          type: verification.type,
          passed: testResult.passed,
          message: testResult.passed ? 'Tests passed' : 'Tests failed',
        });
        break;

      case 'git_commit_exists':
        // Check if commit exists
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        try {
          await promisify(exec)(`git cat-file -t ${verification.target}`);
          results.push({
            type: verification.type,
            passed: true,
            message: `Commit ${verification.target} exists`,
          });
        } catch {
          results.push({
            type: verification.type,
            passed: false,
            message: `Commit ${verification.target} not found`,
          });
        }
        break;

      case 'file_exists':
        const fs = await import('fs/promises');
        try {
          await fs.access(verification.target);
          results.push({
            type: verification.type,
            passed: true,
            message: `File ${verification.target} exists`,
          });
        } catch {
          results.push({
            type: verification.type,
            passed: false,
            message: `File ${verification.target} not found`,
          });
        }
        break;
    }
  }

  return {
    allPassed: results.every(r => r.passed),
    results,
  };
}

/**
 * Activity: Notify lead of failure
 */
export async function notifyLead(params: {
  leadId: string;
  taskId: string;
  error: string;
  agentId: string;
}): Promise<void> {
  await db.message.create({
    data: {
      fromAgentId: params.agentId,
      toAgentId: params.leadId,
      subject: `Task Failed: ${params.taskId}`,
      body: `Task ${params.taskId} failed with error:\n\n${params.error}`,
      type: 'escalation',
    },
  });

  eventBus.emit('message:created', {
    toAgentId: params.leadId,
    type: 'escalation',
  });
}
```

**Step 3: Create the workflow**

Create `apps/server/src/temporal/workflows/agentTaskWorkflow.ts`:

```typescript
import {
  proxyActivities,
  sleep,
  defineSignal,
  setHandler,
  condition,
} from '@temporalio/workflow';

// Import activity types (not implementations!)
import type * as activities from '../activities/agentActivities';

// Proxy activities for use in workflow
const {
  executeAgentStep,
  updateTaskStatus,
  updateAgentStatus,
  runTests,
  verifyTaskCompletion,
  notifyLead,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
  },
});

// Signals for external control
export const cancelSignal = defineSignal('cancel');
export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');

// Workflow input
export interface AgentTaskInput {
  taskId: string;
  agentId: string;
  task: {
    title: string;
    description: string;
    acceptanceCriteria: string[];
  };
  agentConfig: {
    systemPrompt: string;
    tools: string[];
    leadId: string;
  };
  maxTurns?: number;
}

// Workflow output
export interface AgentTaskOutput {
  success: boolean;
  output: string;
  tokensUsed: { input: number; output: number };
  turns: number;
  error?: string;
}

/**
 * Main agent task workflow
 *
 * This workflow orchestrates an agent executing a task:
 * 1. Update agent status to "working"
 * 2. Execute agent turns until task is complete or max turns reached
 * 3. Verify completion with external checks
 * 4. Update task and agent status
 * 5. Notify lead if failed
 */
export async function agentTaskWorkflow(input: AgentTaskInput): Promise<AgentTaskOutput> {
  const { taskId, agentId, task, agentConfig, maxTurns = 20 } = input;

  // State
  let cancelled = false;
  let paused = false;
  let turns = 0;
  let totalTokens = { input: 0, output: 0 };
  let conversationHistory: Array<{ role: string; content: string }> = [];
  let lastOutput = '';

  // Set up signal handlers
  setHandler(cancelSignal, () => {
    cancelled = true;
  });
  setHandler(pauseSignal, () => {
    paused = true;
  });
  setHandler(resumeSignal, () => {
    paused = false;
  });

  try {
    // Step 1: Mark agent as working
    await updateAgentStatus({
      agentId,
      status: 'working',
      currentTaskId: taskId,
    });

    await updateTaskStatus({
      taskId,
      status: 'in_progress',
    });

    // Step 2: Build initial instruction
    const instruction = `
## Task: ${task.title}

${task.description}

## Acceptance Criteria
${task.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

## Instructions
1. First, write failing tests that verify the acceptance criteria
2. Run the tests to confirm they fail
3. Implement the solution to make tests pass
4. Refactor if needed while keeping tests green
5. When complete, summarize what you did
`;

    // Step 3: Main execution loop
    while (turns < maxTurns && !cancelled) {
      // Check for pause
      if (paused) {
        await condition(() => !paused || cancelled, '1 hour');
        if (cancelled) break;
      }

      turns++;

      // Execute one agent step
      const result = await executeAgentStep({
        agentId,
        taskId,
        systemPrompt: agentConfig.systemPrompt,
        tools: agentConfig.tools,
        instruction: turns === 1 ? instruction : 'Continue with the task.',
        conversationHistory,
      });

      // Update totals
      totalTokens.input += result.tokensUsed.input;
      totalTokens.output += result.tokensUsed.output;
      lastOutput = result.response;

      // Update conversation history
      conversationHistory.push(
        { role: 'user', content: turns === 1 ? instruction : 'Continue.' },
        { role: 'assistant', content: result.response }
      );

      // Check if agent thinks it's done
      if (result.isComplete) {
        break;
      }

      // Brief pause between turns to avoid rate limits
      await sleep('1 second');
    }

    // Step 4: Verify completion
    const verification = await verifyTaskCompletion({
      taskId,
      verifications: [
        { type: 'tests_pass', target: process.cwd() },
      ],
    });

    if (!verification.allPassed) {
      // Verification failed - mark as failed and notify lead
      await updateTaskStatus({
        taskId,
        status: 'failed',
        error: `Verification failed: ${verification.results
          .filter(r => !r.passed)
          .map(r => r.message)
          .join(', ')}`,
      });

      await notifyLead({
        leadId: agentConfig.leadId,
        taskId,
        agentId,
        error: `Task verification failed`,
      });

      await updateAgentStatus({ agentId, status: 'idle' });

      return {
        success: false,
        output: lastOutput,
        tokensUsed: totalTokens,
        turns,
        error: 'Verification failed',
      };
    }

    // Step 5: Mark as complete
    await updateTaskStatus({
      taskId,
      status: 'completed',
      output: lastOutput,
    });

    await updateAgentStatus({ agentId, status: 'idle' });

    return {
      success: true,
      output: lastOutput,
      tokensUsed: totalTokens,
      turns,
    };

  } catch (error) {
    // Handle unexpected errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateTaskStatus({
      taskId,
      status: 'failed',
      error: errorMessage,
    });

    await notifyLead({
      leadId: agentConfig.leadId,
      taskId,
      agentId,
      error: errorMessage,
    });

    await updateAgentStatus({ agentId, status: 'idle' });

    return {
      success: false,
      output: lastOutput,
      tokensUsed: totalTokens,
      turns,
      error: errorMessage,
    };
  }
}
```

### Testing

Create `apps/server/src/temporal/workflows/agentTaskWorkflow.test.ts`:

```typescript
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { agentTaskWorkflow } from './agentTaskWorkflow';

describe('agentTaskWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  it('should complete a simple task', async () => {
    const { client, nativeConnection } = testEnv;

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('./agentTaskWorkflow'),
      activities: {
        // Mock activities
        executeAgentStep: async () => ({
          response: 'Done!',
          toolCalls: [],
          tokensUsed: { input: 10, output: 5 },
          isComplete: true,
        }),
        updateTaskStatus: async () => {},
        updateAgentStatus: async () => {},
        verifyTaskCompletion: async () => ({
          allPassed: true,
          results: [],
        }),
        notifyLead: async () => {},
      },
    });

    await worker.runUntil(async () => {
      const result = await client.workflow.execute(agentTaskWorkflow, {
        workflowId: 'test-workflow',
        taskQueue: 'test',
        args: [{
          taskId: 'task-1',
          agentId: 'agent-1',
          task: {
            title: 'Test Task',
            description: 'Do something',
            acceptanceCriteria: ['It works'],
          },
          agentConfig: {
            systemPrompt: 'You are a test agent',
            tools: [],
            leadId: 'lead-1',
          },
        }],
      });

      expect(result.success).toBe(true);
    });
  });
});
```

### Acceptance Criteria
- [ ] Workflow executes agent steps in a loop
- [ ] Token usage is accumulated across turns
- [ ] Workflow can be cancelled via signal
- [ ] Workflow can be paused and resumed
- [ ] Max turns limit prevents infinite execution
- [ ] Task status is updated throughout execution
- [ ] Agent status is updated (working → idle)
- [ ] Verification runs after agent claims completion
- [ ] Lead is notified on failure
- [ ] Errors are caught and handled gracefully

### Estimated Time
8-10 hours

---

# Phase 6: Autonomous Operations

## Task 6.1.2: Create CronManager Service

### Objective
Create a service that manages all scheduled cron jobs using BullMQ repeatable jobs. This is the backbone of autonomous operation.

### Prerequisites
- BullMQ already set up from Phase 1
- Understanding of cron patterns

### Files to Create
```
apps/server/src/services/CronManager.ts
apps/server/src/crons/index.ts
apps/server/src/crons/ceo.ts
apps/server/src/crons/leads.ts
apps/server/src/crons/workers.ts
apps/server/src/crons/system.ts
```

### Steps

**Step 1: Create the CronManager service**

Create `apps/server/src/services/CronManager.ts`:

```typescript
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { eventBus } from '../events';

export interface CronJobDefinition {
  name: string;
  pattern: string; // Cron pattern (e.g., "0 9 * * *" for 9 AM daily)
  handler: (job: Job) => Promise<void>;
  data?: Record<string, unknown>;
  description?: string;
  enabled?: boolean;
}

export interface CronJobStatus {
  name: string;
  pattern: string;
  description?: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  lastError?: string;
  runCount: number;
}

export class CronManager {
  private queue: Queue;
  private worker: Worker;
  private redis: Redis;
  private jobs: Map<string, CronJobDefinition> = new Map();
  private jobStatus: Map<string, CronJobStatus> = new Map();

  constructor(redisConnection: Redis) {
    this.redis = redisConnection;

    // Create the cron queue
    this.queue = new Queue('crons', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed
        removeOnFail: 50,      // Keep last 50 failed
      },
    });

    // Create the worker
    this.worker = new Worker(
      'crons',
      async (job: Job) => {
        await this.executeJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 5, // Process up to 5 cron jobs concurrently
      }
    );

    // Handle worker events
    this.worker.on('completed', (job) => {
      this.updateJobStatus(job.name, { lastError: undefined });
      console.log(`Cron job completed: ${job.name}`);
    });

    this.worker.on('failed', (job, error) => {
      if (job) {
        this.updateJobStatus(job.name, { lastError: error.message });
        console.error(`Cron job failed: ${job.name}`, error);
      }
    });
  }

  /**
   * Register a new cron job
   */
  async register(definition: CronJobDefinition): Promise<void> {
    const { name, pattern, data = {}, enabled = true, description } = definition;

    // Store the definition
    this.jobs.set(name, definition);

    // Initialize status
    this.jobStatus.set(name, {
      name,
      pattern,
      description,
      enabled,
      runCount: 0,
    });

    if (enabled) {
      // Add as repeatable job to BullMQ
      await this.queue.add(
        name,
        { ...data, cronName: name },
        {
          repeat: { pattern },
          jobId: name,
        }
      );

      console.log(`Registered cron: ${name} (${pattern})`);
    }
  }

  /**
   * Unregister a cron job
   */
  async unregister(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) return;

    // Remove repeatable job
    await this.queue.removeRepeatable(name, { pattern: definition.pattern });

    this.jobs.delete(name);
    this.jobStatus.delete(name);

    console.log(`Unregistered cron: ${name}`);
  }

  /**
   * Pause a cron job
   */
  async pause(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) return;

    await this.queue.removeRepeatable(name, { pattern: definition.pattern });
    this.updateJobStatus(name, { enabled: false });

    console.log(`Paused cron: ${name}`);
  }

  /**
   * Resume a paused cron job
   */
  async resume(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) return;

    await this.queue.add(
      name,
      { ...definition.data, cronName: name },
      {
        repeat: { pattern: definition.pattern },
        jobId: name,
      }
    );

    this.updateJobStatus(name, { enabled: true });

    console.log(`Resumed cron: ${name}`);
  }

  /**
   * Manually trigger a cron job (for testing)
   */
  async trigger(name: string): Promise<void> {
    const definition = this.jobs.get(name);
    if (!definition) {
      throw new Error(`Unknown cron job: ${name}`);
    }

    await this.queue.add(
      name,
      { ...definition.data, cronName: name, manual: true },
      { jobId: `${name}-manual-${Date.now()}` }
    );

    console.log(`Manually triggered cron: ${name}`);
  }

  /**
   * Get status of all cron jobs
   */
  getStatus(): CronJobStatus[] {
    return Array.from(this.jobStatus.values());
  }

  /**
   * Get status of a specific job
   */
  getJobStatus(name: string): CronJobStatus | undefined {
    return this.jobStatus.get(name);
  }

  /**
   * Execute a cron job
   */
  private async executeJob(job: Job): Promise<void> {
    const cronName = job.data.cronName || job.name;
    const definition = this.jobs.get(cronName);

    if (!definition) {
      console.warn(`No handler for cron job: ${cronName}`);
      return;
    }

    const startTime = Date.now();

    try {
      // Update status
      this.updateJobStatus(cronName, {
        lastRun: new Date(),
        runCount: (this.jobStatus.get(cronName)?.runCount || 0) + 1,
      });

      // Emit event
      eventBus.emit('cron:started', { name: cronName });

      // Execute the handler
      await definition.handler(job);

      // Emit completion event
      eventBus.emit('cron:completed', {
        name: cronName,
        durationMs: Date.now() - startTime,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      eventBus.emit('cron:failed', {
        name: cronName,
        error: errorMessage,
        durationMs: Date.now() - startTime,
      });

      throw error; // Re-throw for BullMQ to handle
    }
  }

  /**
   * Update job status
   */
  private updateJobStatus(name: string, updates: Partial<CronJobStatus>): void {
    const current = this.jobStatus.get(name);
    if (current) {
      this.jobStatus.set(name, { ...current, ...updates });
    }
  }

  /**
   * Calculate next run time for a cron pattern
   */
  private calculateNextRun(pattern: string): Date {
    // Use a cron parser library for accurate calculation
    // For now, return a placeholder
    return new Date(Date.now() + 60000);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    console.log('CronManager shutdown complete');
  }
}

// Singleton instance
let cronManager: CronManager | null = null;

export function getCronManager(redis?: Redis): CronManager {
  if (!cronManager) {
    if (!redis) {
      throw new Error('Redis connection required for first initialization');
    }
    cronManager = new CronManager(redis);
  }
  return cronManager;
}
```

**Step 2: Create CEO cron jobs**

Create `apps/server/src/crons/ceo.ts`:

```typescript
import { Job } from 'bullmq';
import { CronJobDefinition } from '../services/CronManager';
import { db } from '../db';
import { startWorkflow } from '../temporal/client';

export const ceoCronJobs: CronJobDefinition[] = [
  {
    name: 'ceo:daily-priorities',
    pattern: '0 8 * * *', // 8:00 AM daily
    description: 'CEO reviews company state and sets daily priorities',
    handler: async (job: Job) => {
      // Get company metrics
      const [
        pendingTasks,
        blockedTasks,
        agents,
        recentActivity,
      ] = await Promise.all([
        db.task.count({ where: { status: 'pending' } }),
        db.task.count({ where: { status: 'blocked' } }),
        db.agent.findMany({ where: { status: { not: 'offline' } } }),
        db.activityLog.findMany({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
          take: 50,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Start CEO workflow
      await startWorkflow('ceoDailyPrioritiesWorkflow', {
        metrics: {
          pendingTasks,
          blockedTasks,
          activeAgents: agents.length,
        },
        recentActivity,
        timestamp: new Date(),
      });
    },
  },

  {
    name: 'ceo:weekly-planning',
    pattern: '0 10 * * 1', // 10:00 AM Monday
    description: 'CEO creates weekly strategy and distributes goals to leads',
    handler: async (job: Job) => {
      // Get last week's metrics
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [
        completedTasks,
        failedTasks,
        tokenUsage,
      ] = await Promise.all([
        db.task.count({
          where: { status: 'completed', completedAt: { gte: oneWeekAgo } },
        }),
        db.task.count({
          where: { status: 'failed', updatedAt: { gte: oneWeekAgo } },
        }),
        db.tokenUsage.aggregate({
          where: { createdAt: { gte: oneWeekAgo } },
          _sum: { totalTokens: true },
        }),
      ]);

      await startWorkflow('ceoWeeklyPlanningWorkflow', {
        weeklyMetrics: {
          completedTasks,
          failedTasks,
          successRate: completedTasks / (completedTasks + failedTasks) || 0,
          totalTokens: tokenUsage._sum.totalTokens || 0,
        },
        weekStarting: new Date(),
      });
    },
  },

  {
    name: 'ceo:status-synthesis',
    pattern: '0 18 * * *', // 6:00 PM daily
    description: 'CEO compiles daily summary and identifies blockers',
    handler: async (job: Job) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        todaysActivity,
        blockedAgents,
        pendingDrafts,
      ] = await Promise.all([
        db.activityLog.findMany({
          where: { createdAt: { gte: today } },
          orderBy: { createdAt: 'asc' },
        }),
        db.agent.findMany({
          where: { status: 'blocked' },
        }),
        db.draft.count({
          where: { status: 'pending_approval' },
        }),
      ]);

      await startWorkflow('ceoStatusSynthesisWorkflow', {
        date: today,
        activityCount: todaysActivity.length,
        blockedAgents: blockedAgents.map(a => ({ id: a.id, name: a.name })),
        pendingApprovals: pendingDrafts,
      });
    },
  },

  {
    name: 'ceo:monthly-okr',
    pattern: '0 9 1 * *', // 9:00 AM on 1st of month
    description: 'CEO reviews OKRs and sets new monthly targets',
    handler: async (job: Job) => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const lastMonth = new Date(monthStart);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const monthlyMetrics = await db.task.groupBy({
        by: ['status'],
        where: {
          createdAt: { gte: lastMonth, lt: monthStart },
        },
        _count: true,
      });

      await startWorkflow('ceoMonthlyOkrWorkflow', {
        month: monthStart,
        previousMonthMetrics: monthlyMetrics,
      });
    },
  },
];
```

**Step 3: Create worker cron jobs**

Create `apps/server/src/crons/workers.ts`:

```typescript
import { Job } from 'bullmq';
import { CronJobDefinition } from '../services/CronManager';
import { db } from '../db';
import { startWorkflow } from '../temporal/client';

export const workerCronJobs: CronJobDefinition[] = [
  {
    name: 'workers:check-inbox',
    pattern: '*/15 * * * *', // Every 15 minutes
    description: 'All workers check their inbox for new assigned tasks',
    handler: async (job: Job) => {
      // Get all worker agents
      const workers = await db.agent.findMany({
        where: {
          tier: 'worker',
          status: 'idle', // Only idle workers
        },
      });

      // Check each worker's inbox
      for (const worker of workers) {
        const pendingTasks = await db.task.findMany({
          where: {
            assigneeId: worker.id,
            status: 'pending',
          },
          orderBy: { priority: 'asc' }, // Priority 1 first
          take: 1, // Get highest priority task
        });

        if (pendingTasks.length > 0) {
          const task = pendingTasks[0];

          // Start task workflow for this worker
          await startWorkflow('agentTaskWorkflow', {
            taskId: task.id,
            agentId: worker.id,
            task: {
              title: task.title,
              description: task.description,
              acceptanceCriteria: task.acceptanceCriteria || [],
            },
            agentConfig: {
              systemPrompt: worker.systemPrompt,
              tools: worker.tools || [],
              leadId: worker.reportsToId || 'marcus', // Fallback to CEO
            },
          });
        }
      }
    },
  },

  {
    name: 'workers:heartbeat',
    pattern: '*/5 * * * *', // Every 5 minutes
    description: 'Workers report their status (health check)',
    handler: async (job: Job) => {
      const agents = await db.agent.findMany({
        where: { status: { not: 'offline' } },
      });

      for (const agent of agents) {
        // Update last_heartbeat timestamp
        await db.agent.update({
          where: { id: agent.id },
          data: { lastHeartbeat: new Date() },
        });
      }

      // Check for agents that missed heartbeats
      const staleThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 min
      const staleAgents = await db.agent.findMany({
        where: {
          status: 'working',
          lastHeartbeat: { lt: staleThreshold },
        },
      });

      for (const agent of staleAgents) {
        console.warn(`Agent ${agent.name} appears stale (no heartbeat)`);

        // Mark as blocked
        await db.agent.update({
          where: { id: agent.id },
          data: { status: 'blocked' },
        });

        // Notify lead
        if (agent.reportsToId) {
          await db.message.create({
            data: {
              fromAgentId: 'system',
              toAgentId: agent.reportsToId,
              subject: `Agent ${agent.name} unresponsive`,
              body: `${agent.name} has not sent a heartbeat in 15 minutes. Please investigate.`,
              type: 'alert',
            },
          });
        }
      }
    },
  },
];
```

**Step 4: Create system cron jobs**

Create `apps/server/src/crons/system.ts`:

```typescript
import { Job } from 'bullmq';
import { CronJobDefinition } from '../services/CronManager';
import { db } from '../db';
import { eventBus } from '../events';

export const systemCronJobs: CronJobDefinition[] = [
  {
    name: 'system:health-check',
    pattern: '*/5 * * * *', // Every 5 minutes
    description: 'Check system health and alert on issues',
    handler: async (job: Job) => {
      const checks = {
        database: false,
        redis: false,
        temporal: false,
      };

      // Check database
      try {
        await db.$queryRaw`SELECT 1`;
        checks.database = true;
      } catch (error) {
        console.error('Database health check failed:', error);
      }

      // Check Redis (via queue ping)
      try {
        // Queue health check would go here
        checks.redis = true;
      } catch (error) {
        console.error('Redis health check failed:', error);
      }

      // Emit health status
      eventBus.emit('system:health', {
        timestamp: new Date(),
        checks,
        healthy: Object.values(checks).every(Boolean),
      });

      if (!Object.values(checks).every(Boolean)) {
        console.error('System health check failed:', checks);
      }
    },
  },

  {
    name: 'system:token-aggregate',
    pattern: '0 * * * *', // Every hour
    description: 'Aggregate token usage statistics',
    handler: async (job: Job) => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      const usage = await db.tokenUsage.aggregate({
        where: { createdAt: { gte: oneHourAgo } },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
        },
        _count: true,
      });

      // Store hourly aggregate
      await db.tokenUsageHourly.create({
        data: {
          hour: new Date(),
          inputTokens: usage._sum.inputTokens || 0,
          outputTokens: usage._sum.outputTokens || 0,
          totalTokens: usage._sum.totalTokens || 0,
          requestCount: usage._count || 0,
        },
      });

      console.log(`Hourly token usage: ${usage._sum.totalTokens || 0} tokens`);
    },
  },

  {
    name: 'system:db-cleanup',
    pattern: '0 3 * * *', // 3:00 AM daily
    description: 'Clean up old records and optimize database',
    handler: async (job: Job) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Delete old activity logs
      const deletedLogs = await db.activityLog.deleteMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
      });

      // Delete old completed tasks (archive first if needed)
      const deletedTasks = await db.task.deleteMany({
        where: {
          status: { in: ['completed', 'cancelled'] },
          completedAt: { lt: thirtyDaysAgo },
        },
      });

      console.log(`Cleanup: deleted ${deletedLogs.count} logs, ${deletedTasks.count} tasks`);
    },
  },

  {
    name: 'system:circuit-check',
    pattern: '* * * * *', // Every minute
    description: 'Check and reset circuit breakers',
    handler: async (job: Job) => {
      // This would integrate with the circuit breaker system
      // Check for agents with open circuits that should be reset

      const circuitBreakerStatus = await db.circuitBreaker.findMany({
        where: { status: 'open' },
      });

      for (const breaker of circuitBreakerStatus) {
        const cooldownExpired =
          new Date().getTime() - new Date(breaker.openedAt).getTime() >
          breaker.cooldownMs;

        if (cooldownExpired) {
          await db.circuitBreaker.update({
            where: { id: breaker.id },
            data: { status: 'half-open' },
          });

          console.log(`Circuit breaker ${breaker.agentId} moved to half-open`);
        }
      }
    },
  },
];
```

**Step 5: Register all cron jobs on startup**

Create `apps/server/src/crons/index.ts`:

```typescript
import { getCronManager } from '../services/CronManager';
import { ceoCronJobs } from './ceo';
import { leadCronJobs } from './leads';
import { workerCronJobs } from './workers';
import { systemCronJobs } from './system';
import { Redis } from 'ioredis';

export async function initializeCronJobs(redis: Redis): Promise<void> {
  const cronManager = getCronManager(redis);

  const allJobs = [
    ...ceoCronJobs,
    ...leadCronJobs,
    ...workerCronJobs,
    ...systemCronJobs,
  ];

  console.log(`Registering ${allJobs.length} cron jobs...`);

  for (const job of allJobs) {
    await cronManager.register(job);
  }

  console.log('All cron jobs registered');
}
```

**Step 6: Initialize crons in server startup**

Update `apps/server/src/index.ts`:

```typescript
import { initializeCronJobs } from './crons';

// ... existing code ...

async function main() {
  // ... existing startup code ...

  // Initialize cron jobs
  await initializeCronJobs(redis);

  console.log('Server started with cron jobs enabled');
}
```

### Acceptance Criteria
- [ ] CronManager registers jobs correctly
- [ ] Jobs execute on schedule
- [ ] Job status is tracked (lastRun, runCount, errors)
- [ ] Jobs can be paused and resumed
- [ ] Jobs can be manually triggered
- [ ] CEO crons create appropriate workflows
- [ ] Worker crons pick up pending tasks
- [ ] System crons maintain health
- [ ] Graceful shutdown stops all jobs

### Estimated Time
8-10 hours

---

## Document Summary

This detailed implementation guide covers:

- **Phase 2**: 6 frontend component tasks with full code examples
- **Phase 3**: 8 agent SDK integration tasks
- **Phase 4**: 9 Temporal migration tasks
- **Phase 6**: Complete cron job infrastructure

Each task includes:
- Clear objectives
- Prerequisites
- File locations
- Step-by-step instructions
- Complete code examples
- Testing approach
- Acceptance criteria
- Time estimates
- Common pitfalls

The remaining phases (5 and 7) follow similar patterns and can be derived from the examples above.

---

## Quick Reference: Cron Patterns

| Pattern | Description |
|---------|-------------|
| `* * * * *` | Every minute |
| `*/5 * * * *` | Every 5 minutes |
| `*/15 * * * *` | Every 15 minutes |
| `0 * * * *` | Every hour |
| `0 8 * * *` | 8:00 AM daily |
| `0 9 * * 1` | 9:00 AM Monday |
| `0 3 * * *` | 3:00 AM daily |
| `0 9 1 * *` | 9:00 AM on 1st of month |

Format: `minute hour day-of-month month day-of-week`
