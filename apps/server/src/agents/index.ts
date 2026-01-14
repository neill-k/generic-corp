import { BaseAgent } from "./base-agent.js";
import { SableAgent } from "./sable-agent.js";

// Agent registry - maps agent names to their implementations
const agentRegistry: Map<string, BaseAgent> = new Map();

/**
 * Initialize all agent instances
 */
export function initializeAgents() {
  console.log("[Agents] Initializing agent instances...");

  // Phase 1: Only Sable is fully implemented
  const sable = new SableAgent();
  agentRegistry.set("Sable Chen", sable);

  // TODO: Add other agents in future phases
  // - MarcusAgent (CEO, coordinator)
  // - DeVonteAgent (Full-stack, rapid prototyping)
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
