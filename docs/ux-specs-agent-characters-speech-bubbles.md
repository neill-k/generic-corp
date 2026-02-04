# UX Specifications: Agent Characters with Speech Bubbles

**Feature:** Real-time Agent Characters with Activity Speech Bubbles
**Designer:** product-1
**Date:** 2026-01-27
**Status:** Ready for Implementation

---

## Executive Summary

Visual representation of AI agents as characters in the Phaser-powered isometric office environment. Each agent displays real-time activity through animated speech bubbles showing current actions, tool calls, and status. This creates an engaging, intuitive interface for monitoring agent behavior at a glance.

---

## User Stories

### US-1: See Agent Current Activity
**As a** team lead
**I want to** see what each agent is currently doing in real-time
**So that** I can monitor team activity without reading logs

**Acceptance Criteria:**
- Each agent character displays speech bubble when active
- Speech bubble shows current action (e.g., "Reading file: auth.ts")
- Bubble updates within 500ms of new agent action
- Idle agents show no speech bubble or "💤 Idle" state
- Bubbles auto-hide after 5 seconds of inactivity

### US-2: Distinguish Agent States Visually
**As a** team lead
**I want to** quickly identify which agents are working, idle, or blocked
**So that** I can spot issues immediately

**Acceptance Criteria:**
- Working agents: Yellow pulsing status ring + animated speech bubbles
- Idle agents: Green status ring + no bubble (or "💤 Idle")
- Blocked agents: Red pulsing ring + "⚠️ Blocked: {reason}" bubble
- Offline agents: Gray ring + desaturated character + no bubble
- State changes animate smoothly (fade transition, 300ms)

### US-3: View Tool Call Details
**As a** team lead
**I want to** see which tools agents are using
**So that** I understand their workflow and identify issues

**Acceptance Criteria:**
- Speech bubble shows tool name and key parameters
- Examples:
  - "📖 Read: src/api/index.ts"
  - "✏️ Edit: Fix authentication bug"
  - "🔨 Bash: npm test"
  - "🔍 Grep: search for 'UserAuth'"
- Tool icons map to action types (read, write, edit, bash, etc.)
- Long filenames/commands truncate with ellipsis

### US-4: Hover for Extended Details
**As a** team lead
**I want to** hover over an agent to see expanded information
**So that** I can get context without leaving the main view

**Acceptance Criteria:**
- Hover shows tooltip with: agent name, role, current task title
- Tooltip appears after 200ms hover delay
- Tooltip follows cursor (offset 20px to avoid covering agent)
- Tooltip dismisses on mouse leave
- Tooltip stacks above speech bubbles (z-index management)

### US-5: Visual Agent Personality
**As a** team lead
**I want to** agents to have distinct visual identities
**So that** I can quickly identify team members

**Acceptance Criteria:**
- Each agent has unique color (from existing AGENT_COLORS mapping)
- Character design reflects role (visual cues in posture/accessories)
- First name displayed below character (not full name)
- Color-coded status ring matches existing system
- Character scales slightly on hover (1.15x) for feedback

---

## Character Design Specifications

### Base Character Dimensions

**Character Body:**
- Width: 20px (body) + 20px (head diameter)
- Height: 45px total (25px body + 20px head)
- Sitting at desk: Y-offset +30px from desk top

**Visual Style:**
- Simplified humanoid silhouette (existing GameCanvas.tsx style)
- Solid color fill (agent-specific color from AGENT_COLORS)
- Rounded shapes (head: circle, body: rounded rectangle)
- Minimal details (2px circle eyes, no mouth)

**Color Palette (Existing):**
```typescript
Marcus Bell: #4a90e2 (CEO blue)
Sable Chen: #e94560 (Principal red)
DeVonte Jackson: #00d4aa (Dev teal)
Yuki Tanaka: #ff6b6b (SRE coral)
Graham Sutton: #95a5a6 (Data gray)
Miranda Okonkwo: #9b59b6 (Purple)
Helen Marsh: #f39c12 (Orange)
Walter Huang: #27ae60 (Green)
Frankie Deluca: #e74c3c (Red)
Kenji Ross: #3498db (Blue)
```

