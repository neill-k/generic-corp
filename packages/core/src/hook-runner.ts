import type { HookName, HookContextMap, HookHandler, Unsubscribe } from "@generic-corp/sdk";

interface HookEntry<K extends HookName> {
  handler: HookHandler<K>;
  priority: number;
  id: number;
}

export class HookRunner {
  private readonly hooks = new Map<string, HookEntry<HookName>[]>();
  private nextId = 0;

  tap<K extends HookName>(hookName: K, handler: HookHandler<K>, priority = 100): Unsubscribe {
    const entries = this.hooks.get(hookName) ?? [];
    const id = this.nextId++;
    entries.push({ handler: handler as HookHandler<HookName>, priority, id });
    entries.sort((a, b) => a.priority - b.priority);
    this.hooks.set(hookName, entries);

    return () => {
      const current = this.hooks.get(hookName);
      if (!current) return;
      const idx = current.findIndex((e) => e.id === id);
      if (idx !== -1) {
        current.splice(idx, 1);
      }
      if (current.length === 0) {
        this.hooks.delete(hookName);
      }
    };
  }

  async run<K extends HookName>(hookName: K, context: HookContextMap[K]): Promise<void> {
    const entries = this.hooks.get(hookName);
    if (!entries || entries.length === 0) return;

    let index = 0;
    const next = async (): Promise<void> => {
      if (index >= entries.length) return;
      const entry = entries[index]!;
      index++;
      await entry.handler(context as HookContextMap[HookName], next);
    };

    await next();
  }

  hasHandlers(hookName: HookName): boolean {
    const entries = this.hooks.get(hookName);
    return entries !== undefined && entries.length > 0;
  }
}
