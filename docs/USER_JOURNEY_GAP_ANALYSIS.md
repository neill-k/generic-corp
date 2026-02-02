# User Journey Gap Analysis - Claude Code Dashboard

**Date:** 2026-01-27
**Author:** product-manager-2
**Priority:** URGENT - Board/VC Review
**Status:** DRAFT

---

## Executive Summary

This analysis maps the complete user journey from first launch to daily use, identifying every point where users would encounter friction, confusion, or abandonment triggers. The current product has significant gaps that would prevent it from competing with AAA games or enterprise software.

**Critical Finding:** The dashboard is a **monitoring tool**, not a **management tool**. Users can VIEW agent activity but cannot MANAGE teams, folders, or configurations through the UI.

---

## 1. FIRST-RUN EXPERIENCE GAPS

### 1.1 No Onboarding Flow

**Current State:** User launches app and sees an empty dashboard with hardcoded agents.

**Gaps:**
- [ ] **No welcome wizard** - Users don't know what they're looking at
- [ ] **No setup flow** - No guidance to connect to Claude Code
- [ ] **No tutorial** - No explanation of features or workflows
- [ ] **No empty states with guidance** - Just blank panels
- [ ] **Hardcoded to localhost:3000** - WebSocket URL not configurable via UI

**What users must do today:**
1. Clone repo from GitHub
2. Install pnpm
3. Run `pnpm install`
4. Run `pnpm docker:up` (requires Docker knowledge)
5. Run `pnpm db:generate && pnpm db:push`
6. Run `pnpm dev`
7. Navigate to localhost:5173
8. Hope it works

