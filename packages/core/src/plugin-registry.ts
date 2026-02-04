import type { GcPlugin, PluginManifest } from "@generic-corp/sdk";

export type PluginState = "discovered" | "registered" | "initialized" | "ready" | "error" | "shutdown";

export interface PluginEntry {
  instance: GcPlugin;
  manifest: PluginManifest;
  state: PluginState;
  error?: string;
}

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginEntry>();

  register(plugin: GcPlugin): void {
    const id = plugin.manifest.id;
    if (this.plugins.has(id)) {
      throw new Error(`Plugin "${id}" is already registered`);
    }
    this.plugins.set(id, {
      instance: plugin,
      manifest: plugin.manifest,
      state: "registered",
    });
  }

  get(id: string): PluginEntry | undefined {
    return this.plugins.get(id);
  }

  has(id: string): boolean {
    return this.plugins.has(id);
  }

  getByTag(tag: string): PluginEntry[] {
    return [...this.plugins.values()].filter(
      (entry) => entry.manifest.tags.includes(tag),
    );
  }

  getAll(): PluginEntry[] {
    return [...this.plugins.values()];
  }

  setState(id: string, state: PluginState, error?: string): void {
    const entry = this.plugins.get(id);
    if (!entry) {
      throw new Error(`Plugin "${id}" not found in registry`);
    }
    entry.state = state;
    if (error !== undefined) {
      entry.error = error;
    }
  }

  get size(): number {
    return this.plugins.size;
  }
}
