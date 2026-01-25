import { EventEmitter } from "events";

// Typed event bus for internal server communication
type EventMap = {
  "agent:status": { agentId: string; status: string; taskId?: string; previousStatus?: string; newStatus?: string; message?: string };
  "task:queued": { agentId: string; task: { id: string } };
  "task:progress": { taskId: string; agentId?: string; progress: number; details?: Record<string, unknown> };
  "task:completed": { taskId: string; agentId?: string; result?: unknown };
  "task:failed": { taskId: string; agentId?: string; error: string };
  "task:cancelled": { taskId: string; agentId?: string; reason?: string };
  // Task assignment events (Action Parity)
  "task:assigned": { agentId: string; task: { id: string; title: string } };
  "task:reassigned": { taskId: string; previousAgentId: string | null; newAgentId: string; reason?: string };
  "message:new": { toAgentId: string; message: unknown };
  "draft:pending": { draftId: string; fromAgent: string; content: unknown };
  "draft:rejected": { draftId: string; reason?: string };
  // Draft update events (CRUD Completeness)
  "draft:updated": { draftId: string; updatedBy: string };
  "activity:log": { agentId: string; taskId?: string; eventType?: string; eventData?: Record<string, unknown>; type?: string; agentName?: string; message?: string };
  // Budget events (fixes silent action anti-pattern)
  "budget:updated": { playerId: string; newBalance: number; costUsd: number };
  // Session events (fixes silent action anti-pattern)
  "agent:session-completed": { agentId: string; sessionId: string; status: string; tokensUsed?: { input: number; output: number } };
  // Cron events
  "cron:completed": { jobName: string; runCount: number };
  "cron:failed": { jobName: string; error: string };
  // System events
  "system:health": { database: boolean; timestamp: string };
};

class TypedEventEmitter {
  private emitter = new EventEmitter();

  constructor() {
    // Increase max listeners for busy systems
    this.emitter.setMaxListeners(50);
  }

  on<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this {
    this.emitter.on(event, listener);
    return this;
  }

  off<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this {
    this.emitter.off(event, listener);
    return this;
  }

  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): boolean {
    return this.emitter.emit(event, data);
  }

  once<K extends keyof EventMap>(event: K, listener: (data: EventMap[K]) => void): this {
    this.emitter.once(event, listener);
    return this;
  }
}

// Singleton event bus instance
export const EventBus = new TypedEventEmitter();
