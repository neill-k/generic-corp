import { Connection, Client, WorkflowHandle } from "@temporalio/client";
import { agentTaskWorkflow, scheduledAgentTaskWorkflow, getWorkflowStatus } from "./workflows/agentTaskWorkflow.js";
import type { AgentTaskWorkflowInput, AgentTaskWorkflowOutput } from "./workflows/agentTaskWorkflow.js";
import { TASK_QUEUE } from "./workers/index.js";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";

let client: Client | null = null;

/**
 * Get or create the Temporal client
 */
export async function getTemporalClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const connection = await Connection.connect({
    address: TEMPORAL_ADDRESS,
  });

  client = new Client({
    connection,
    namespace: "default",
  });

  return client;
}

/**
 * Start an agent task workflow
 */
export async function startAgentTaskWorkflow(
  input: AgentTaskWorkflowInput
): Promise<WorkflowHandle<typeof agentTaskWorkflow>> {
  const temporalClient = await getTemporalClient();

  const workflowId = `agent-task-${input.taskId}`;

  const handle = await temporalClient.workflow.start(agentTaskWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [input],
  });

  console.log(`[Temporal] Started workflow ${workflowId}`);

  return handle;
}

/**
 * Start a scheduled agent task workflow
 */
export async function startScheduledAgentTaskWorkflow(
  input: AgentTaskWorkflowInput & { scheduleId: string }
): Promise<WorkflowHandle<typeof scheduledAgentTaskWorkflow>> {
  const temporalClient = await getTemporalClient();

  const workflowId = `scheduled-task-${input.scheduleId}-${Date.now()}`;

  const handle = await temporalClient.workflow.start(scheduledAgentTaskWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [input],
  });

  console.log(`[Temporal] Started scheduled workflow ${workflowId}`);

  return handle;
}

/**
 * Get the status of a running workflow
 */
export async function getWorkflowExecutionStatus(
  taskId: string
): Promise<{
  status: string;
  progress: number;
  currentStep: string;
} | null> {
  const temporalClient = await getTemporalClient();
  const workflowId = `agent-task-${taskId}`;

  try {
    const handle = temporalClient.workflow.getHandle(workflowId);
    const status = await handle.query(getWorkflowStatus);
    return status;
  } catch (error) {
    // Workflow might not exist or be completed
    return null;
  }
}

/**
 * Wait for a workflow to complete and get its result
 */
export async function waitForWorkflowResult(
  taskId: string
): Promise<AgentTaskWorkflowOutput | null> {
  const temporalClient = await getTemporalClient();
  const workflowId = `agent-task-${taskId}`;

  try {
    const handle = temporalClient.workflow.getHandle(workflowId);
    const result = await handle.result();
    return result;
  } catch (error) {
    console.error(`[Temporal] Error waiting for workflow ${workflowId}:`, error);
    return null;
  }
}

/**
 * Cancel a running workflow
 */
export async function cancelWorkflow(taskId: string): Promise<boolean> {
  const temporalClient = await getTemporalClient();
  const workflowId = `agent-task-${taskId}`;

  try {
    const handle = temporalClient.workflow.getHandle(workflowId);
    await handle.cancel();
    console.log(`[Temporal] Cancelled workflow ${workflowId}`);
    return true;
  } catch (error) {
    console.error(`[Temporal] Error cancelling workflow ${workflowId}:`, error);
    return false;
  }
}

/**
 * Close the Temporal client connection
 */
export async function closeTemporalClient(): Promise<void> {
  if (client) {
    await client.connection.close();
    client = null;
  }
}
