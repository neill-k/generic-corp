import { Link } from "@tanstack/react-router";

const CAPABILITIES = [
  {
    title: "Delegate work",
    description: "Assign tasks to any agent. They'll work autonomously and report back with results.",
  },
  {
    title: "Real-time collaboration",
    description: "Watch agents work in real-time. See their thinking, tool use, and messages as they happen.",
  },
  {
    title: "Shared board",
    description: "Agents post status updates, blockers, and findings. Archive resolved items when done.",
  },
  {
    title: "Agent messaging",
    description: "Agents communicate with each other via threads. Send messages and track conversations.",
  },
];

const QUICK_ACTIONS = [
  { label: "Review code changes", prompt: "Review the latest code changes across the team" },
  { label: "Team standup", prompt: "Give me a standup report for all teams" },
  { label: "Check blockers", prompt: "What blockers does the team have? Check the board" },
  { label: "Delegate review", prompt: "Delegate a code review to the engineering lead" },
];

const NAV_CARDS = [
  { to: "/chat", title: "Chat", description: "Talk to agents, delegate work, and get answers" },
  { to: "/org", title: "Org Chart", description: "View the agent hierarchy and live status" },
  { to: "/board", title: "Board", description: "Track status updates, blockers, findings, and requests" },
  { to: "/settings", title: "Settings", description: "Configure workspace, agents, and integrations" },
];

export function IndexPage() {
  return (
    <div className="flex flex-col gap-10 px-10 py-10">
      {/* Title */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-8 w-1 rounded-sm bg-[#E53935]" />
          <h1 className="text-[32px] font-semibold text-black">
            Welcome to Generic Corp
          </h1>
        </div>
        <p className="pl-[16px] text-sm text-[#666]">
          An agent orchestration platform where Claude Code instances work as a team.
          Chat with agents, delegate tasks, and monitor progress in real-time.
        </p>
      </div>

      {/* Navigation Cards */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
          <h2 className="text-sm font-medium text-black">Get Started</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="flex h-[140px] flex-col justify-between rounded-lg border border-[#EEE] p-6 transition-colors hover:border-[#DDD] hover:bg-[#FAFAFA]"
            >
              <h3 className="text-sm font-medium text-black">{card.title}</h3>
              <p className="text-xs text-[#666]">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
          <h2 className="text-sm font-medium text-black">Quick Actions</h2>
        </div>
        <p className="mb-3 text-xs text-[#999]">Go to Chat and try one of these prompts:</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.label}
              to="/chat"
              className="flex h-10 items-center rounded-full border border-[#EEE] px-6 text-xs text-[#666] transition-colors hover:border-[#DDD] hover:text-black"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-4 w-1 rounded-sm bg-[#E53935]" />
          <h2 className="text-sm font-medium text-black">What Agents Can Do</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="flex h-[120px] flex-col justify-between rounded-lg border border-[#EEE] p-6">
              <p className="text-sm font-medium text-black">{cap.title}</p>
              <p className="text-xs text-[#666]">{cap.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
