# UX Specifications: Kanban Task Board

**Feature:** Real-time Kanban Task Board for Claude Code Dashboard
**Designer:** product-1
**Date:** 2026-01-27
**Status:** Ready for Implementation

---

## Executive Summary

A drag-and-drop Kanban board that provides real-time visualization and management of tasks from `~/.claude/tasks/{team}/` directory. The board enables bidirectional sync between UI interactions and file system, allowing users to manage agent tasks visually while maintaining file-based task storage.

---

## User Stories

### US-1: View All Tasks in Kanban Layout
**As a** team lead
**I want to** see all tasks organized by status in column layout
**So that** I can quickly understand task distribution and team progress

**Acceptance Criteria:**
- Tasks are displayed in columns: Pending, In Progress, Completed
- Each column shows task count in header
- Tasks are sorted by priority (urgent → high → normal → low) within each column
- Empty columns display "No tasks" placeholder
- Board loads within 500ms with up to 100 tasks

### US-2: Drag Task to Change Status
**As a** team lead
**I want to** drag tasks between columns
**So that** I can update task status quickly without manual file editing

**Acceptance Criteria:**
- Tasks can be dragged from any column to any other column
- Visual feedback: task card elevates with shadow during drag
- Drop zone highlights when dragging over valid column
- Status updates persist to task file immediately
- Optimistic UI update (instant feedback, sync in background)
- Rollback if file write fails with error notification

### US-3: View Task Dependencies
**As a** team lead
**I want to** see which tasks are blocked or blocking others
**So that** I can identify and resolve bottlenecks

**Acceptance Criteria:**
- Blocked tasks show "🔒 Blocked by {count}" badge
- Clicking blocked badge expands to show dependency list
- Blocking tasks show "⛓️ Blocks {count}" indicator
- Dependencies are color-coded: red for blocking, yellow for dependencies
- Hovering over dependency shows related task title in tooltip

### US-4: Filter Tasks by Team and Agent
**As a** team lead managing multiple teams
**I want to** filter tasks by team or specific agent
**So that** I can focus on relevant work

**Acceptance Criteria:**
- Filter bar above board with dropdowns: Team, Agent, Status
- "All" option available for each filter
- Filters can be combined (e.g., Team A + Agent Sable + In Progress)
- Filter state persists in URL query params for sharing
- Clear filters button visible when any filter is active
- Filter changes update board within 200ms

### US-5: Real-time Sync with Agent Updates
**As a** team lead
**I want to** see task updates made by agents in real-time
**So that** I stay informed without manual refreshing

**Acceptance Criteria:**
- Task card updates automatically when agent modifies task file
- New tasks appear in appropriate column within 1 second
- Status changes animate (card moves between columns smoothly)
- Progress percentage updates live for in-progress tasks
- Visual pulse/highlight effect on updated cards (fades after 2 seconds)

### US-6: View Task Details in Modal
**As a** team lead
**I want to** click a task card to see full details
**So that** I can review complete task information

**Acceptance Criteria:**
- Clicking task card opens modal overlay
- Modal shows: title, description, assignee, status, priority, dependencies, timestamps
- Edit mode: inline edit for title, description, priority
- Save button updates task file
- Close modal with X button, Escape key, or click outside
- Modal supports keyboard navigation

---

## Visual Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Kanban Task Board                          [Filter Bar]    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐           │
│  │ PENDING   │    │IN PROGRESS│    │ COMPLETED │           │
│  │   (12)    │    │    (5)    │    │    (43)   │           │
│  ├───────────┤    ├───────────┤    ├───────────┤           │
│  │┌─────────┐│    │┌─────────┐│    │┌─────────┐│           │
│  ││Task Card││    ││Task Card││    ││Task Card││           │
│  │└─────────┘│    │└─────────┘│    │└─────────┘│           │
│  │┌─────────┐│    │┌─────────┐│    │┌─────────┐│           │
│  ││Task Card││    ││Task Card││    ││Task Card││           │
│  │└─────────┘│    │└─────────┘│    │└─────────┘│           │
│  │    ...    │    │    ...    │    │    ...    │           │
│  └───────────┘    └───────────┘    └───────────┘           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Task Card Design

