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

export function IndexPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Welcome to Generic Corp</h2>
        <p className="mt-1 text-sm text-slate-600">
          An agent orchestration platform where Claude Code instances work as a team.
          Chat with agents, delegate tasks, and monitor progress in real-time.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link to="/chat" className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400">
          <h3 className="font-medium">Chat</h3>
          <p className="text-sm text-slate-500">Talk to agents, delegate work, and get answers</p>
        </Link>
        <Link to="/org" className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400">
          <h3 className="font-medium">Org Chart</h3>
          <p className="text-sm text-slate-500">View the agent hierarchy and live status</p>
        </Link>
        <Link to="/board" className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400">
          <h3 className="font-medium">Board</h3>
          <p className="text-sm text-slate-500">Track status updates, blockers, findings, and requests</p>
        </Link>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">What agents can do</h3>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="rounded border border-slate-100 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-700">{cap.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{cap.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
