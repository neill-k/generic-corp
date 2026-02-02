export type PluginEventMap = {
  plugin_registered: { pluginId: string; name: string; version: string };
  plugin_initialized: { pluginId: string };
  plugin_ready: { pluginId: string };
  plugin_error: { pluginId: string; error: string };
  plugin_shutdown: { pluginId: string };
  service_registered: { type: string; providerId: string; primary: boolean };
};

export type PluginEventName = keyof PluginEventMap;

export type PluginEventHandler<K extends PluginEventName> = (payload: PluginEventMap[K]) => void;

export interface PluginEventBus {
  on<K extends PluginEventName>(event: K, handler: PluginEventHandler<K>): () => void;
  emit<K extends PluginEventName>(event: K, payload: PluginEventMap[K]): void;
}
