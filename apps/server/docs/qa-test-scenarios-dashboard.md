# Claude Code Dashboard - QA Test Scenarios

**Test Plan ID:** QA-DASHBOARD-001
**Created by:** qa-2
**Date:** 2026-01-27
**Status:** Draft - Awaiting Dashboard Implementation

---

## 1. EXPLORATORY TESTING SCENARIOS

### 1.1 Agent Visualization Testing

#### 1.1.1 Speech Bubbles Display
**Objective:** Verify speech bubbles render correctly with agent communications

**Test Scenarios:**
- **TC-VIS-001:** Agent idle state - no speech bubble displayed
- **TC-VIS-002:** Agent starts task - speech bubble appears with task name
- **TC-VIS-003:** Agent sends message - speech bubble shows message preview
- **TC-VIS-004:** Multiple agents speaking - bubbles don't overlap inappropriately
- **TC-VIS-005:** Long message text - bubble truncates with ellipsis
- **TC-VIS-006:** Speech bubble auto-dismiss after timeout
- **TC-VIS-007:** Click on speech bubble - opens detail view

**Edge Cases:**
- Empty/null message content
- Special characters in messages (emojis, unicode)
- Extremely long agent names
- Rapid consecutive messages (stress bubble rendering)

#### 1.1.2 Agent State Transitions
**Objective:** Verify visual state changes as agents transition between statuses

**Test Scenarios:**
- **TC-STATE-001:** idle → working transition (green → yellow)
- **TC-STATE-002:** working → idle transition (yellow → green)
- **TC-STATE-003:** working → blocked transition (yellow → red)
- **TC-STATE-004:** blocked → working transition (red → yellow)
- **TC-STATE-005:** working → offline transition (yellow → gray)
- **TC-STATE-006:** Verify status badge color matches agent sprite color
- **TC-STATE-007:** Verify status text updates in AgentPanel
- **TC-STATE-008:** Multiple simultaneous state changes

**Edge Cases:**
- Rapid state flipping (working → idle → working in <1 sec)
- State change while agent selected in panel
- State change while task assignment modal open
- Missing status field in WebSocket event

### 1.2 Activity Stream Testing

#### 1.2.1 Activity Display and Ordering
**Objective:** Verify activity feed displays events in correct order

**Test Scenarios:**
- **TC-ACT-001:** New activity appears at top of feed
- **TC-ACT-002:** Activities display in reverse chronological order
- **TC-ACT-003:** Activity timestamp formatting (HH:MM:SS)
- **TC-ACT-004:** Agent name displays correctly for each activity
- **TC-ACT-005:** Activity icons match event types correctly
- **TC-ACT-006:** Activity colors match event types (green=completed, red=failed, etc.)
- **TC-ACT-007:** "No activity yet" message when feed empty
- **TC-ACT-008:** Feed auto-scrolls to show newest activity
- **TC-ACT-009:** Feed retains last 50 activities (store limit)
- **TC-ACT-010:** Scrolling performance with 50+ activities

**Event Types to Test:**
- task_started (▶ yellow)
- task_completed (✓ green)
- task_failed (✗ red)
- message_sent (✉ blue)
- draft_created (📝 purple)
- Unknown event types (• gray)

#### 1.2.2 Activity Filtering
**Objective:** Verify filtering and search capabilities (if implemented)

**Test Scenarios:**
- **TC-FILTER-001:** Filter by agent
- **TC-FILTER-002:** Filter by event type
- **TC-FILTER-003:** Filter by time range
- **TC-FILTER-004:** Clear all filters
- **TC-FILTER-005:** Multiple filters combined

**Edge Cases:**
- Filter with no matching results
- Filter while new activities streaming in
- Filter reset on page refresh

### 1.3 Task Queue Testing

#### 1.3.1 Task Display and Updates
**Objective:** Verify task queue displays and updates correctly

