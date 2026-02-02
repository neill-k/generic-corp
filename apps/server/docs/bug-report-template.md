# Bug Report Template

Use this template for reporting bugs found during QA testing.

---

## Bug ID: BUG-XXX

**Date Reported:** YYYY-MM-DD
**Reported By:** qa-2 (QA Engineer)
**Assigned To:** [Developer Name]
**Status:** Open | In Progress | Fixed | Closed | Won't Fix

---

## Summary
[One-line description of the issue]

---

## Severity
- [ ] **Critical** - System crash, data loss, security vulnerability
- [ ] **High** - Major feature broken, no workaround
- [ ] **Medium** - Feature partially broken, workaround exists
- [ ] **Low** - Minor issue, cosmetic, typo

---

## Priority
- [ ] **P0** - Blocks release, fix immediately
- [ ] **P1** - Must fix before release
- [ ] **P2** - Should fix before release
- [ ] **P3** - Nice to have, can defer

---

## Component
- [ ] Dashboard UI
- [ ] WebSocket
- [ ] Agent System
- [ ] Task Queue
- [ ] Activity Feed
- [ ] Message Center
- [ ] Draft Approval
- [ ] Budget Tracking
- [ ] Database
- [ ] API
- [ ] Other: __________

---

## Environment
**Server Version:** [e.g., v1.0.0]
**Browser:** [e.g., Chrome 120.0.6099.129]
**OS:** [e.g., macOS 14.2, Windows 11, Linux Ubuntu 22.04]
**Network:** [e.g., Local, High-speed, 3G throttled]
**Database:** [e.g., PostgreSQL 15.3]
**Redis:** [e.g., Redis 7.2]

---

## Steps to Reproduce

1. Step 1 with specific details
2. Step 2 with specific details
3. Step 3 with specific details
4. ...

**Preconditions:**
- [Any setup required before reproducing]
- [Example: "Must have at least 5 agents in idle state"]

---

## Expected Result
[What should happen according to specs/requirements]

---

## Actual Result
[What actually happened]

---

## Reproduction Rate
- [ ] **100%** - Always reproduces
- [ ] **Frequent** - Reproduces >50% of the time
- [ ] **Intermittent** - Reproduces <50% of the time
- [ ] **Rare** - Hard to reproduce, <10% of the time

---

## Visual Evidence

### Screenshots
[Attach screenshots showing the issue]

### Video Recording
[Link to video recording if available]

### Console Logs
```
[Paste relevant console errors/warnings]
```

### Network Logs
```
[Paste relevant WebSocket messages or API responses]
```

---

## Technical Details

### Browser Console Errors
```javascript
// Paste JavaScript errors from console
```

### Server Logs
```
// Paste relevant server-side logs
```

### Database State
```sql
-- If relevant, show database queries or state
```

### WebSocket Events
```json
// If relevant, show WebSocket event payloads
```

---

## Impact Analysis

**User Impact:**
[Describe how this affects end users]

**Business Impact:**
[Describe business/product impact]

**Workaround Available:**
- [ ] Yes - [Describe workaround]
- [ ] No

---

## Root Cause Analysis (Optional)
[If known, describe the root cause]

**Affected Code:**
- File: `path/to/file.ts`
- Line: 123
- Function: `functionName()`

---

## Suggested Fix (Optional)
[If you have a suggestion for fixing the issue]

---

## Related Issues
- Related to BUG-XXX
- Duplicate of BUG-XXX
- Blocks BUG-XXX

---

## Test Cases to Add
[List any test cases that should be added to prevent regression]

1. TC-XXX-001: [Description]
2. TC-XXX-002: [Description]

---

## Notes
[Any additional information, context, or observations]

---

## Resolution

**Fix Description:**
[Describe how the bug was fixed]

**Fixed In Version:**
[e.g., v1.0.1]

**Fixed By:**
[Developer name]

**Date Fixed:**
YYYY-MM-DD

**Verification:**
- [ ] Fix verified by QA
- [ ] Regression tests passed
- [ ] Deployed to staging
- [ ] Deployed to production

---

# Example Bug Reports

## Example 1: Critical Bug

---

## Bug ID: BUG-001

**Date Reported:** 2026-01-27
**Reported By:** qa-2
**Assigned To:** backend-dev-1
**Status:** Open

---

## Summary
WebSocket connection fails when Redis is unavailable, causing complete dashboard failure

---

## Severity
- [x] **Critical** - System crash, data loss, security vulnerability

---

## Priority
- [x] **P0** - Blocks release, fix immediately

---

## Component
- [x] WebSocket
- [x] Dashboard UI

---

## Environment
**Server Version:** v1.0.0
**Browser:** Chrome 120.0.6099.129
**OS:** macOS 14.2
**Network:** Local
**Database:** PostgreSQL 15.3
**Redis:** Redis 7.2 (stopped)