**Standard Card (160px × 120px minimum)**
```
┌─────────────────────────────────┐
│ 🔴 URGENT          Sable Chen   │  ← Priority badge + Assignee
├─────────────────────────────────┤
│ Fix authentication bug in lo... │  ← Title (truncated)
│                                  │
│ 🔒 Blocked by 2                 │  ← Dependency indicator
│ ⛓️ Blocks 1                     │
│                                  │
│ Started: 2h ago                 │  ← Time metadata
└─────────────────────────────────┘
```

**Priority Color System:**
- 🔴 Urgent: Red border + red badge
- 🟡 High: Yellow border + yellow badge
- 🔵 Normal: Blue border + blue badge
- ⚪ Low: Gray border + gray badge

### Filter Bar Design

```
┌─────────────────────────────────────────────────────────────┐
│ [🔽 All Teams ▾]  [🔽 All Agents ▾]  [🔽 All Statuses ▾]  │
│                                            [× Clear Filters] │
└─────────────────────────────────────────────────────────────┘
```

---

## Interaction Specifications

### Drag and Drop Behavior

**States:**
1. **Idle**: Task card at rest, subtle shadow, cursor: grab
2. **Drag Start**: Card lifts (z-index +10), larger shadow, opacity 0.9, cursor: grabbing
3. **Dragging Over Valid Column**: Column background highlights (green tint), dashed border
4. **Dragging Over Invalid Column**: No visual change (all columns valid)
5. **Drop**: Card animates to new position (300ms ease-out), status updates
6. **Drop Cancel (ESC key)**: Card animates back to origin (200ms)

**Edge Cases:**
- **Drag outside board**: Card snaps back to origin
- **Concurrent update**: If task status changes during drag, show notification "Task updated by {agent}, refreshing..."
- **Failed save**: Show error toast "Failed to update task", revert to original column

### Real-time Sync Behavior

**WebSocket Events:**
- `task:created` → Insert card with fade-in animation
- `task:updated` → Update card with pulse effect
- `task:status_changed` → Move card between columns (slide animation)
- `task:deleted` → Fade out and remove card

**Conflict Resolution:**
- User drag takes precedence over simultaneous agent update
- After user drop completes, check for conflicts
- If conflict detected, show merge dialog: "Task was updated during your change. Keep your version or reload?"

### Progress Indicator

For tasks with `status: "in_progress"` and `progressPercent > 0`:
- Show horizontal progress bar below title
- Color: gradient yellow → green
- Update smoothly (CSS transition: 500ms)
- Display percentage: "42%" next to bar

---

## Data Model Requirements

### Task Card Display Fields

**Required Fields (from task file):**
```typescript
{
  id: string              // Unique identifier
  title: string           // Display as card header
  status: TaskStatus      // Determines column placement
  priority: TaskPriority  // For color coding and sort order
  agentId: string         // Map to agent name for display
  createdAt: Date         // For "Started X ago" display
  blockedBy: string[]     // Array of task IDs blocking this task
  blocks: string[]        // Array of task IDs this task blocks
}
```

**Optional Fields:**
```typescript
{
  description: string     // Show in detail modal
  progressPercent: number // Show progress bar if > 0
  deadline: Date          // Show countdown if set
  startedAt: Date         // Calculate duration
  completedAt: Date       // Show completion time
}
```

### File System Integration

**Read Operations:**
- On mount: Read all task files from `~/.claude/tasks/{team}/`
- Parse task JSON files
- Build dependency graph from `blockedBy` relationships

**Write Operations:**
- On drag drop: Update task file `status` field
- Optimistic UI update before write
- Handle write failures gracefully