**Test Scenarios:**
- **TC-TASK-001:** New task appears in queue
- **TC-TASK-002:** Task status badge updates (pending → in_progress → completed)
- **TC-TASK-003:** Task priority badge displays correct color
- **TC-TASK-004:** Progress bar displays for in_progress tasks
- **TC-TASK-005:** Progress percentage updates in real-time
- **TC-TASK-006:** Completed tasks removed from queue
- **TC-TASK-007:** Failed tasks remain visible with error indicator
- **TC-TASK-008:** "No active tasks" message when queue empty
- **TC-TASK-009:** Queue displays max 8 tasks (UI limit)

**Priority Colors:**
- Low: gray (bg-gray-700, text-gray-400)
- Normal: blue (bg-blue-900, text-blue-400)
- High: yellow (bg-yellow-900, text-yellow-400)
- Urgent: red (bg-red-900, text-red-400)

**Status Colors:**
- pending: gray
- in_progress: yellow
- blocked: red
- completed: green
- failed: dark red
- cancelled: dark gray

#### 1.3.2 Task Assignment Flow
**Objective:** Verify task assignment workflow from UI

**Test Scenarios:**
- **TC-ASSIGN-001:** Select agent → agent panel opens
- **TC-ASSIGN-002:** Enter task title → title field updates
- **TC-ASSIGN-003:** Enter task description → description field updates
- **TC-ASSIGN-004:** Select priority → priority button highlights
- **TC-ASSIGN-005:** Click "Assign Task" → task created successfully
- **TC-ASSIGN-006:** Success feedback → form clears
- **TC-ASSIGN-007:** Error handling → error message displays
- **TC-ASSIGN-008:** Loading state → button shows spinner
- **TC-ASSIGN-009:** Disable form during submission
- **TC-ASSIGN-010:** Assign button disabled with empty title

**Validation:**
- Empty title blocks submission
- Description is optional
- Priority defaults to "normal"
- Agent must be selected

### 1.4 Draft Approval Testing

#### 1.4.1 Draft Display
**Objective:** Verify pending drafts display correctly

**Test Scenarios:**
- **TC-DRAFT-001:** New draft appears in pending approvals section
- **TC-DRAFT-002:** Draft count badge updates
- **TC-DRAFT-003:** Draft subject displays truncated if long
- **TC-DRAFT-004:** Draft body truncates with ellipsis
- **TC-DRAFT-005:** External recipient email displays
- **TC-DRAFT-006:** Approval section highlighted (yellow border)

#### 1.4.2 Draft Approval Flow
**Objective:** Verify draft approval/rejection workflow

**Test Scenarios:**
- **TC-APPROVE-001:** Click "Approve" → confirmation feedback
- **TC-APPROVE-002:** Click "Approve" → draft removed from pending list
- **TC-APPROVE-003:** Click "Approve" → email sent via EmailService
- **TC-APPROVE-004:** Click "Reject" → rejection feedback
- **TC-APPROVE-005:** Click "Reject" → draft removed from pending list
- **TC-APPROVE-006:** Multiple drafts → approve/reject independently

**Error Scenarios:**
- Approve fails (email service down)
- Network error during approval
- Draft already approved/rejected by another session

### 1.5 Budget Display Testing

#### 1.5.1 Budget Visualization
**Objective:** Verify budget tracking displays correctly

**Test Scenarios:**
- **TC-BUDGET-001:** Remaining budget displays with 2 decimal places
- **TC-BUDGET-002:** Budget limit displays correctly
- **TC-BUDGET-003:** Progress bar width reflects remaining/limit ratio
- **TC-BUDGET-004:** Progress bar color (corp-highlight)
- **TC-BUDGET-005:** Budget updates in real-time as tasks consume budget
- **TC-BUDGET-006:** Budget depleted (0.00) state
- **TC-BUDGET-007:** Budget over limit (negative) state handling

**Edge Cases:**
- Budget exactly 0.00
- Budget negative (overdraft)
- Budget exceeds 999.99
- Budget with fractional cents

---

## 2. CROSS-BROWSER TESTING

