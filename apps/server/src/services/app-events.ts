import type { AgentEvent } from "./agent-lifecycle.js";
import { EventBus } from "./event-bus.js";

export type AppEventMap = {
  agent_event: { agentId: string; taskId: string; event: AgentEvent };
  agent_status_changed: { agentId: string; status: string };
  task_status_changed: { taskId: string; status: string };
};

export const appEventBus = new EventBus<AppEventMap>();