**Watch Operations:**
- Monitor task directory for file changes (fs.watch)
- Debounce rapid changes (300ms)
- Trigger re-render on external changes

---

## Error States

### Network/File System Errors

**Failed to Load Tasks:**
```
┌─────────────────────────────────────┐
│  ⚠️ Failed to load tasks            │
│                                      │
│  Could not read task directory:     │
│  ~/.claude/tasks/team-alpha/        │
│                                      │
│  [Retry] [Check Permissions]        │
└─────────────────────────────────────┘
```

**Failed to Update Task:**
- Toast notification (bottom-right, 5 seconds)
- Message: "Failed to update task: {error message}"
- Card reverts to original column
- Retry button in toast

### Empty States

**No Tasks in Column:**
```
┌───────────┐
│ PENDING   │
│   (0)     │
├───────────┤
│           │
│  No tasks │
│  in queue │
│           │
└───────────┘
```

**All Tasks Filtered Out:**
```
┌─────────────────────────────────────┐
│  🔍 No tasks match current filters  │
│                                      │
│  Try adjusting your filter settings │
│  or [Clear Filters]                 │
└─────────────────────────────────────┘
```

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load (100 tasks) | < 500ms | Time to render all cards |
| Filter response | < 200ms | Time to re-render filtered view |
| Drag feedback | < 16ms | Frame time during drag (60 FPS) |
| WebSocket update | < 1s | Time from event to UI update |
| Drag to file write | < 2s | Time from drop to file persisted |

---

## Accessibility

- **Keyboard Navigation:**
  - Tab: Focus next card
  - Shift+Tab: Focus previous card
  - Enter: Open task detail modal
  - Arrow keys: Navigate between cards
  - Space: Select card for keyboard move
  - Escape: Cancel drag or close modal

- **Screen Readers:**
  - All cards have aria-labels: "{priority} task: {title}, assigned to {agent}, status: {status}"
  - Columns have aria-labels: "{status} column, {count} tasks"
  - Drag actions announced: "Moved task {title} to {status}"

- **Visual:**
  - High contrast mode support
  - Color blind friendly (not relying solely on color)
  - Text minimum 12px, labels 14px
  - Touch targets minimum 44×44px

---

## Technical Implementation Notes

### Component Structure
```
<KanbanBoard>
  <FilterBar />
  <BoardColumns>
    <Column status="pending">
      <TaskCard /> (draggable)
      <TaskCard />
    </Column>
    <Column status="in_progress">
      <TaskCard />
    </Column>
    <Column status="completed">
      <TaskCard />
    </Column>
  </BoardColumns>
  <TaskDetailModal />
</KanbanBoard>
```

### State Management
- Use Zustand store (existing pattern in gameStore.ts)
- Add kanban-specific slice: filters, selected task, drag state
- Subscribe to WebSocket task events for real-time updates

### Drag & Drop Library
- Recommend: `@dnd-kit/core` (modern, accessible, performant)
- Alternative: `react-beautiful-dnd` (mature, well-documented)

### File System Sync
- Server-side: Use `chokidar` to watch task directory
- Emit WebSocket events on file changes
- Client receives updates via existing socket connection

---

## Success Metrics

**User Engagement:**
- % of users who interact with Kanban board daily
- Average time spent on Kanban view vs. list view
- Number of drag-drop actions per session

**Performance:**
- Board load time < 500ms for 95th percentile
- Zero janky drag interactions (60 FPS maintained)
- Sync latency < 1 second for 99th percentile

**Usability:**
- Task completion rate increases by 20%
- Reduced time to identify blocked tasks by 50%
- User satisfaction score > 8/10

---

## Future Enhancements (Out of Scope for v1)

- Multi-select drag (drag multiple cards at once)
- Swimlanes (group by agent or team)
- Custom column ordering
- Kanban board templates
- Export board as image/PDF
- Task time tracking visualization
- Bulk actions (multi-select + bulk status change)
