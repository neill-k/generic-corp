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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Help & Documentation</h2>
        <p className="mt-1 text-sm text-slate-600">
          Everything you need to know about working with Generic Corp agents.
        </p>
      </div>

      {/* Getting Started */}
      <section>
        <h3 className="text-base font-semibold text-slate-800">Getting Started</h3>
        <p className="mt-1 text-sm text-slate-600">
          Generic Corp is an agent orchestration platform. Claude Code instances act as
          employees in a corporate hierarchy, each with their own role, department, and
          responsibilities. You interact with agents through{" "}
          <Link to="/chat" className="text-blue-600 hover:underline">Chat</Link>,
          monitor them on the{" "}
          <Link to="/org" className="text-blue-600 hover:underline">Org Chart</Link>,
          and track progress on the{" "}
          <Link to="/board" className="text-blue-600 hover:underline">Board</Link>.
        </p>
      </section>

      {/* Workflows */}
      <section>
        <h3 className="text-base font-semibold text-slate-800">Common Workflows</h3>
        <div className="mt-3 space-y-4">
          {WORKFLOWS.map((wf) => (
            <div key={wf.title} className="rounded border border-slate-200 bg-white p-4">
              <h4 className="text-sm font-medium text-slate-700">{wf.title}</h4>
              <ol className="mt-2 space-y-1">
                {wf.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-400">{i + 1}.</span>
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
        <h3 className="text-base font-semibold text-slate-800">Chat Commands</h3>
        <p className="mt-1 text-sm text-slate-600">
          Type these commands in the chat input for quick actions:
        </p>
        <div className="mt-2 space-y-1">
          {CHAT_COMMANDS.map((cmd) => (
            <div key={cmd.command} className="flex items-baseline gap-3 rounded bg-slate-50 px-3 py-2">
              <code className="text-sm font-medium text-blue-700">{cmd.command}</code>
              <span className="text-xs text-slate-600">{cmd.description}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Agent Tools */}
      <section>
        <h3 className="text-base font-semibold text-slate-800">Agent Tools Reference</h3>
        <p className="mt-1 text-sm text-slate-600">
          Every tool available to agents is also accessible via the API. Agents use these
          tools to interact with the platform:
        </p>
        <div className="mt-3 space-y-4">
          {TOOL_CATEGORIES.map((cat) => (
            <div key={cat.name}>
              <h4 className="text-sm font-medium text-slate-700">{cat.name}</h4>
              <div className="mt-1 space-y-0.5">
                {cat.tools.map((tool) => (
                  <div key={tool.name} className="flex items-baseline gap-3 py-1">
                    <code className="text-xs text-slate-500">{tool.name}</code>
                    <span className="text-xs text-slate-600">{tool.description}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Suggested Prompts */}
      <section>
        <h3 className="text-base font-semibold text-slate-800">Suggested Prompts</h3>
        <p className="mt-1 text-sm text-slate-600">
          Try these in <Link to="/chat" className="text-blue-600 hover:underline">Chat</Link> to get started:
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
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
            >
              {prompt}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
