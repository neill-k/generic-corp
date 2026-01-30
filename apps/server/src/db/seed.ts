import { db } from "./client.js";
import { AGENT_SEED } from "./seed-data.js";

async function main() {
  const agentsByName = new Map<string, { id: string }>();

  // 1) Upsert agents
  for (const agent of AGENT_SEED) {
    const row = await db.agent.upsert({
      where: { name: agent.name },
      update: {
        displayName: agent.displayName,
        role: agent.role,
        department: agent.department,
        level: agent.level,
        personality: agent.personality,
      },
      create: {
        name: agent.name,
        displayName: agent.displayName,
        role: agent.role,
        department: agent.department,
        level: agent.level,
        personality: agent.personality,
      },
      select: { id: true },
    });
    agentsByName.set(agent.name, row);
  }

  // 2) Upsert org nodes
  // Create root first for stable linkage.
  const root = AGENT_SEED.find((a) => a.reportsTo === null);
  if (!root) throw new Error("Seed data missing root agent");
  const rootId = agentsByName.get(root.name)?.id;
  if (!rootId) throw new Error("Root agent missing after upsert");

  const rootNode = await db.orgNode.upsert({
    where: { agentId: rootId },
    update: { parentNodeId: null, position: 0 },
    create: { agentId: rootId, parentNodeId: null, position: 0 },
    select: { id: true },
  });

  const nodeIdsByAgentName = new Map<string, string>();
  nodeIdsByAgentName.set(root.name, rootNode.id);

  // Insert remaining nodes in topological order.
  // Since the org is small, a simple loop is fine.
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

    const node = await db.orgNode.upsert({
      where: { agentId },
      update: { parentNodeId, position: 0 },
      create: { agentId, parentNodeId, position: 0 },
      select: { id: true },
    });
    nodeIdsByAgentName.set(agent.name, node.id);
  }
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
