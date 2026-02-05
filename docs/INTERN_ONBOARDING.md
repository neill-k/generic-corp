# Intern Onboarding: A Brutally Honest Guide to This Codebase

**Author:** The Grumpy Senior Engineer Who's Seen Things
**Audience:** You, the new intern
**Prerequisite:** Thick skin

---

## Welcome

Congratulations on your new role. You've inherited a codebase that is, by modern web standards, "not terrible." This is faint praise. "Not terrible" is the participation trophy of software engineering.

This document will explain what's wrong, why it's wrong, and how you're going to fix it. Yes, you. That's why we hired an intern.

---

## The Architecture (30-Second Version)

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  apps/dashboard (React + Vite + Zustand + TanStack)         │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP + WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                        Backend                               │
│  apps/server (Express + Socket.io + BullMQ + Prisma)        │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ API Routes  │  │  Services   │  │  MCP Server (1862   │  │
│  │ (REST)      │──│  (logic)    │──│  lines of pain)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│  PostgreSQL (data) + Redis (queues)                         │
└─────────────────────────────────────────────────────────────┘
```

The system orchestrates AI agents (Claude) that act as "employees" in a fake corporation. The agents communicate via MCP (Model Context Protocol) tools. The humans watch via the dashboard.

Clear? Good. Now let's talk about what's broken.

---

## Problem #1: The 1,862-Line MCP Server File

**Location:** `apps/server/src/mcp/server.ts`

**What it is:** A single file containing 40+ tool definitions for the MCP server.

**Why it's bad:**

Imagine a restaurant menu that's 1,862 lines long. Now imagine every dish is described using the same 15-line template, copy-pasted 40 times. That's this file.

**The pattern that's repeated 40+ times:**

```typescript
tool(
  "tool_name",
  "Tool description",
  { /* zod schema */ },
  async (args) => {
    try {
      // 5-50 lines of actual logic
      return toolText(JSON.stringify(result, null, 2));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return toolText(`tool_name failed: ${msg}`);
    }
  },
),
```

**Your job:** Split this file. Here's how:

```
apps/server/src/mcp/
├── server.ts              # Just the createGcMcpServer function, imports tools
├── tools/
│   ├── index.ts           # Re-exports all tools
│   ├── agent-tools.ts     # create_agent, update_agent, delete_agent, list_agents, get_agent_status
│   ├── task-tools.ts      # delegate_task, finish_task, get_task, list_tasks, update_task, cancel_task, delete_task
│   ├── message-tools.ts   # send_message, read_messages, list_threads, delete_thread, mark_message_read, delete_message
│   ├── board-tools.ts     # query_board, post_board_item, update_board_item, archive_board_item, list_archived_items
│   ├── org-tools.ts       # get_my_org, list_org_nodes, create_org_node, update_org_node, delete_org_node
│   ├── workspace-tools.ts # get_workspace, update_workspace
│   ├── mcp-server-tools.ts # list_mcp_servers, get_mcp_server, register_mcp_server, update_mcp_server, remove_mcp_server, ping_mcp_server
│   ├── permission-tools.ts # All the tool_permission CRUD
│   └── organization-tools.ts # list_organizations, create_organization, switch_organization, delete_organization
└── utils/
    └── tool-helpers.ts    # The shared error handling wrapper (see below)
```

**The helper you should create:**

```typescript
// apps/server/src/mcp/utils/tool-helpers.ts

type ToolTextResult = { content: Array<{ type: "text"; text: string }> };

export function toolText(text: string): ToolTextResult {
  return { content: [{ type: "text", text }] };
}

export function toolJson(data: unknown): ToolTextResult {
  return toolText(JSON.stringify(data, null, 2));
}

export function toolError(toolName: string, error: unknown): ToolTextResult {
  const msg = error instanceof Error ? error.message : "Unknown error";
  return toolText(`${toolName} failed: ${msg}`);
}

/**
 * Wraps a tool handler with standardized error handling.
 * Use this instead of copy-pasting try/catch 40 times.
 */