---

## Steps to Reproduce

1. Start server with Redis running
2. Open dashboard in browser - connects successfully
3. Stop Redis service: `docker stop generic-corp-redis`
4. Refresh dashboard page
5. Observe connection failure

**Preconditions:**
- Server must be running
- Redis must be accessible initially, then stopped

---

## Expected Result
Dashboard should display a "Service temporarily unavailable" message and attempt to reconnect gracefully. Users should see a clear error message explaining the issue.

---

## Actual Result
Dashboard shows blank screen with no error message. Browser console shows:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
WebSocket connection failed
```

Server crashes with unhandled promise rejection.

---

## Reproduction Rate
- [x] **100%** - Always reproduces

---

## Visual Evidence

### Console Logs
```
[WebSocket] Attempting to configure Redis adapter
Error: connect ECONNREFUSED 127.0.0.1:6379
    at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1595:16)
UnhandledPromiseRejectionWarning: Error: connect ECONNREFUSED
```

### Network Logs
```
WebSocket connection to 'ws://localhost:3000' failed
```

---

## Technical Details

### Server Logs
```
[WebSocket] Redis adapter configuration failed
Error: Redis connection refused
    at setupWebSocket (src/websocket/index.ts:18)
```

---

## Impact Analysis

**User Impact:**
Complete dashboard failure. Users cannot access any functionality. This is a showstopper bug.

**Business Impact:**
Dashboard is unusable if Redis becomes temporarily unavailable. No graceful degradation.

**Workaround Available:**
- [x] Yes - Restart Redis service immediately

---

## Root Cause Analysis
WebSocket setup in `src/websocket/index.ts:18` does not handle Redis connection failures. The Redis adapter creation is not wrapped in try-catch, causing unhandled promise rejection.

**Affected Code:**
- File: `apps/server/src/websocket/index.ts`
- Line: 18-20
- Function: `setupWebSocket()`

---

## Suggested Fix
1. Wrap Redis adapter creation in try-catch
2. Fall back to in-memory adapter if Redis unavailable
3. Log warning and continue operation
4. Display warning banner in UI about reduced functionality

```typescript
try {
  const pubClient = getRedisPubClient();
  const subClient = getRedisSubClient();
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[WebSocket] Redis adapter configured");
} catch (error) {
  console.warn("[WebSocket] Redis unavailable, using in-memory adapter:", error);
  // Continue with default adapter
}
```

---

## Test Cases to Add
1. TC-WS-050: Start server with Redis down - should start successfully with warning
2. TC-WS-051: Redis fails mid-operation - should reconnect or fall back gracefully
3. TC-WS-052: UI should display connection status indicator

---

## Example 2: Medium Severity Bug

---

## Bug ID: BUG-002

**Date Reported:** 2026-01-27
**Reported By:** qa-2
**Assigned To:** frontend-dev-1
**Status:** Open

---

## Summary
Speech bubble text truncates incorrectly for messages with emoji characters

---

## Severity
- [x] **Medium** - Feature partially broken, workaround exists

---

## Priority
- [x] **P2** - Should fix before release

---

## Component
- [x] Dashboard UI

---

## Environment
**Server Version:** v1.0.0
**Browser:** Safari 17.2
**OS:** macOS 14.2

---

## Steps to Reproduce

1. Open dashboard
2. Assign task to agent with title containing emoji: "Review API docs 📚✨"
3. Observe speech bubble above agent

**Preconditions:**
- At least one agent in idle state

---

## Expected Result
Speech bubble should display: "Review API docs 📚✨" or "Review API docs 📚..." if truncated

---

## Actual Result
Speech bubble displays: "Review API docs �" (broken emoji rendering)

---

## Reproduction Rate
- [x] **100%** - Always reproduces with emoji characters

---

## Impact Analysis

**User Impact:**
Minor visual glitch. Message content is still readable, but emoji characters render incorrectly.

**Business Impact:**
Low - does not affect core functionality.

**Workaround Available:**
- [x] Yes - Avoid using emoji in task titles

---

## Suggested Fix
Use Unicode-aware string truncation. Ensure emoji characters are not split mid-codepoint.

```typescript
function truncateWithEmoji(text: string, maxLength: number): string {
  // Use Intl.Segmenter for proper Unicode segmentation
  const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
  const segments = Array.from(segmenter.segment(text));

  if (segments.length <= maxLength) {
    return text;
  }

  return segments.slice(0, maxLength).map(s => s.segment).join('') + '...';
}
```

---

## Test Cases to Add
1. TC-UI-030: Speech bubble with emoji - renders correctly
2. TC-UI-031: Speech bubble with mixed emoji and text - truncates properly
3. TC-UI-032: Speech bubble with only emoji - handles correctly

---
