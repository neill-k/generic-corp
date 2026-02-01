// Pre-computed positions for org chart nodes
// Coordinates are in a 1920x1080 world space
// Layout: User at top, CEO below, then branches fill the frame

type NodePosition = {
  id: string;
  x: number;
  y: number;
};

// Org chart layout — wider, more centered, bigger spacing
export const ORG_POSITIONS: NodePosition[] = [
  { id: "marcus", x: 960, y: 260 },    // CEO — top center
  { id: "sable", x: 560, y: 480 },     // CTO — left branch
  { id: "vivian", x: 1360, y: 480 },   // Design Lead — right branch
  { id: "marta", x: 560, y: 720 },     // Engineering Lead — under CTO
  { id: "noah", x: 360, y: 920 },      // Backend — left leaf
  { id: "priya", x: 760, y: 920 },     // Frontend — right leaf
];

// User node sits above Marcus
export const USER_POSITION: NodePosition = {
  id: "user",
  x: 960,
  y: 80,
};

// Edges connecting org nodes
export type OrgEdge = {
  from: string;
  to: string;
};

export const ORG_EDGES: OrgEdge[] = [
  { from: "marcus", to: "sable" },
  { from: "marcus", to: "vivian" },
  { from: "sable", to: "marta" },
  { from: "marta", to: "noah" },
  { from: "marta", to: "priya" },
];

export const getPosition = (id: string) => {
  if (id === "user") return USER_POSITION;
  return ORG_POSITIONS.find((p) => p.id === id)!;
};
