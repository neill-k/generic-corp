import type { PluginEventBus } from "./events.js";
import type { HookRegistrar } from "./hooks.js";
import type { UiExtensionRegistrar } from "./ui.js";

export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly license: string;
  readonly tags: string[];
  readonly requires?: string[];
}

export interface PluginLogger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

export interface PluginConfig {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  getRequired<T>(key: string): T;
}

export interface ServiceAccessor {
  get<T>(type: string): T;
  has(type: string): boolean;
}

export interface PluginContext {
  readonly eventBus: PluginEventBus;
  readonly services: ServiceAccessor;
  readonly hooks: HookRegistrar;
  readonly ui: UiExtensionRegistrar;
  readonly logger: PluginLogger;
  readonly config: PluginConfig;
}

export abstract class GcPlugin {
  abstract readonly manifest: PluginManifest;

  async onRegister(_context: PluginContext): Promise<void> {
    // Override in subclass
  }

  async onInitialize(_context: PluginContext): Promise<void> {
    // Override in subclass
  }

  async onReady(_context: PluginContext): Promise<void> {
    // Override in subclass
  }

  async onShutdown(): Promise<void> {
    // Override in subclass
  }
}

export function validateManifest(manifest: PluginManifest): string[] {
  const errors: string[] = [];
  if (!manifest.id || typeof manifest.id !== "string") {
    errors.push("manifest.id is required and must be a non-empty string");
  }
  if (!manifest.name || typeof manifest.name !== "string") {
    errors.push("manifest.name is required and must be a non-empty string");
  }
  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("manifest.version is required and must be a non-empty string");
  }
  if (!manifest.description || typeof manifest.description !== "string") {
    errors.push("manifest.description is required and must be a non-empty string");
  }
  if (!manifest.author || typeof manifest.author !== "string") {
    errors.push("manifest.author is required and must be a non-empty string");
  }
  if (!manifest.license || typeof manifest.license !== "string") {
    errors.push("manifest.license is required and must be a non-empty string");
  }
  if (!Array.isArray(manifest.tags)) {
    errors.push("manifest.tags must be an array");
  }
  if (manifest.requires !== undefined && !Array.isArray(manifest.requires)) {
    errors.push("manifest.requires must be an array if provided");
  }
  return errors;
}