### 2.1 Browser Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|--------|---------|--------|------|-------|
| WebSocket connection | ✓ | ✓ | ✓ | ✓ | Test reconnection |
| Real-time updates | ✓ | ✓ | ✓ | ✓ | Verify latency |
| CSS rendering | ✓ | ✓ | ✓ | ✓ | Tailwind classes |
| Speech bubbles | ✓ | ✓ | ✓ | ✓ | SVG rendering |
| Form inputs | ✓ | ✓ | ✓ | ✓ | Auto-complete |
| Scroll behavior | ✓ | ✓ | ✓ | ✓ | Activity feed |

### 2.2 Browser-Specific Test Cases

**Chrome (Latest)**
- **TC-CHROME-001:** WebSocket DevTools inspection works
- **TC-CHROME-002:** Performance profiling shows no memory leaks

**Firefox (Latest)**
- **TC-FF-001:** CSS Grid layout renders correctly
- **TC-FF-002:** WebSocket connection stable

**Safari (Latest)**
- **TC-SAFARI-001:** Webkit-specific CSS works
- **TC-SAFARI-002:** Date formatting displays correctly
- **TC-SAFARI-003:** Form validation works

**Edge (Latest)**
- **TC-EDGE-001:** Chromium-based features work
- **TC-EDGE-002:** Performance comparable to Chrome

---

## 3. PERFORMANCE TESTING SCENARIOS

### 3.1 WebSocket Load Testing

#### 3.1.1 Connection Stress Test
**Objective:** Verify system handles many simultaneous WebSocket connections

**Test Scenarios:**
- **TC-PERF-001:** 10 concurrent connections - baseline
- **TC-PERF-002:** 50 concurrent connections - normal load
- **TC-PERF-003:** 100 concurrent connections - high load
- **TC-PERF-004:** 500 concurrent connections - stress test
- **TC-PERF-005:** 1000 concurrent connections - breaking point

**Metrics to Measure:**
- Connection establishment time (< 500ms target)
- Connection success rate (> 99.5% target)
- Memory usage per connection (< 5MB target)
- CPU usage under load (< 80% target)
- Redis adapter overhead

**Tools:**
- Artillery.io for load generation
- Custom Node.js script with socket.io-client
- Docker stats for resource monitoring

#### 3.1.2 Event Throughput Testing
**Objective:** Verify system handles high event throughput

**Test Scenarios:**
- **TC-PERF-010:** 100 events/second - baseline
- **TC-PERF-011:** 500 events/second - normal load
- **TC-PERF-012:** 1000 events/second - high load
- **TC-PERF-013:** 5000 events/second - stress test
- **TC-PERF-014:** Burst traffic (0 → 1000 events/sec spike)

**Event Types to Test:**
- AGENT_STATUS updates
- TASK_PROGRESS updates
- MESSAGE_NEW events
- ACTIVITY_LOG events

**Metrics to Measure:**
- Event processing latency (< 100ms p95 target)
- Event delivery latency (< 200ms p95 target)
- Event loss rate (0% target)
- Queue backlog size
- Redis Streams lag

### 3.2 UI Rendering Performance

#### 3.2.1 Agent Rendering Stress Test
**Objective:** Verify UI performance with many agents

**Test Scenarios:**
- **TC-PERF-020:** 10 agents rendering - baseline
- **TC-PERF-021:** 25 agents rendering - normal load
- **TC-PERF-022:** 50 agents rendering - high load
- **TC-PERF-023:** 100 agents rendering - stress test
- **TC-PERF-024:** Agent state updates with 50 agents active

**Metrics to Measure:**
- Initial render time (< 1000ms target)
- Frame rate (> 30 FPS target)
- React re-render count
- Virtual DOM diff time
- Memory usage (< 500MB target)

**Tools:**
- React DevTools Profiler
- Chrome Performance tab
- Lighthouse performance audit

#### 3.2.2 Activity Feed Performance
**Objective:** Verify activity feed performance with many events

**Test Scenarios:**
- **TC-PERF-030:** 50 activities (store limit) - baseline
- **TC-PERF-031:** Rapid activity additions (10/second)
- **TC-PERF-032:** Scroll performance with full feed
- **TC-PERF-033:** Auto-scroll performance