### Character Animations

**Idle State (agent.status === "idle"):**
- Subtle breathing animation (scaleY: 1.0 → 1.02, 2 second cycle)
- Head bobs slightly every 4 seconds (1px down, 200ms)
- No speech bubble (or optional "💤 Idle" after 30 seconds idle)

**Working State (agent.status === "working"):**
- Head bobs rhythmically (simulating typing/reading)
- Head Y-offset: -18 → -16.5px, 600ms cycle
- Status ring pulses (alpha: 1 → 0.4, 600ms cycle)
- Speech bubble updates every 1-3 seconds

**Blocked State (agent.status === "blocked"):**
- Character tints red (multiply blend, 0.8 intensity)
- Exclamation mark "!" bounces above head (Y: -35 → -40px, bounce ease)
- Status ring pulses faster (400ms cycle, red color)
- Speech bubble shows blocker reason

**Offline State (agent.status === "offline"):**
- Character grayscale filter (saturation: 0)
- Opacity: 0.5
- Status ring: gray, no pulse
- No speech bubble
- No animations

---

## Speech Bubble Design

### Bubble Structure

**Dimensions:**
- Min width: 80px
- Max width: 200px (wraps to 2 lines max)
- Height: Auto (based on content, 24-48px)
- Padding: 8px horizontal, 6px vertical
- Border radius: 12px

**Visual Style:**
```
     ┌─────────────────────────┐
     │ 📖 Read: auth.ts:42    │
     └─────┬───────────────────┘
           │ (tail, 8px triangle)
           ▼
         [Agent Character]
```

**Background:**
- Base: `#1a1a2e` (dark corp theme)
- Opacity: 0.95 (slight transparency)
- Border: 2px solid (color based on action type)

**Border Colors by Action Type:**
- Read/Grep/Glob: Blue `#4a90e2`
- Write/Edit: Yellow `#ffcc00`
- Bash: Green `#00d4aa`
- Task/Teammate: Purple `#9b59b6`
- Error: Red `#e94560`
- Default: Gray `#5a6578`

**Text:**
- Font: `JetBrains Mono` (monospace for code references)
- Size: 10px
- Color: `#ffffff` (white)
- Line height: 1.3
- Max 2 lines, ellipsis overflow

**Tail (pointing to character):**
- Triangle, 8px width × 6px height
- Matches bubble background color
- Positioned bottom-center of bubble

### Content Formatting

**Tool Call Display Rules:**

| Tool | Icon | Format | Example |
|------|------|--------|---------|
| Read | 📖 | `Read: {filename}:{line}` | `📖 Read: auth.ts:42` |
| Edit | ✏️ | `Edit: {filename}` | `✏️ Edit: index.ts` |
| Write | 📝 | `Write: {filename}` | `📝 Write: config.json` |
| Bash | 🔨 | `Bash: {command}` | `🔨 Bash: npm test` |
| Grep | 🔍 | `Grep: "{pattern}"` | `🔍 Grep: "UserAuth"` |
| Glob | 📂 | `Glob: {pattern}` | `📂 Glob: src/**/*.ts` |
| Task | 📋 | `Task: {action}` | `📋 Task: Create sprint` |
| Teammate | 💬 | `Message: {recipient}` | `💬 Message: Sable` |

**Text Truncation:**
- Filenames > 20 chars: Show last 20 chars with "..." prefix
  - `auth.ts` → `auth.ts`
  - `src/components/Dashboard.tsx` → `...omponents/Dashboard.tsx`
- Commands > 30 chars: Truncate with "..." suffix
  - `npm test` → `npm test`
  - `git commit -m "Long commit message here"` → `git commit -m "Long commit..."`

**Special States:**
- Idle: No bubble (or `💤 Idle` after 30s)
- Blocked: `⚠️ Blocked: {reason}` (reason truncated to 25 chars)
- Error: `❌ Error: {message}` (red border)

---

## Animation Specifications

### Speech Bubble Lifecycle

