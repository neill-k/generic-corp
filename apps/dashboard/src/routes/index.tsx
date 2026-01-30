import { Link } from "@tanstack/react-router";

export function IndexPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>
      <p className="text-sm text-slate-600">
        Welcome to Generic Corp. Select a view from the sidebar.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <Link to="/chat" className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400">
          <h3 className="font-medium">Chat</h3>
          <p className="text-sm text-slate-500">Talk to the CEO agent</p>
        </Link>
        <Link to="/org" className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400">
          <h3 className="font-medium">Org Chart</h3>
          <p className="text-sm text-slate-500">View agent hierarchy</p>
        </Link>
        <Link to="/board" className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-blue-400">
          <h3 className="font-medium">Board</h3>
          <p className="text-sm text-slate-500">Status updates and blockers</p>
        </Link>
      </div>
    </div>
  );
}
