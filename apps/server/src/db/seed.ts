import { db } from "./client.js";
import { AGENT_SEED, TOOL_PERMISSION_SEED, DEFAULT_WORKSPACE } from "./seed-data.js";
import { MAIN_AGENT_NAME } from "@generic-corp/shared";

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

  // 4) Upsert org nodes (skip main agent — it has no org position)
  const orgAgents = AGENT_SEED.filter((a) => a.name !== MAIN_AGENT_NAME);
  const root = orgAgents.find((a) => a.reportsTo === null);
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

  const pending = orgAgents.filter((a) => a.name !== root.name);

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
  console.log("[Seed] Upserted org hierarchy");
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