**Appear (on new activity):**
1. Fade in: opacity 0 → 1 (200ms, ease-out)
2. Scale up: scale 0.8 → 1 (200ms, elastic ease)
3. Slide down: Y-offset -10px → 0px (200ms)

**Update (content change):**
1. Pulse: scale 1 → 1.05 → 1 (300ms, sine ease)
2. Content swaps instantly (no fade)
3. Border color updates based on new action type

**Disappear (inactivity timeout or idle state):**
1. Fade out: opacity 1 → 0 (300ms, ease-in)
2. Scale down: scale 1 → 0.9 (300ms)
3. Remove from DOM after animation completes

**Timeout Behavior:**
- Auto-hide after 5 seconds of no new activity
- Working agents: Bubble persists while status = "working"
- Idle agents: Bubble disappears immediately on status change

### Character Interaction Animations

**Hover (on character):**
1. Character scales up: 1 → 1.15 (150ms, power2 ease)
2. Status ring scales with character
3. Speech bubble remains at original scale (no scale)
4. Tooltip appears after 200ms delay

**Click (on character):**
1. Quick scale bounce: 1 → 0.95 → 1 (200ms)
2. Emit `agentClicked` event (existing behavior)
3. Selected agent highlighted in Dashboard panel

---

## State Machine

### Agent Visual States

```
                 ┌─────────┐
                 │ OFFLINE │ (gray, no animations)
                 └────┬────┘
                      │ (agent connects)
                      ▼
    ┌──────────> ┌──────┐
    │            │ IDLE │ (green ring, breathing animation)
    │            └──┬───┘
    │               │ (task assigned)
    │               ▼
    │            ┌─────────┐
    │            │ WORKING │ (yellow ring, speech bubbles, typing animation)
    │            └────┬────┘
    │                 │ (blocked)
    │                 ▼
    │            ┌─────────┐
    └────────────│ BLOCKED │ (red ring, exclamation, error bubble)
                 └─────────┘
                      │ (unblocked)
                      └────> back to WORKING or IDLE
```

### Transition Rules

| From | To | Trigger | Animation |
|------|-----|---------|-----------|
| OFFLINE | IDLE | Agent connects | Fade in character (500ms) |
| IDLE | WORKING | Task started | Ring color: green→yellow, bubble appears |
| WORKING | IDLE | Task completed | Ring color: yellow→green, bubble fades out |
| WORKING | BLOCKED | Error/dependency | Ring color: yellow→red, bubble shows error |
| BLOCKED | WORKING | Unblocked | Ring color: red→yellow, error bubble → working bubble |
| BLOCKED | IDLE | Task cancelled | Ring color: red→green, bubble fades out |
| Any | OFFLINE | Agent disconnects | Fade out + grayscale (300ms) |

---

## Integration with Existing Phaser Setup

### Current Architecture (from GameCanvas.tsx)

**Existing Components:**
- OfficeScene: Phaser scene managing office environment
- AGENT_DESK_POSITIONS: Hardcoded desk positions
- AGENT_COLORS: Color mapping for each agent
- STATUS_COLORS: Status ring color system
- createAgentSprite(): Creates character containers
- updateAgentVisuals(): Updates character based on agent state

**Required Modifications:**

1. **Add Speech Bubble Container to Agent Sprite:**
```typescript
// In createAgentSprite(), add:
const speechBubble = this.add.container(0, -50);
speechBubble.setName("speechBubble");
speechBubble.setVisible(false);
container.add(speechBubble);
```

2. **Create Speech Bubble Factory Method:**
```typescript
private createSpeechBubble(text: string, actionType: string): Phaser.GameObjects.Container {
  const bubble = this.add.container(0, 0);

  // Background (rounded rect + tail)
  const bg = this.add.graphics();
  const borderColor = this.getActionColor(actionType);
  bg.fillStyle(0x1a1a2e, 0.95);
  bg.lineStyle(2, borderColor, 1);
  bg.fillRoundedRect(-100, -24, 200, 48, 12);
  bg.strokeRoundedRect(-100, -24, 200, 48, 12);

  // Tail triangle
  bg.fillStyle(0x1a1a2e, 0.95);
  bg.fillTriangle(-4, 24, 4, 24, 0, 30);

  // Text
  const textObj = this.add.text(0, 0, text, {
    fontSize: "10px",
    color: "#ffffff",
    fontFamily: "JetBrains Mono",
    align: "center",
    wordWrap: { width: 180 }
  });
  textObj.setOrigin(0.5);

  bubble.add([bg, textObj]);
  return bubble;
}
```