**Metrics to Measure:**
- Scroll FPS (> 30 FPS target)
- Activity render time (< 50ms per activity target)
- Memory usage for 50 activities (< 50MB target)

#### 3.2.3 Task Queue Performance
**Objective:** Verify task queue performance under load

**Test Scenarios:**
- **TC-PERF-040:** 100 tasks in queue - baseline
- **TC-PERF-041:** Task status updates (10/second)
- **TC-PERF-042:** Progress bar animations (smooth at 60 FPS)
- **TC-PERF-043:** Queue filtering/sorting performance

**Metrics to Measure:**
- Queue render time (< 500ms target)
- Update latency (< 100ms target)
- Animation frame rate (> 30 FPS target)

### 3.3 Memory Leak Detection

#### 3.3.1 Extended Session Testing
**Objective:** Detect memory leaks during extended usage

**Test Scenarios:**
- **TC-PERF-050:** 1-hour session with continuous activity
- **TC-PERF-051:** 4-hour session with continuous activity
- **TC-PERF-052:** 24-hour session (automated)
- **TC-PERF-053:** Repeated connect/disconnect cycles

**Metrics to Measure:**
- Heap size over time (should stabilize)
- WebSocket connection leaks
- Event listener leaks
- React component unmount cleanup
- Zustand store memory usage

**Tools:**
- Chrome DevTools Memory Profiler
- Heap snapshots at intervals
- Memory timeline recording

---

## 4. SECURITY VALIDATION TESTING

### 4.1 Input Validation Testing (from Task #7 findings)

#### 4.1.1 WebSocket Event Validation
**Objective:** Verify all WebSocket inputs are validated

**Test Scenarios:**
- **TC-SEC-001:** Send malformed JSON → server rejects
- **TC-SEC-002:** Send oversized payload (>1MB) → server rejects
- **TC-SEC-003:** Send XSS payload in task title → sanitized
- **TC-SEC-004:** Send XSS payload in task description → sanitized
- **TC-SEC-005:** Send XSS payload in message body → sanitized
- **TC-SEC-006:** Send SQL injection in filters → escaped
- **TC-SEC-007:** Send script tags in agent name → stripped
- **TC-SEC-008:** Send null/undefined in required fields → validation error

**XSS Payloads to Test:**
```
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<iframe src="javascript:alert('XSS')"></iframe>
```

#### 4.1.2 Draft Approval Security
**Objective:** Verify draft approval cannot be bypassed

**Test Scenarios:**
- **TC-SEC-010:** Approve non-existent draft → error
- **TC-SEC-011:** Approve already approved draft → error
- **TC-SEC-012:** Approve draft without authentication → rejected
- **TC-SEC-013:** Reject draft with malicious reason → sanitized

### 4.2 Authorization Testing

#### 4.2.1 WebSocket Authorization
**Objective:** Verify authorization controls on WebSocket events

**Test Scenarios:**
- **TC-SEC-020:** Assign task to non-existent agent → error
- **TC-SEC-021:** Send message to non-existent agent → error
- **TC-SEC-022:** Approve draft for another user → rejected (if multi-user)
- **TC-SEC-023:** Modify another user's game state → rejected

### 4.3 Data Sanitization Testing

#### 4.3.1 Output Encoding
**Objective:** Verify data sanitized before rendering

**Test Scenarios:**
- **TC-SEC-030:** HTML entities in agent names → encoded
- **TC-SEC-031:** Special characters in task descriptions → encoded
- **TC-SEC-032:** URLs in message bodies → safe rendering
- **TC-SEC-033:** JSON in activity event data → safe parsing

---

## 5. EDGE CASES AND ERROR SCENARIOS

### 5.1 Network Failure Scenarios

**Test Scenarios:**
- **TC-EDGE-001:** WebSocket disconnects → UI shows disconnected state
- **TC-EDGE-002:** WebSocket reconnects → UI syncs state
- **TC-EDGE-003:** Slow network (throttle to 3G) → graceful degradation
- **TC-EDGE-004:** API timeout → error message displays
- **TC-EDGE-005:** Partial data received → error handling

