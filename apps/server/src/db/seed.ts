import { db } from "./client.js";
import { AGENT_SEED, TOOL_PERMISSION_SEED, DEFAULT_WORKSPACE } from "./seed-data.js";

const X_SPACING = 250;
const Y_SPACING = 150;

/**
 * Compute tree-layout positions for seed org nodes so the canvas
 * isn't all stacked at (0,0).
 */
function computeTreePositions(agents: typeof AGENT_SEED): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Build adjacency list
  const childrenOf = new Map<string | null, string[]>();
  for (const agent of agents) {
    const parent = agent.reportsTo;
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(agent.name);
  }

  let nextX = 0;

  function layout(name: string, depth: number): number {
    const children = childrenOf.get(name) ?? [];

    if (children.length === 0) {
      // Leaf: assign the next available x slot
      positions.set(name, { x: nextX * X_SPACING, y: depth * Y_SPACING });
      nextX++;
      return positions.get(name)!.x;
    }

    // Layout children first
    const childXPositions: number[] = [];
    for (const child of children) {
      childXPositions.push(layout(child, depth + 1));
    }

    // Center this node above its children
    const minX = Math.min(...childXPositions);
    const maxX = Math.max(...childXPositions);
    const centerX = (minX + maxX) / 2;
    positions.set(name, { x: centerX, y: depth * Y_SPACING });
    return centerX;
  }

  // Find roots and lay them out
  const roots = agents.filter((a) => a.reportsTo === null);
  for (const root of roots) {
    layout(root.name, 0);
  }

  return positions;
}

async function main() {
  // 1) Upsert default workspace
  const existingWorkspace = await db.workspace.findFirst();
  if (!existingWorkspace) {
    await db.workspace.create({ data: DEFAULT_WORKSPACE });
    console.log("[Seed] Created default workspace");
  }

  // 2) Upsert tool permissions
  for (const perm of TOOL_PERMISSION_SEED) {
    await db.toolPermission.upsert({
      where: { name: perm.name },
      update: {
        description: perm.description,
        iconName: perm.iconName,
        enabled: perm.enabled,
      },
      create: perm,
    });
  }
  console.log(`[Seed] Upserted ${TOOL_PERMISSION_SEED.length} tool permissions`);

  // 3) Upsert agents
  const agentsByName = new Map<string, { id: string }>();

  for (const agent of AGENT_SEED) {
    const row = await db.agent.upsert({
      where: { name: agent.name },
      update: {
        displayName: agent.displayName,
        role: agent.role,
        department: agent.department,
        level: agent.level,
        personality: agent.personality,
        avatarColor: agent.avatarColor,
      },
      create: {
        name: agent.name,
        displayName: agent.displayName,
        role: agent.role,
        department: agent.department,
        level: agent.level,
        personality: agent.personality,
        avatarColor: agent.avatarColor,
      },
      select: { id: true },
    });
    agentsByName.set(agent.name, row);
  }
  console.log(`[Seed] Upserted ${AGENT_SEED.length} agents`);

  // 4) Compute tree-layout positions
  const treePositions = computeTreePositions(AGENT_SEED);

  // 5) Upsert org nodes with positions
  const root = AGENT_SEED.find((a) => a.reportsTo === null);
  if (!root) throw new Error("Seed data missing root agent");
  const rootId = agentsByName.get(root.name)?.id;
  if (!rootId) throw new Error("Root agent missing after upsert");

  const rootPos = treePositions.get(root.name) ?? { x: 0, y: 0 };
  const rootNode = await db.orgNode.upsert({
    where: { agentId: rootId },
    update: { parentNodeId: null, position: 0, positionX: rootPos.x, positionY: rootPos.y },
    create: { agentId: rootId, parentNodeId: null, position: 0, positionX: rootPos.x, positionY: rootPos.y },
    select: { id: true },
  });

  const nodeIdsByAgentName = new Map<string, string>();
  nodeIdsByAgentName.set(root.name, rootNode.id);

  const pending = AGENT_SEED.filter((a) => a.name !== root.name);

  while (pending.length > 0) {
    const nextIndex = pending.findIndex((a) => a.reportsTo !== null && nodeIdsByAgentName.has(a.reportsTo));
    if (nextIndex === -1) {
      const unresolved = pending.map((a) => `${a.name}→${a.reportsTo}`).join(", ");
      throw new Error(`Seed data has unresolved reporting chain: ${unresolved}`);
    }

    const agent = pending.splice(nextIndex, 1)[0]!;
    const agentId = agentsByName.get(agent.name)?.id;
    if (!agentId) throw new Error(`Agent missing after upsert: ${agent.name}`);

    const parentNodeId = agent.reportsTo ? nodeIdsByAgentName.get(agent.reportsTo) : rootNode.id;
    if (!parentNodeId) throw new Error(`Parent node missing for ${agent.name}`);

    const pos = treePositions.get(agent.name) ?? { x: 0, y: 0 };
    const node = await db.orgNode.upsert({
      where: { agentId },
      update: { parentNodeId, position: 0, positionX: pos.x, positionY: pos.y },
      create: { agentId, parentNodeId, position: 0, positionX: pos.x, positionY: pos.y },
      select: { id: true },
    });
    nodeIdsByAgentName.set(agent.name, node.id);
  }
  console.log("[Seed] Upserted org hierarchy with canvas positions");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error("[DB] seed failed", error);
    await db.$disconnect();
    process.exit(1);
  });
