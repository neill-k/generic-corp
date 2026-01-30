import { BaseAgent } from "./base-agent.js";
import { SableAgent } from "./sable-agent.js";
import { DeVonteAgent } from "./devonte-agent.js";
import { MarcusAgent } from "./marcus-agent.js";
import { YukiAgent } from "./yuki-agent.js";
import { GrayAgent } from "./gray-agent.js";
import { MirandaAgent } from "./miranda-agent.js";
import { HelenAgent } from "./helen-agent.js";
import { WalterAgent } from "./walter-agent.js";
import { FrankieAgent } from "./frankie-agent.js";
import { KenjiAgent } from "./kenji-agent.js";
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

  // Initialize all agents
  const marcusRecord = agents.find((a) => a.name === "Marcus Bell");
  if (marcusRecord) {
    const marcus = new MarcusAgent();
    marcus.setAgentRecord(marcusRecord);
    agentRegistry.set("Marcus Bell", marcus);
  }

  const sableRecord = agents.find((a) => a.name === "Sable Chen");
  if (sableRecord) {
    const sable = new SableAgent();
    sable.setAgentRecord(sableRecord);
    agentRegistry.set("Sable Chen", sable);
  }

  const devonteRecord = agents.find((a) => a.name === "DeVonte Jackson");
  if (devonteRecord) {
    const devonte = new DeVonteAgent();
    devonte.setAgentRecord(devonteRecord);
    agentRegistry.set("DeVonte Jackson", devonte);
  }

  const yukiRecord = agents.find((a) => a.name === "Yuki Tanaka");
  if (yukiRecord) {
    const yuki = new YukiAgent();
    yuki.setAgentRecord(yukiRecord);
    agentRegistry.set("Yuki Tanaka", yuki);
  }

  const grayRecord = agents.find((a) => a.name === "Graham Sutton");
  if (grayRecord) {
    const gray = new GrayAgent();
    gray.setAgentRecord(grayRecord);
    agentRegistry.set("Graham Sutton", gray);
  }

  const mirandaRecord = agents.find((a) => a.name === "Miranda Okonkwo");
  if (mirandaRecord) {
    const miranda = new MirandaAgent();
    miranda.setAgentRecord(mirandaRecord);
    agentRegistry.set("Miranda Okonkwo", miranda);
  }

  const helenRecord = agents.find((a) => a.name === "Helen Marsh");
  if (helenRecord) {
    const helen = new HelenAgent();
    helen.setAgentRecord(helenRecord);
    agentRegistry.set("Helen Marsh", helen);
  }

  const walterRecord = agents.find((a) => a.name === "Walter Huang");
  if (walterRecord) {
    const walter = new WalterAgent();
    walter.setAgentRecord(walterRecord);
    agentRegistry.set("Walter Huang", walter);
  }

  const frankieRecord = agents.find((a) => a.name === "Frankie Deluca");
  if (frankieRecord) {
    const frankie = new FrankieAgent();
    frankie.setAgentRecord(frankieRecord);
    agentRegistry.set("Frankie Deluca", frankie);
  }

  const kenjiRecord = agents.find((a) => a.name === "Kenji Ross");
  if (kenjiRecord) {
    const kenji = new KenjiAgent();
    kenji.setAgentRecord(kenjiRecord);
    agentRegistry.set("Kenji Ross", kenji);
  }

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
export { MarcusAgent } from "./marcus-agent.js";
export { SableAgent } from "./sable-agent.js";
export { DeVonteAgent } from "./devonte-agent.js";
export { YukiAgent } from "./yuki-agent.js";
export { GrayAgent } from "./gray-agent.js";
export { MirandaAgent } from "./miranda-agent.js";
export { HelenAgent } from "./helen-agent.js";
export { WalterAgent } from "./walter-agent.js";
export { FrankieAgent } from "./frankie-agent.js";
export { KenjiAgent } from "./kenji-agent.js";