export function withErrorHandling<TArgs>(
  toolName: string,
  handler: (args: TArgs) => Promise<ToolTextResult>
): (args: TArgs) => Promise<ToolTextResult> {
  return async (args: TArgs) => {
    try {
      return await handler(args);
    } catch (error) {
      console.error(`[MCP] ${toolName} error:`, error);
      return toolError(toolName, error);
    }
  };
}
```

**Before (repeated 40 times):**

```typescript
tool(
  "get_agent_status",
  "Read an agent's current status",
  { agentName: z.string() },
  async (args) => {
    try {
      const agent = await prisma.agent.findUnique({
        where: { name: args.agentName },
        select: { name: true, status: true /* ... */ },
      });
      if (!agent) return toolText(`Unknown agent: ${args.agentName}`);
      return toolText(JSON.stringify(agent, null, 2));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      return toolText(`get_agent_status failed: ${msg}`);
    }
  },
),
```

**After:**

```typescript
tool(
  "get_agent_status",
  "Read an agent's current status",
  { agentName: z.string() },
  withErrorHandling("get_agent_status", async (args) => {
    const agent = await prisma.agent.findUnique({
      where: { name: args.agentName },
      select: { name: true, status: true /* ... */ },
    });
    if (!agent) return toolText(`Unknown agent: ${args.agentName}`);
    return toolJson(agent);
  }),
),
```

You just eliminated 5 lines per tool. 40 tools * 5 lines = 200 lines of deleted copy-paste.

---

## Problem #2: Magic Strings

**Locations:** Everywhere

**What it is:** Status values, types, and other enumerations stored as plain strings.

**Examples of the disease:**

```typescript
// In TypeScript types
type AgentStatus = "idle" | "running" | "error" | "offline";

// In Prisma schema
status String @default("idle")

// In actual code
await prisma.agent.update({ data: { status: "running" } });

// In MCP tools
status: z.enum(["idle", "running", "error", "offline"])
```

The same strings are defined in 4+ different places. When you add a new status, you have to update:
1. The TypeScript type
2. The Zod schema in the MCP tool
3. Any switch statements
4. The frontend (probably)
5. Your sanity

**The fix:**

Create a single source of truth in `packages/shared/src/constants.ts`:

```typescript
// packages/shared/src/constants.ts

export const AGENT_STATUSES = ["idle", "running", "error", "offline"] as const;
export type AgentStatus = (typeof AGENT_STATUSES)[number];

