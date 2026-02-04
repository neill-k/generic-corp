export type AgentRole = "ceo" | "cto" | "engineering-lead" | "engineer" | "design-lead" | "user";

export type AgentStatus = "idle" | "working" | "complete";

export type Agent = {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  parentId: string | null;
  color: string;
};

// The 6 corporate agents
export const AGENTS: Agent[] = [
  {
    id: "marcus",
    name: "Marcus",
    role: "ceo",
    title: "CEO",
    parentId: null,
    color: "#60A5FA", // blue-400
  },
  {
    id: "sable",
    name: "Sable",
    role: "cto",
    title: "CTO",
    parentId: "marcus",
    color: "#A78BFA", // violet-400
  },
  {
    id: "marta",
    name: "Marta",
    role: "engineering-lead",
    title: "Engineering Lead",
    parentId: "sable",
    color: "#F472B6", // pink-400
  },
  {
    id: "noah",
    name: "Noah",
    role: "engineer",
    title: "Backend Engineer",
    parentId: "marta",
    color: "#34D399", // emerald-400
  },
  {
    id: "priya",
    name: "Priya",
    role: "engineer",
    title: "Frontend Engineer",
    parentId: "marta",
    color: "#FBBF24", // amber-400
  },
  {
    id: "vivian",
    name: "Vivian",
    role: "design-lead",
    title: "Design Lead",
    parentId: "marcus",
    color: "#F97316", // orange-400
  },
];

// The user node
export const USER_NODE = {
  id: "user",
  name: "You",
  role: "user" as AgentRole,
  title: "User",
  parentId: null,
  color: "#FFFFFF",
};

export const getAgent = (id: string): Agent =>
  AGENTS.find((a) => a.id === id)!;
