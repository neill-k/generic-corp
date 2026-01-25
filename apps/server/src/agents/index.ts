import { BaseAgent } from "./base-agent.js";
import { SableAgent } from "./sable-agent.js";
import { DeVonteAgent } from "./devonte-agent.js";
import { db } from "../db/index.js";

// Agent registry - maps agent names to their implementations
const agentRegistry: Map<string, BaseAgent> = new Map();

/**
 * Initialize all agent instances
 */
export async function initializeAgents() {
  console.log("[Agents] Initializing agent instances...");

  // Load agents from database
  const agents = await db.agent.findMany({
    where: { deletedAt: null },
  });

  // Phase 1: Sable and DeVonte are fully implemented
  const sableAgentRecord = agents.find((a: { name: string }) => a.name === "Sable Chen");
  if (sableAgentRecord) {
    const sable = new SableAgent();
    sable.setAgentRecord(sableAgentRecord);
    agentRegistry.set("Sable Chen", sable);
  }

  const devonteAgentRecord = agents.find((a: { name: string }) => a.name === "DeVonte Jackson");
  if (devonteAgentRecord) {
    const devonte = new DeVonteAgent();
    devonte.setAgentRecord(devonteAgentRecord);
    agentRegistry.set("DeVonte Jackson", devonte);
  }

  // TODO: Add other agents in future phases
  // - MarcusAgent (CEO, coordinator)
  // - YukiAgent (SRE, infrastructure)
  // - GrayAgent (Data engineer)

  console.log(`[Agents] Initialized ${agentRegistry.size} agents`);
}

/**
 * Get an agent instance by name
 */
export function getAgent(name: string): BaseAgent | undefined {
  return agentRegistry.get(name);
}

// Alias for getAgent (for Temporal activities compatibility)
export const getAgentByName = getAgent;

/**
 * Get all initialized agents
 */
export function getAllAgents(): BaseAgent[] {
  return Array.from(agentRegistry.values());
}

/**
 * Check if an agent exists
 */
export function hasAgent(name: string): boolean {
  return agentRegistry.has(name);
}

export { BaseAgent } from "./base-agent.js";
export { SableAgent } from "./sable-agent.js";
export { DeVonteAgent } from "./devonte-agent.js";