### 5.2 Data Consistency Scenarios

**Test Scenarios:**
- **TC-EDGE-010:** Agent deleted mid-task → UI updates correctly
- **TC-EDGE-011:** Task deleted while viewing → graceful handling
- **TC-EDGE-012:** Duplicate WebSocket events → deduplicated
- **TC-EDGE-013:** Out-of-order events → correct final state
- **TC-EDGE-014:** Conflicting state updates → last-write-wins

### 5.3 Boundary Value Testing

**Test Scenarios:**
- **TC-EDGE-020:** Task title exactly 255 characters
- **TC-EDGE-021:** Task description 10,000 characters
- **TC-EDGE-022:** Agent with 0 capabilities
- **TC-EDGE-023:** Agent with 100 capabilities
- **TC-EDGE-024:** Budget exactly 0.00
- **TC-EDGE-025:** Progress percentage exactly 100%

---

## 6. TEST EXECUTION PLAN

### 6.1 Testing Phases

**Phase 1: Smoke Testing (Day 1)**
- Basic UI rendering
- WebSocket connection
- Task assignment flow
- Draft approval flow

**Phase 2: Functional Testing (Days 2-3)**
- All exploratory test scenarios
- Cross-browser compatibility
- Edge cases

**Phase 3: Performance Testing (Days 4-5)**
- Load testing
- Memory leak detection
- UI performance profiling

**Phase 4: Security Testing (Day 6)**
- Input validation
- Authorization checks
- XSS/injection testing

**Phase 5: Regression Testing (Day 7)**
- Re-test all critical paths
- Verify bug fixes
- Final acceptance testing

### 6.2 Testing Tools and Setup

**Manual Testing:**
- Chrome DevTools
- React DevTools
- WebSocket inspection tools

**Automated Testing:**
- Vitest for unit tests
- Playwright for E2E tests
- Artillery for load testing

**Performance Testing:**
- Lighthouse CI
- Chrome Performance Profiler
- Custom Node.js scripts

---

## 7. DEFECT REPORTING TEMPLATE

### Defect Report Format

**Bug ID:** BUG-XXX
**Severity:** Critical / High / Medium / Low
**Component:** Dashboard / WebSocket / Agent / Task / etc.
**Environment:** Browser version, OS, network conditions

**Summary:**
One-line description of the issue

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Screenshots/Videos:**
[Attach evidence]

**Reproduction Rate:**
100% / Intermittent / Rare

**Logs:**
```
[Relevant console logs]
```

**Impact:**
Description of user impact

---

## 8. ACCEPTANCE CRITERIA

### 8.1 Functional Acceptance
- [ ] All UI components render correctly
- [ ] Real-time updates work reliably
- [ ] Task assignment flow works end-to-end
- [ ] Draft approval flow works end-to-end
- [ ] Activity feed displays correctly
- [ ] Budget tracking accurate

### 8.2 Performance Acceptance
- [ ] WebSocket connection < 500ms
- [ ] Event delivery latency p95 < 200ms
- [ ] UI frame rate > 30 FPS
- [ ] No memory leaks in 4-hour session
- [ ] Handles 100 concurrent connections
- [ ] Handles 1000 events/second

### 8.3 Security Acceptance
- [ ] All inputs validated
- [ ] XSS payloads sanitized
- [ ] Authorization enforced
- [ ] Secure WebSocket (wss://) in production

### 8.4 Cross-Browser Acceptance
- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Works in Edge (latest)

---

## 9. TEST EXECUTION LOG

| Test ID | Description | Status | Date | Notes |
|---------|-------------|--------|------|-------|
| - | Awaiting dashboard implementation | Blocked | 2026-01-27 | Task #2 in progress |

---

**Document Status:** Draft - Ready for Review
**Next Steps:** Await completion of Task #2 (Claude Code hooks integration) to begin test execution
