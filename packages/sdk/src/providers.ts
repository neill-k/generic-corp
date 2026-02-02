import type { AgentEvent, AgentInvocation } from "@generic-corp/shared";

export abstract class Provider {
  abstract readonly providerId: string;
  abstract readonly providerName: string;

  async initialize(): Promise<void> {
    // Override in subclass
  }

  async dispose(): Promise<void> {
    // Override in subclass
  }
}

export interface StorageEntry {
  key: string;
  value: string;
  updatedAt: string;
}

export abstract class StorageProvider extends Provider {
  async get(_namespace: string, _key: string): Promise<string | undefined> {
    return undefined;
  }

  async set(_namespace: string, _key: string, _value: string): Promise<void> {
    // Override in subclass
  }

  async delete(_namespace: string, _key: string): Promise<boolean> {
    return false;
  }

  async list(_namespace: string): Promise<StorageEntry[]> {
    return [];
  }
}

export abstract class VaultProvider extends Provider {
  abstract resolve(secretName: string): Promise<string | undefined>;

  async exists(secretName: string): Promise<boolean> {
    const val = await this.resolve(secretName);
    return val !== undefined;
  }

  async listPlaceholders(): Promise<string[]> {
    return [];
  }
}

export interface IdentityContext {
  userId: string;
  displayName: string;
  roles: string[];
  metadata: Record<string, unknown>;
}

export abstract class IdentityProvider extends Provider {
  async authenticate(_token: string): Promise<IdentityContext | null> {
    return {
      userId: "anonymous",
      displayName: "Anonymous",
      roles: [],
      metadata: {},
    };
  }

  async authorize(_identity: IdentityContext, _permission: string): Promise<boolean> {
    return true;
  }
}

export abstract class RuntimeProvider extends Provider {
  abstract invoke(params: AgentInvocation): AsyncGenerator<AgentEvent>;
}
