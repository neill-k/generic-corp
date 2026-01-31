import type { AgentEvent } from "./agent-lifecycle.js";
import { EventBus } from "./event-bus.js";

export type AppEventMap = {
  agent_event: { agentId: string; taskId: string; event: AgentEvent };
  agent_status_changed: { agentId: string; status: string };
  task_status_changed: { taskId: string; status: string };
  task_created: { taskId: string; assignee: string; delegator: string | null };
  message_created: { messageId: string; threadId: string; fromAgentId: string | null; toAgentId: string };
  board_item_created: { type: string; author: string; path: string };
  board_item_archived: { path: string; archivedPath: string };
  agent_updated: { agentId: string };
  agent_deleted: { agentId: string };
  message_updated: { messageId: string };
  message_deleted: { messageId: string };
};

export const appEventBus = new EventBus<AppEventMap>();