export const TASK_STATUSES = ["pending", "running", "review", "completed", "failed", "blocked"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const MESSAGE_TYPES = ["direct", "system", "chat"] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

// For Zod schemas
import { z } from "zod";
export const agentStatusSchema = z.enum(AGENT_STATUSES);
export const taskStatusSchema = z.enum(TASK_STATUSES);
```

Now when you need to validate a status in an MCP tool:

```typescript
import { agentStatusSchema } from "@generic-corp/shared";

// In tool definition
status: agentStatusSchema
```

One source of truth. Change it once, it changes everywhere.

**Note:** Prisma still stores it as a string. That's fine. But at least your application layer is consistent.

---

## Problem #3: The `void args.scope` Mystery

**Location:** `apps/server/src/mcp/server.ts`, line 306

```typescript
tool(
  "query_board",
  "Search the shared board for relevant items",
  {
    scope: z.enum(["team", "department", "org"]).optional(),
    type: z.string().optional(),
    since: z.string().optional(),
  },
  async (args) => {
    try {
      void args.scope;  // <-- WHAT IS THIS

      const boardService = getBoardService();
      const items = await boardService.listBoardItems({
        type: args.type,
        since: args.since,
      });
      // ...
    }
  }
)
```

**What it is:** Someone added a `scope` parameter to the schema but never implemented it. The `void` expression is there to suppress the "unused variable" TypeScript/ESLint error.

**Why it's bad:** This is lying to the user. The tool advertises a `scope` parameter that does nothing. An agent might call `query_board({ scope: "team" })` thinking it filters by team. It doesn't.

**Your job:** Either implement it or remove it.

**Option A - Remove it (if not needed):**

```typescript
tool(
  "query_board",
  "Search the shared board for relevant items",
  {
    type: z.string().optional(),
    since: z.string().optional(),
  },
  // ...
)
```

**Option B - Implement it (if needed):**

```typescript
const items = await boardService.listBoardItems({
  type: args.type,
  since: args.since,
  scope: args.scope,  // Actually pass it
});
```

Then update `BoardService.listBoardItems()` to filter by scope.

Do not leave `void` statements in the code. They are the code equivalent of a "TODO" sticky note that's been on someone's monitor for 3 years.

---

## Problem #4: BoardService Instantiation

**Location:** `apps/server/src/mcp/server.ts`, line 41-43

```typescript
function getBoardService(): BoardService {
  return new BoardService(resolveWorkspaceRoot());
}
```

This function is called inside multiple tool handlers. Every tool invocation creates a new `BoardService` instance.

Meanwhile, in `apps/server/src/index.ts`:

```typescript
const boardService = new BoardService(resolveWorkspaceRoot());
// ... passed to API router
```

**The inconsistency:** API routes get a shared instance. MCP tools create new instances constantly.

**Why it matters:**
- If `BoardService` has any internal state or caching, the MCP tools won't benefit
- It's wasteful (though `BoardService` appears stateless, so it's not catastrophic)
- It's inconsistent, which makes the code harder to reason about

**The fix:** Pass `BoardService` into `createGcMcpServer` via the deps object:

```typescript
// mcp/server.ts
export interface McpServerDeps {
  prisma: PrismaClient;
  orgSlug: string;
  agentId: string;
  taskId: string;
  runtime?: AgentRuntime;
  boardService: BoardService;  // Add this
}

export function createGcMcpServer(deps: McpServerDeps) {
  const { prisma, orgSlug, agentId, taskId, runtime, boardService } = deps;

  // Remove the getBoardService() function
  // Use deps.boardService directly in tool handlers
}
```

---

## Problem #5: Sequential File Reads

**Location:** `apps/server/src/api/routes/agents.ts`, lines 182-196

```typescript
for (const file of files.slice(0, 20)) {
  if (!file.endsWith(".md")) continue;
  const content = await readFile(nodePath.join(resultsDir, file), "utf8");
  results.push({ file, content: content.slice(0, 2000) });
}
```

**What it is:** Reading up to 20 files sequentially. Each `await` waits for the previous read to complete.

**Why it's bad:** If each file read takes 5ms, you're waiting 100ms total. With parallel reads, you'd wait ~5ms.

**The fix:**

```typescript
const mdFiles = files.slice(0, 20).filter(f => f.endsWith(".md"));

const results = await Promise.all(
  mdFiles.map(async (file) => {
    const content = await readFile(nodePath.join(resultsDir, file), "utf8");
    return { file, content: content.slice(0, 2000) };
  })
);
```

**Caveat:** If you're reading 1000 files, don't `Promise.all` them all at once or you'll exhaust file descriptors. For 20 files, it's fine. For larger numbers, use a library like `p-limit` to control concurrency.

---

## Problem #6: The "human" Magic Recipient

**Location:** `apps/server/src/mcp/server.ts`, lines 416-429

```typescript
const isHumanReply = args.toAgent === "human";
let recipientId: string;

if (isHumanReply) {
  // For human replies, set recipient to self (the thread is what matters)
  recipientId = sender.id;
} else {
  const recipient = await prisma.agent.findUnique({
    where: { name: args.toAgent },
    // ...
  });
}
```

**What it is:** The string `"human"` is a magic value that means "this message is for a human user, not an agent."

**Why it's bad:** What if someone creates an agent named "human"? The system will misinterpret messages to that agent as human-directed messages.

**Possible fixes:**

**Option A - Use null:**
```typescript
toAgent: z.string().nullable().describe("Agent name, or null for human users")

const isHumanReply = args.toAgent === null;
```

**Option B - Separate field:**
```typescript
{
  toAgent: z.string().optional(),
  toHuman: z.boolean().optional(),
}
```

**Option C - Reserved prefix:**
```typescript
// Reserve agent names starting with underscore for system use
const isHumanReply = args.toAgent === "_human";

// Enforce in agent creation:
if (args.name.startsWith("_")) {
  return toolText("Agent names cannot start with underscore (reserved)");
}
```

Pick one. Document it. Enforce it.

---

## Problem #7: Duplicated System Prompt Assembly

**Locations:**
- `apps/server/src/mcp/server.ts` lines 1621-1654 (in `get_agent_system_prompt` tool)
- `apps/server/src/api/routes/agents.ts` lines 284-301 (in `/agents/:id/system-prompt` endpoint)

Both places assemble a system prompt with identical logic:

```typescript
const systemPrompt = [
  `You are ${agent.displayName}, ${agent.role} at Generic Corp.`,
  "",
  agent.personality,
  "",
  "## Available Tools",
  enabledTools.length > 0
    ? enabledTools.map((t) => `- ${t}`).join("\n")
    : "(no tool permissions configured)",
  "",
  "## Department",
  agent.department,
].join("\n");
```

**Why it's bad:** Copy-pasted logic. If you change the prompt format, you have to change it in two places. You will forget one of them.

**The fix:** Extract to a shared function in a service:

```typescript
// apps/server/src/services/system-prompt.ts

interface AgentForPrompt {
  displayName: string;
  role: string;
  personality: string;
  department: string;
  toolPermissions: Record<string, boolean> | null;
}

export function assembleAgentSystemPrompt(agent: AgentForPrompt): string {
  const toolPerms = agent.toolPermissions ?? {};
  const enabledTools = Object.entries(toolPerms)
    .filter(([, v]) => v)
    .map(([k]) => k);

  return [
    `You are ${agent.displayName}, ${agent.role} at Generic Corp.`,
    "",
    agent.personality,
    "",
    "## Available Tools",
    enabledTools.length > 0
      ? enabledTools.map((t) => `- ${t}`).join("\n")
      : "(no tool permissions configured)",
    "",
    "## Department",
    agent.department,
  ].join("\n");
}
```

Then use it in both places:

```typescript
import { assembleAgentSystemPrompt } from "../services/system-prompt.js";

// In API route and MCP tool:
const systemPrompt = assembleAgentSystemPrompt(agent);
```

---

## Problem #8: No Comments

**Location:** The entire codebase

**What it is:** Almost zero explanatory comments.

**What I'm NOT asking for:**

```typescript
// Increment i by 1
i++;

// Get the agent from the database
const agent = await prisma.agent.findUnique({ where: { id } });
```

These comments are worthless. The code already says what it does.

**What I AM asking for:**

```typescript
/**
 * Creates an in-process MCP server for a specific agent invocation.
 *
 * Each agent gets its own MCP server instance with tools scoped to:
 * - The agent's identity (agentId) for permission checks
 * - The current task (taskId) for context
 * - The organization (orgSlug) for multi-tenant isolation
 *
 * Tools are defined inline rather than loaded from files because:
 * 1. They need closure over prisma/agentId/taskId
 * 2. Hot-reloading isn't needed (server restart is fine)
 * 3. Type safety with Zod schemas is easier inline
 */
export function createGcMcpServer(deps: McpServerDeps) {
```

```typescript
/**
 * Marks a message as read and updates readAt timestamp.
 *
 * Note: We don't verify the caller is the recipient because:
 * - Agents may read messages on behalf of users
 * - The threadId already scopes access appropriately
 * - Over-permissioning here is acceptable for v1
 *
 * TODO: Add recipient verification for multi-user scenarios
 */
tool("mark_message_read", ...)
```

Comments should explain **why**, not **what**. The what is in the code. The why is in your head, and it needs to get out before you leave and we're stuck guessing.

---

## Your First Week Checklist

- [ ] Read this document twice
- [ ] Run the app locally (`pnpm install && pnpm docker:up && pnpm db:push && pnpm dev`)
- [ ] Create a test agent via the dashboard
- [ ] Find the 1,862-line MCP file and feel the pain
- [ ] Pick ONE problem from this list and fix it
- [ ] Open a PR with your fix
- [ ] Prepare for code review feedback (it will be blunt)

---

## Questions You Should Ask

1. "Why is the plugin system so complex for only 4 plugins?"
2. "What's the plan for the enterprise-auth package that exists but isn't integrated?"
3. "Why are there two different AgentResult types in different packages?"
4. "Who wrote the 1,862-line file and are they still employed here?"

---

## Questions You Should NOT Ask

1. "Can we rewrite this in Rust?"
2. "Have you considered microservices?"
3. "What if we added blockchain?"

---

## Final Advice

The codebase is not perfect. No codebase is. Your job is to make it slightly better than you found it, one commit at a time.

Don't try to fix everything at once. Don't propose a "big rewrite." Just pick the ugliest thing you see, make it less ugly, write a test, and submit a PR.

That's how real software gets maintained.

Now get to work.

---

*Document version: 1.0*
*Last updated by: Someone who's been doing this too long*
*Approved by: Whose approval do you need? Just read it.*
