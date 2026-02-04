import { Link } from "@tanstack/react-router";

const TOOL_CATEGORIES = [
  {
    name: "Task Management",
    tools: [
      { name: "delegate_task", description: "Assign work to any agent in your reporting chain" },
      { name: "finish_task", description: "Mark your task as completed, blocked, or failed" },
      { name: "get_task", description: "Look up any task by ID to check status and results" },
      { name: "list_tasks", description: "List tasks with filters (assignee, status, priority)" },
      { name: "update_task", description: "Update a task's priority or context" },
      { name: "cancel_task", description: "Cancel a pending task with an optional reason" },
      { name: "delete_task", description: "Permanently delete a task" },
    ],
  },
  {
    name: "Organization",
    tools: [
      { name: "get_my_org", description: "See your direct reports and their current status" },
      { name: "get_agent_status", description: "Check any agent's status, role, and department" },
      { name: "list_agents", description: "List all agents, filter by department or status" },
      { name: "create_agent", description: "Create a new agent in the organization" },
      { name: "update_agent", description: "Update an agent's properties (role, department, etc.)" },
      { name: "delete_agent", description: "Remove an agent from the organization" },
    ],
  },
  {
    name: "Org Structure",
    tools: [
      { name: "create_org_node", description: "Add an agent to the org hierarchy under a parent" },
      { name: "update_org_node", description: "Move an agent to a different position in the hierarchy" },
      { name: "delete_org_node", description: "Remove an agent from the org hierarchy" },
    ],
  },
  {
    name: "Board",
    tools: [
      { name: "query_board", description: "Search the shared board for updates, blockers, and findings" },
      { name: "post_board_item", description: "Post a status update, blocker, finding, or request" },
      { name: "archive_board_item", description: "Archive a resolved board item" },
      { name: "list_archived_items", description: "Browse previously archived board items" },
    ],
  },
  {
    name: "Messaging",
    tools: [
      { name: "send_message", description: "Send a message to another agent in a thread" },
      { name: "read_messages", description: "Read messages in a conversation thread" },
      { name: "list_threads", description: "List your message threads and recent activity" },
      { name: "mark_message_read", description: "Mark a message as read" },
      { name: "delete_message", description: "Delete a message" },
    ],
  },
  {
    name: "Workspace",
    tools: [
      { name: "get_workspace", description: "Get workspace settings (name, LLM provider, model, timezone)" },
      { name: "update_workspace", description: "Update workspace settings like name, model, or timezone" },
    ],
  },
  {
    name: "Tool Permissions",
    tools: [
      { name: "list_tool_permissions", description: "List all tool permission rules for agents" },
      { name: "create_tool_permission", description: "Create a new tool permission rule (allow/deny)" },
      { name: "update_tool_permission", description: "Update an existing tool permission rule" },
      { name: "delete_tool_permission", description: "Remove a tool permission rule" },
    ],
  },
  {
    name: "MCP Servers",
    tools: [
      { name: "list_mcp_servers", description: "List all registered external MCP servers" },
      { name: "get_mcp_server", description: "Get details of a specific MCP server" },
      { name: "register_mcp_server", description: "Register a new external MCP server" },
      { name: "update_mcp_server", description: "Update MCP server configuration" },
      { name: "remove_mcp_server", description: "Remove a registered MCP server" },
      { name: "ping_mcp_server", description: "Trigger a health check for an MCP server" },
    ],
  },
  {
    name: "Metrics & System",
    tools: [
      { name: "get_agent_metrics", description: "Get task counts, cost, and performance stats for an agent" },
      { name: "get_agent_system_prompt", description: "View the system prompt that will be sent to an agent" },
    ],
  },
];

