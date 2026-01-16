import { EventEmitter } from "events";

// Typed event bus for internal server communication
type EventMap = {
  "agent:status": { agentId: string; status: string; taskId?: string };
  "task:queued": { agentId: string; task: any };
  "task:progress": { taskId: string; progress: number; details?: Record<string, unknown> };
  "task:completed": { taskId: string; result: any };
  "task:failed": { taskId: string; error: string };
  "message:new": { toAgentId: string; message: any };
  "draft:pending": { draftId: string; fromAgent: string; content: any };
  "draft:rejected": { draftId: string; reason?: string };
  "activity:log": { agentId: string; eventType: string; eventData?: Record<string, unknown> };
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
