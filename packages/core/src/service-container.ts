import type {
  Provider,
  IdentityProvider,
  StorageProvider,
  VaultProvider,
  RuntimeProvider,
} from "@generic-corp/sdk";

export interface ProviderSlots {
  identity: IdentityProvider;
  storage: StorageProvider;
  vault: VaultProvider;
  runtime: RuntimeProvider;
}

export type ProviderType = keyof ProviderSlots;

interface ProviderEntry<T extends Provider> {
  provider: T;
  primary: boolean;
}

export class ServiceContainer {
  private readonly providers = new Map<string, ProviderEntry<Provider>[]>();

  register<K extends ProviderType>(
    type: K,
    provider: ProviderSlots[K],
    primary = false,
  ): void {
    const entries = this.providers.get(type) ?? [];

    if (primary) {
      // Demote existing primary
      for (const entry of entries) {
        entry.primary = false;
      }
    }

    entries.push({ provider, primary: primary || entries.length === 0 });
    this.providers.set(type, entries);
  }

  get<K extends ProviderType>(type: K): ProviderSlots[K] | undefined {
    const entries = this.providers.get(type);
    if (!entries || entries.length === 0) return undefined;

    const primary = entries.find((e) => e.primary);
    return (primary ?? entries[0])?.provider as ProviderSlots[K] | undefined;
  }

  getAll<K extends ProviderType>(type: K): ProviderSlots[K][] {
    const entries = this.providers.get(type) ?? [];
    return entries.map((e) => e.provider) as ProviderSlots[K][];
  }

  has(type: ProviderType): boolean {
    const entries = this.providers.get(type);
    return entries !== undefined && entries.length > 0;
  }

  async initializeAll(): Promise<void> {
    for (const entries of this.providers.values()) {
      for (const entry of entries) {
        await entry.provider.initialize();
      }
    }
  }

  async disposeAll(): Promise<void> {
    for (const entries of this.providers.values()) {
      for (const entry of entries) {
        await entry.provider.dispose();
      }
    }
  }
}