const WORKFLOWS = [
  {
    title: "Delegate and track work",
    steps: [
      "Open Chat and describe the work you need done",
      "The CEO agent delegates to the right team member",
      "Watch progress in real-time on the Agent Detail page",
      "Results appear on the Board when complete",
    ],
  },
  {
    title: "Monitor team status",
    steps: [
      "View the Org Chart to see who's idle, running, or in error",
      "Click any agent to see their live activity stream",
      "Check the Board for blockers and status updates",
      "Ask for a standup report in Chat",
    ],
  },
  {
    title: "Handle blockers",
    steps: [
      "Agents post blockers to the Board automatically",
      "View active blockers in the Blockers column",
      "Address the blocker and archive the item when resolved",
      "Re-delegate work if needed via Chat",
    ],
  },
];

const CHAT_COMMANDS = [
  { command: "/help", description: "Show available commands and what agents can do" },
];

export function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-10 py-10">
      <div className="flex flex-col gap-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-sm bg-[#E53935]" />
            <h1 className="text-[32px] font-semibold text-black">
              Help & Documentation
            </h1>
          </div>
          <p className="mt-2 pl-[16px] text-sm text-[#666]">
            Everything you need to know about working with Generic Corp agents.
          </p>
        </div>

        {/* Getting Started */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
            <h2 className="text-sm font-medium text-black">Getting Started</h2>
          </div>
          <p className="text-sm text-[#666]">
            Generic Corp is an agent orchestration platform. Claude Code instances act as
            employees in a corporate hierarchy, each with their own role, department, and
            responsibilities. You interact with agents through{" "}
            <Link to="/chat" className="text-[#E53935] hover:underline">Chat</Link>,
            monitor them on the{" "}
            <Link to="/org" className="text-[#E53935] hover:underline">Org Chart</Link>,
            and track progress on the{" "}
            <Link to="/board" className="text-[#E53935] hover:underline">Board</Link>.
          </p>
        </section>

        {/* Workflows */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
            <h2 className="text-sm font-medium text-black">Common Workflows</h2>
          </div>
          <div className="mt-3 space-y-4">
            {WORKFLOWS.map((wf) => (
              <div key={wf.title} className="rounded-lg border border-[#EEE] bg-white p-5">
                <h4 className="text-sm font-medium text-black">{wf.title}</h4>
                <ol className="mt-2 space-y-1">
                  {wf.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs text-[#666]">
                      <span className="font-medium text-[#999]">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* Chat Commands */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
            <h2 className="text-sm font-medium text-black">Chat Commands</h2>
          </div>
          <p className="mt-1 text-sm text-[#666]">
            Type these commands in the chat input for quick actions:
          </p>
          <div className="mt-2 space-y-1">
            {CHAT_COMMANDS.map((cmd) => (
              <div key={cmd.command} className="flex items-baseline gap-3 rounded-md bg-[#F5F5F5] px-3 py-2">
                <code className="font-mono text-sm font-medium text-black">{cmd.command}</code>
                <span className="text-xs text-[#666]">{cmd.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Agent Tools */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
            <h2 className="text-sm font-medium text-black">Agent Tools Reference</h2>
          </div>
          <p className="mt-1 text-sm text-[#666]">
            Every tool available to agents is also accessible via the API. Agents use these
            tools to interact with the platform:
          </p>
          <div className="mt-3 space-y-4">
            {TOOL_CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <h4 className="text-sm font-medium text-black">{cat.name}</h4>
                <div className="mt-1 space-y-0.5">
                  {cat.tools.map((tool) => (
                    <div key={tool.name} className="flex items-baseline gap-3 py-1">
                      <code className="font-mono text-xs text-[#999]">{tool.name}</code>
                      <span className="text-xs text-[#666]">{tool.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Suggested Prompts */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
            <h2 className="text-sm font-medium text-black">Suggested Prompts</h2>
          </div>
          <p className="mt-1 text-sm text-[#666]">
            Try these in <Link to="/chat" className="text-[#E53935] hover:underline">Chat</Link> to get started:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              "Review the latest code changes",
              "Give me a standup report",
              "What blockers does the team have?",
              "Delegate a code review to the engineering lead",
              "Who is available to take on work?",
              "Show me the team's current workload",
            ].map((prompt) => (
              <span
                key={prompt}
                className="rounded-full border border-[#EEE] bg-white px-4 py-2 text-xs text-[#666]"
              >
                {prompt}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
