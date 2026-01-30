import { useParams } from "@tanstack/react-router";

export function AgentDetailPage() {
  const { id } = useParams({ from: "/agents/$id" });

  return (
    <div>
      <h2 className="text-xl font-semibold">Agent: {id}</h2>
      <p className="mt-2 text-sm text-slate-500">Agent detail — coming in B5.</p>
    </div>
  );
}
