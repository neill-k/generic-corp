import { useParams } from "@tanstack/react-router";
import { AgentDetail } from "../components/agent/AgentDetail.js";

export function AgentDetailPage() {
  const { id } = useParams({ from: "/agents/$id" });

  return <AgentDetail agentId={id} />;
}