3. **Update Speech Bubble on Activity Events:**
```typescript
// Subscribe to WebSocket activity events
this.game.events.on("agentActivity", (activity: ActivityEvent) => {
  const container = this.agents.get(activity.agentId);
  if (!container) return;

  const speechBubble = container.getByName("speechBubble");
  if (speechBubble) {
    this.updateSpeechBubble(speechBubble, activity);
  }
});
```

### WebSocket Event Structure

**New Event: `agent:activity`**
```typescript
interface AgentActivityEvent {
  agentId: string;
  eventType: "tool_call" | "status_change" | "idle";
  tool?: string;  // "Read", "Edit", "Bash", etc.
  details?: {
    filename?: string;
    line?: number;
    command?: string;
    pattern?: string;
  };
  timestamp: Date;
}
```

**Server-side Emission:**
- Emit `agent:activity` when Claude Agent SDK reports tool use
- Emit on status changes (idle → working, working → blocked)
- Throttle emissions: max 1 per second per agent

---

## Error States

### Missing Agent Data

**If agent not in AGENT_DESK_POSITIONS:**
- Log warning: "Agent {name} has no desk position"
- Don't render character
- Show in Dashboard panel with "⚠️ No position" indicator

### Invalid Activity Data

**If activity event missing required fields:**
- Fallback bubble text: "🔨 Working..."
- Use default border color (gray)
- Log warning to console

### Speech Bubble Overflow

**If too many concurrent activities:**
- Show only most recent activity in bubble
- Previous activities fade out
- Max 1 bubble per agent at a time

---

## Accessibility

### Keyboard Navigation
- Tab: Cycle through agent characters
- Enter: Select focused agent (same as click)
- Space: Show/hide speech bubble (toggle)

### Screen Readers
- Characters have aria-labels: "{Name}, {role}, status: {status}, currently: {activity}"
- Speech bubble updates announced: "{Name} is now {activity}"
- Reduced motion: Disable animations, show static bubbles

### Visual
- High contrast mode: Increase border thickness to 3px
- Color blind friendly: Icons + text (not just color)
- Minimum text size: 10px (readable at 1080p)

---

## Performance Optimization

### Object Pooling
- Reuse speech bubble containers (don't destroy/create on each update)
- Pool size: 20 bubbles (2× max concurrent agents)
- Recycle bubbles when agent goes idle

### Animation Throttling
- Update speech bubbles max 1× per second
- Batch multiple tool calls within 1-second window
- Use Phaser's built-in tween pooling

### Rendering Optimization
- Use Phaser's container depth sorting (existing)
- Limit bubble text to 2 lines max
- Use texture atlas for emoji icons (future enhancement)

---

## Success Metrics

**User Engagement:**
- % of users who hover over agents for details
- Average time spent in game canvas view
- Click-through rate on agent characters

**Performance:**
- Speech bubble update latency < 500ms
- Animation frame rate maintained at 60 FPS
- No dropped frames during 10+ concurrent agent activities

**Usability:**
- Users can identify agent activity without reading logs (measured via user testing)
- Reduced support tickets about "what is my agent doing?"
- User satisfaction score > 8/10 for visual feedback

---

## Future Enhancements (Out of Scope for v1)

- Agent facial expressions (happy on task complete, worried on error)
- Thought bubbles for internal agent reasoning
- Multiple speech bubbles for parallel tool calls
- Speech bubble history (click to expand recent activities)
- Custom agent avatars (upload image or choose preset)
- Agent movement animations (walking between desks)
- Collaboration indicators (lines between agents working on same task)
- Sound effects (typing sounds, notification chimes)
