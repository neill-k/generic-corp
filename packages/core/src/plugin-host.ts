import type {
  GcPlugin,
  PluginContext,
  PluginLogger,
  PluginConfig,
  ServiceAccessor,
} from "@generic-corp/sdk";
import { EventBus } from "./event-bus.js";
import type { CoreEventMap } from "./app-events.js";
import { PluginRegistry } from "./plugin-registry.js";
import { ServiceContainer } from "./service-container.js";
import type { ProviderType, ProviderSlots } from "./service-container.js";
import { HookRunner } from "./hook-runner.js";
import { VaultResolver } from "./vault-resolver.js";
import { McpServerFactory } from "./mcp-factory.js";
import { UiRegistry } from "./ui-registry.js";

export interface PluginHostConfig {
  eventBus?: EventBus<CoreEventMap>;
  pluginConfig?: Record<string, Record<string, unknown>>;
}

export class PluginHost {
  private readonly registry: PluginRegistry;
  private readonly services: ServiceContainer;
  private readonly hookRunner: HookRunner;
  private readonly vaultResolver: VaultResolver;
  private readonly mcpFactory: McpServerFactory;
  private readonly uiRegistry: UiRegistry;
  private readonly eventBus: EventBus<CoreEventMap>;
  private readonly pluginConfig: Record<string, Record<string, unknown>>;

  constructor(config: PluginHostConfig = {}) {
    this.eventBus = config.eventBus ?? new EventBus<CoreEventMap>();
    this.pluginConfig = config.pluginConfig ?? {};
    this.registry = new PluginRegistry();
    this.services = new ServiceContainer();
    this.hookRunner = new HookRunner();
    this.vaultResolver = new VaultResolver();
    this.mcpFactory = new McpServerFactory(this.hookRunner, this.vaultResolver);
    this.uiRegistry = new UiRegistry();
  }

  registerPlugin(plugin: GcPlugin): void {
    this.registry.register(plugin);
    this.eventBus.emit("plugin_registered", {
      pluginId: plugin.manifest.id,
      name: plugin.manifest.name,
      version: plugin.manifest.version,
    });
    console.log(`[PluginHost] Registered: ${plugin.manifest.id} v${plugin.manifest.version}`);
  }

  async initializeAll(): Promise<void> {
    const plugins = this.registry.getAll();

    // Phase 1: onRegister
    for (const entry of plugins) {
      if (entry.state !== "registered") continue;
      try {
        const ctx = this.createContext(entry.instance);
        await entry.instance.onRegister(ctx);
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        this.registry.setState(entry.manifest.id, "error", msg);
        this.eventBus.emit("plugin_error", { pluginId: entry.manifest.id, error: msg });
        console.error(`[PluginHost] Register failed: ${entry.manifest.id}: ${msg}`);
      }
    }

    // Wire vault provider after registration
    const vault = this.services.get("vault");
    if (vault) {
      this.vaultResolver.setVaultProvider(vault);
    }

    // Phase 2: onInitialize
    for (const entry of plugins) {
      if (entry.state !== "registered") continue;
      try {
        const ctx = this.createContext(entry.instance);
        await entry.instance.onInitialize(ctx);
        this.registry.setState(entry.manifest.id, "initialized");
        this.eventBus.emit("plugin_initialized", { pluginId: entry.manifest.id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        this.registry.setState(entry.manifest.id, "error", msg);
        this.eventBus.emit("plugin_error", { pluginId: entry.manifest.id, error: msg });
        console.error(`[PluginHost] Initialize failed: ${entry.manifest.id}: ${msg}`);
      }
    }

    // Phase 3: onReady
    for (const entry of plugins) {
      if (entry.state !== "initialized") continue;
      try {
        const ctx = this.createContext(entry.instance);
        await entry.instance.onReady(ctx);
        this.registry.setState(entry.manifest.id, "ready");
        this.eventBus.emit("plugin_ready", { pluginId: entry.manifest.id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        this.registry.setState(entry.manifest.id, "error", msg);
        this.eventBus.emit("plugin_error", { pluginId: entry.manifest.id, error: msg });
        console.error(`[PluginHost] Ready failed: ${entry.manifest.id}: ${msg}`);
      }
    }

    // Initialize all service providers
    await this.services.initializeAll();

    console.log("[PluginHost] All plugins ready");
  }

  async shutdownAll(): Promise<void> {
    const plugins = this.registry.getAll();

    for (const entry of plugins) {
      if (entry.state === "shutdown" || entry.state === "error") continue;
      try {
        await entry.instance.onShutdown();
        this.registry.setState(entry.manifest.id, "shutdown");
        this.eventBus.emit("plugin_shutdown", { pluginId: entry.manifest.id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[PluginHost] Shutdown failed: ${entry.manifest.id}: ${msg}`);
      }
    }

    await this.services.disposeAll();
    this.vaultResolver.clearResolvedSecrets();
  }

  getRegistry(): PluginRegistry {
    return this.registry;
  }

  getEventBus(): EventBus<CoreEventMap> {
    return this.eventBus;
  }

  getServices(): ServiceContainer {
    return this.services;
  }

  getHookRunner(): HookRunner {
    return this.hookRunner;
  }

  getVaultResolver(): VaultResolver {
    return this.vaultResolver;
  }

  getMcpFactory(): McpServerFactory {
    return this.mcpFactory;
  }

  getUiRegistry(): UiRegistry {
    return this.uiRegistry;
  }

  private createContext(plugin: GcPlugin): PluginContext {
    const pluginId = plugin.manifest.id;
    this.uiRegistry.setCurrentPluginId(pluginId);

    const serviceAccessor: ServiceAccessor = {
      get: <T>(type: string): T => {
        const provider = this.services.get(type as ProviderType);
        if (!provider) throw new Error(`No provider registered for type "${type}"`);
        return provider as unknown as T;
      },
      has: (type: string): boolean => {
        return this.services.has(type as ProviderType);
      },
    };

    const logger: PluginLogger = {
      info: (msg: string, ...args: unknown[]) => console.log(`[Plugin:${pluginId}]`, msg, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(`[Plugin:${pluginId}]`, msg, ...args),
      error: (msg: string, ...args: unknown[]) => console.error(`[Plugin:${pluginId}]`, msg, ...args),
      debug: (msg: string, ...args: unknown[]) => console.debug(`[Plugin:${pluginId}]`, msg, ...args),
    };

    const pluginConfigData = this.pluginConfig[pluginId] ?? {};
    const config: PluginConfig = {
      get: <T>(key: string, defaultValue?: T): T | undefined => {
        const val = pluginConfigData[key];
        return val !== undefined ? val as T : defaultValue;
      },
      getRequired: <T>(key: string): T => {
        const val = pluginConfigData[key];
        if (val === undefined) throw new Error(`Required config "${key}" not found for plugin "${pluginId}"`);
        return val as T;
      },
    };

    return {
      eventBus: this.eventBus,
      services: serviceAccessor,
      hooks: this.hookRunner,
      ui: this.uiRegistry,
      logger,
      config,
    };
  }

  registerService<K extends ProviderType>(type: K, provider: ProviderSlots[K], primary = false): void {
    this.services.register(type, provider, primary);
    this.eventBus.emit("service_registered", {
      type,
      providerId: provider.providerId,
      primary,
    });
  }
}
