/**
 * Temporal Module
 *
 * Exports Temporal client and utilities for agent workflow orchestration.
 */

export {
  getTemporalClient,
  startAgentTaskWorkflow,
  startAgentLifecycleWorkflow,
  signalNewMessage,
  getAgentWorkflowStatus,
  initializeAgentLifecycles,
  shutdownTemporalClient,
} from "./client.js";

export { runWorker } from "./workers/agentWorker.js";

export {
  agentTaskWorkflow,
  agentLifecycleWorkflow,
  newMessageSignal,
  cancelTaskSignal,
  getStatusQuery,
} from "./workflows/agentWorkflows.js";
