/**
 * Temporal Client
 *
 * Provides methods to start and interact with Temporal workflows.
 */

import { Client, Connection } from "@temporalio/client";
import { agentTaskWorkflow, agentLifecycleWorkflow, newMessageSignal } from "./workflows/agentWorkflows.js";

const TASK_QUEUE = "agent-tasks";

let client: Client | null = null;

/**
 * Get or create the Temporal client
 */
export async function getTemporalClient(): Promise<Client> {
  if (client) return client;

  const temporalAddress = process.env.TEMPORAL_ADDRESS || "localhost:7233";

  console.log(`[Temporal Client] Connecting to ${temporalAddress}...`);

  const connection = await Connection.connect({
    address: temporalAddress,
  });

  client = new Client({
    connection,
    namespace: "default",
  });

  console.log("[Temporal Client] Connected");
  return client;
}

/**
 * Start an agent task workflow
 */
export async function startAgentTaskWorkflow(input: {
  taskId: string;
  agentId: string;
  agentName: string;
  title: string;
  description: string;
  priority: string;
}): Promise<string> {
  const c = await getTemporalClient();

  const handle = await c.workflow.start(agentTaskWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId: `task-${input.taskId}`,
    args: [input],
  });

  console.log(`[Temporal] Started task workflow: ${handle.workflowId}`);
  return handle.workflowId;
}

/**
 * Start an agent lifecycle workflow (long-running)
 */
export async function startAgentLifecycleWorkflow(input: {
  agentId: string;
  agentName: string;
}): Promise<string> {
  const c = await getTemporalClient();

  const workflowId = `agent-lifecycle-${input.agentId}`;

  // Check if workflow already exists
  try {
    const existing = c.workflow.getHandle(workflowId);
    const description = await existing.describe();
    if (description.status.name === "RUNNING") {
      console.log(`[Temporal] Agent lifecycle workflow already running: ${workflowId}`);
      return workflowId;
    }
  } catch {
    // Workflow doesn't exist, create it
  }

  const handle = await c.workflow.start(agentLifecycleWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [input],
  });

  console.log(`[Temporal] Started agent lifecycle workflow: ${handle.workflowId}`);
  return handle.workflowId;
}

/**
 * Signal an agent that they have a new message
 */
export async function signalNewMessage(
  agentId: string,
  message: { messageId: string; fromAgentName: string; subject: string }
): Promise<void> {
  const c = await getTemporalClient();

  const workflowId = `agent-lifecycle-${agentId}`;

  try {
    const handle = c.workflow.getHandle(workflowId);
    await handle.signal(newMessageSignal, message);
    console.log(`[Temporal] Signaled new message to ${workflowId}`);
  } catch (error) {
    console.warn(`[Temporal] Could not signal workflow ${workflowId}:`, error);
    // Workflow might not be running yet - that's ok, periodic check will pick it up
  }
}

/**
 * Get the status of an agent lifecycle workflow
 */
export async function getAgentWorkflowStatus(agentId: string): Promise<{
  running: boolean;
  status?: string;
}> {
  const c = await getTemporalClient();

  const workflowId = `agent-lifecycle-${agentId}`;

  try {
    const handle = c.workflow.getHandle(workflowId);
    const description = await handle.describe();
    return {
      running: description.status.name === "RUNNING",
      status: description.status.name,
    };
  } catch {
    return { running: false };
  }
}

/**
 * Initialize agent lifecycle workflows for all agents
 */
export async function initializeAgentLifecycles(): Promise<void> {
  // Import here to avoid circular dependencies
  const { db } = await import("../db/index.js");

  const agents = await db.agent.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  console.log(`[Temporal] Initializing lifecycle workflows for ${agents.length} agents...`);

  for (const agent of agents) {
    await startAgentLifecycleWorkflow({
      agentId: agent.id,
      agentName: agent.name,
    });
  }

  console.log("[Temporal] Agent lifecycle workflows initialized");
}

/**
 * Shutdown the Temporal client
 */
export async function shutdownTemporalClient(): Promise<void> {
  if (client) {
    // Client doesn't have a close method in newer versions
    client = null;
  }
}