**For AAA/Enterprise quality:**
- [ ] One-click installer or hosted version
- [ ] Welcome wizard: "Connect to Claude Code" → "Create your first team" → "Add agents"
- [ ] Interactive tutorial highlighting key features
- [ ] Contextual help tooltips
- [ ] Progressive disclosure (don't overwhelm on first visit)

### 1.2 No Configuration UI

**Current State:** All configuration requires editing files or environment variables.

**Gaps:**
- [ ] **No settings panel** - Users can't configure anything via UI
- [ ] **No server URL configuration** - Hardcoded WebSocket connection
- [ ] **No theme/appearance settings** - No light mode, no customization
- [ ] **No notification preferences** - Can't control alerts
- [ ] **No data directory configuration** - Can't point to custom ~/.claude location

**Files users must edit manually:**
- `apps/server/.env` - Database URL, Redis URL, ports
- `~/.claude/teams/{team}/config.json` - Team configuration
- `~/.claude/tasks/{team}/` - Task files

---

## 2. TEAM MANAGEMENT GAPS (CEO FLAGGED)

### 2.1 No Team Management UI

**Current State:** Teams exist in `~/.claude/teams/` as JSON files. No UI to manage them.

**Gaps:**
- [ ] **No "Create Team" button** - Must create JSON files manually
- [ ] **No "Edit Team" UI** - Must edit config.json manually
- [ ] **No "Delete Team" confirmation** - Must delete folders manually
- [ ] **No team list/selector** - Single team view only
- [ ] **No team member management** - Can't add/remove agents via UI
- [ ] **No team permissions UI** - Must edit JSON for permissions
- [ ] **No team switching** - Can't switch between teams

**What users must do today:**
```bash
# Create team
mkdir -p ~/.claude/teams/my-team
echo '{"name":"my-team","members":[]}' > ~/.claude/teams/my-team/config.json

# Add member (edit JSON manually)
vim ~/.claude/teams/my-team/config.json

# Delete team
rm -rf ~/.claude/teams/my-team
```

**For AAA/Enterprise quality:**
- [ ] Teams panel in sidebar
- [ ] "Create Team" modal with name, description, invite flow
- [ ] Team settings page (name, permissions, integrations)
- [ ] Drag-drop member management
- [ ] Role-based permissions (admin, member, viewer)
- [ ] Team activity history

### 2.2 No Agent Management UI

**Current State:** Agents are seeded in database via Prisma. No UI to create/edit agents.

**Gaps:**
- [ ] **No "Add Agent" button** - Agents are hardcoded in seed data
- [ ] **No "Edit Agent" panel** - Can't change agent name, role, personality
- [ ] **No "Remove Agent" option** - No way to remove via UI
- [ ] **No agent personality editor** - Must edit database directly
- [ ] **No capability configuration** - Must edit JSON capabilities array
- [ ] **No tool permission toggles** - Must edit JSON toolPermissions

**What users must do today:**
```bash
# Edit agent in database
cd apps/server
pnpm db:studio
# Navigate to agents table, edit fields, save
```

**For AAA/Enterprise quality:**
- [ ] Agent creation wizard (name, role, personality, capabilities)
- [ ] Agent settings panel (edit all properties)
- [ ] Capability picker (checkboxes for available capabilities)
- [ ] Tool permission toggles with descriptions
- [ ] Agent templates (Developer, QA, PM presets)
- [ ] Agent cloning

---

## 3. WORKING FOLDER MANAGEMENT GAPS (CEO FLAGGED)

### 3.1 No Folder/Workspace UI

**Current State:** The dashboard has no concept of working directories or projects.

**Gaps:**
- [ ] **No project/workspace selector** - Can't choose which folder agents work in
- [ ] **No file browser** - Can't see what files agents are accessing
- [ ] **No folder configuration** - Can't set allowed directories
- [ ] **No path allowlist UI** - Must edit team config JSON
- [ ] **No current working directory display** - No visibility into agent context

**What users must do today:**
```json
// Edit ~/.claude/teams/{team}/config.json
{
  "teamAllowedPaths": [
    {"path": "/home/user/project", "toolName": "Read"}
  ]
}
```

**For AAA/Enterprise quality:**
- [ ] Project/workspace panel
- [ ] File tree browser showing agent-accessible files
- [ ] Drag-drop folder permissions
- [ ] "Add allowed path" modal
- [ ] Per-agent path restrictions
- [ ] Recent files/folders list

---

## 4. TASK MANAGEMENT GAPS

### 4.1 Limited Task UI

**Current State:** Can view and create basic tasks. No advanced management.

**Gaps:**
- [ ] **No task editing** - Can't edit task title/description after creation
- [ ] **No task deletion** - No way to remove tasks
- [ ] **No task reassignment** - Can't move task to different agent via UI
- [ ] **No task dependencies UI** - Can't set blockedBy relationships visually
- [ ] **No task templates** - Must type every task from scratch
- [ ] **No bulk operations** - Can't select multiple tasks
- [ ] **No task search/filter** - Basic status filter only
- [ ] **No task history** - Can't see previous tasks easily
- [ ] **No task comments** - No way to add notes to tasks
- [ ] **No due dates/deadlines** - Field exists in DB but no UI

**For AAA/Enterprise quality:**
- [ ] Full CRUD for tasks (create, read, update, delete)
- [ ] Task detail modal with all fields editable
- [ ] Dependency graph visualization
- [ ] Task templates library
- [ ] Bulk select and bulk actions
- [ ] Advanced search and filters
- [ ] Task comments/activity thread
- [ ] Due date picker with reminders
- [ ] Task recurring schedules

---

## 5. MONITORING & OBSERVABILITY GAPS

### 5.1 Limited Activity Visibility

**Current State:** Basic activity feed exists but lacks depth.

**Gaps:**
- [ ] **No tool call details** - Can't see what arguments were passed
- [ ] **No output viewing** - Can't see tool results
- [ ] **No error details** - Just shows "error" without specifics
- [ ] **No log viewer** - Can't see agent console output
- [ ] **No token/cost tracking UI** - Budget exists but no breakdown
- [ ] **No performance metrics** - No latency, throughput visibility
- [ ] **No timeline scrubbing** - Can't go back in time
- [ ] **No export/download** - Can't export activity logs

**For AAA/Enterprise quality:**
- [ ] Expandable tool call cards showing full input/output
- [ ] Log viewer with syntax highlighting
- [ ] Cost breakdown by agent, task, tool
- [ ] Performance dashboard (latency charts, throughput)
- [ ] Timeline with scrubbing and playback
- [ ] Export to JSON/CSV
- [ ] Alerting on anomalies

---

## 6. USABILITY & POLISH GAPS

### 6.1 No Keyboard Shortcuts

**Gaps:**
- [ ] No hotkeys for common actions
- [ ] No keyboard navigation between panels
- [ ] No command palette (Cmd+K style)

### 6.2 No Responsive Design

**Gaps:**
- [ ] Fixed 80px sidebar width hardcoded
- [ ] No mobile support
- [ ] No tablet layout
- [ ] Breaks below 1200px width

### 6.3 No Accessibility

**Gaps:**
- [ ] No ARIA labels
- [ ] No keyboard focus indicators
- [ ] No screen reader support
- [ ] Poor color contrast in some areas

### 6.4 No Error Handling UX

**Gaps:**
- [ ] Connection errors show nothing
- [ ] API errors not user-friendly
- [ ] No retry mechanisms exposed to user
- [ ] No offline mode

---

## 7. MISSING CORE FEATURES

### 7.1 No Authentication

**Current State:** No login, no user accounts, single-player only.

**Gaps:**
- [ ] No login/signup
- [ ] No user profiles
- [ ] No multi-user support
- [ ] No SSO/OAuth
- [ ] No API keys for external access

### 7.2 No Notifications

**Gaps:**
- [ ] No push notifications
- [ ] No email alerts
- [ ] No webhook integrations
- [ ] No Slack/Discord integration

### 7.3 No Data Persistence UI

**Gaps:**
- [ ] No backup/restore
- [ ] No data export
- [ ] No data import
- [ ] No sync status indicator

---

## 8. COMPETITIVE GAPS

### What AAA Games Have:
- Comprehensive tutorials
- Achievement systems
- Progressive difficulty
- Save/load systems
- Settings menus with 50+ options
- Accessibility options
- Controller support
- Cloud saves

### What Enterprise Software Has:
- User management
- Role-based access control
- Audit logging
- SSO integration
- API with documentation
- Webhooks
- Custom branding
- SLA dashboards
- Support ticketing integration

### What We Have:
- Basic monitoring dashboard
- Task assignment (partial)
- Activity feed (basic)
- WebSocket real-time updates

---

## 9. PRIORITY MATRIX

### P0 - Launch Blockers (Must fix for credibility)
1. Team Management UI (Create/Edit/Delete teams via UI)
2. Agent Management UI (Create/Edit agents via UI)
3. Working Folder UI (Configure paths via UI)
4. Onboarding wizard (First-run experience)
5. Settings panel (Basic configuration)

### P1 - Week 1 Post-Launch (User retention)
1. Task editing and deletion
2. Task dependencies UI
3. Tool call detail expansion
4. Error handling improvements
5. Keyboard shortcuts

### P2 - Month 1 (Competitive parity)
1. Authentication system
2. Multi-user support
3. Notification system
4. Performance dashboard
5. Mobile responsive design

### P3 - Quarter 1 (Market leadership)
1. Plugin/extension system
2. Custom themes
3. API with docs
4. Webhook integrations
5. Enterprise SSO

---

## 10. RECOMMENDATION

**Current product is NOT ready for 1.0 launch.**

The dashboard is a monitoring window, not a management tool. Users cannot:
- Create or manage teams without editing JSON
- Configure working folders without editing JSON
- Create or edit agents without database access
- Perform basic CRUD on most entities

**Minimum for credible 1.0:**
- Team CRUD via UI
- Agent CRUD via UI
- Folder permissions via UI
- Onboarding flow
- Settings panel
- Error handling

**Estimated effort:** 2-4 weeks additional development for P0 items.

**Alternative:** Launch as "Early Access" / "Technical Preview" with clear messaging that management features are coming. Set expectations that this is for technical users comfortable with CLI/JSON.

---

## APPENDIX: Files Users Must Edit Today

| Action | File/Location | Format |
|--------|---------------|--------|
| Configure team | ~/.claude/teams/{team}/config.json | JSON |
| Add team member | ~/.claude/teams/{team}/config.json | JSON |
| Set allowed paths | ~/.claude/teams/{team}/config.json | JSON |
| Create task | ~/.claude/tasks/{team}/*.json | JSON |
| Edit agent | Database via Prisma Studio | SQL |
| Configure server | apps/server/.env | ENV |
| Configure ports | apps/server/.env | ENV |

---

**Document Status:** Complete. Awaiting CEO review and prioritization decision.
