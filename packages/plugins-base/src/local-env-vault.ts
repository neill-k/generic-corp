import { readFile } from "node:fs/promises";
import { GcPlugin, VaultProvider } from "@generic-corp/sdk";
import type { PluginManifest, PluginContext } from "@generic-corp/sdk";

export class EnvVaultProvider extends VaultProvider {
  readonly providerId = "local-env-vault";
  readonly providerName = "Local .env Vault";
  private envEntries = new Map<string, string>();
  private readonly envPath: string;

  constructor(envPath: string) {
    super();
    this.envPath = envPath;
  }

  override async initialize(): Promise<void> {
    await this.loadEnvFile();
  }

  private async loadEnvFile(): Promise<void> {
    try {
      const content = await readFile(this.envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // Strip surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        this.envEntries.set(key, value);
      }
    } catch {
      // .env file not found — that's okay, fall back to process.env
    }
  }

  override async resolve(secretName: string): Promise<string | undefined> {
    // .env file entries take priority, then process.env
    return this.envEntries.get(secretName) ?? process.env[secretName];
  }

  override async exists(secretName: string): Promise<boolean> {
    return this.envEntries.has(secretName) || process.env[secretName] !== undefined;
  }

  override async listPlaceholders(): Promise<string[]> {
    const keys = new Set([...this.envEntries.keys()]);
    for (const key of Object.keys(process.env)) {
      keys.add(key);
    }
    return [...keys].sort();
  }
}

export class LocalEnvVaultPlugin extends GcPlugin {
  readonly manifest: PluginManifest = {
    id: "local-env-vault",
    name: "Local .env Vault",
    version: "0.1.0",
    description: "Reads secrets from .env files and process.env",
    author: "Generic Corp",
    license: "FSL-1.1-MIT",
    tags: ["vault", "local"],
  };

  private provider: EnvVaultProvider | null = null;

  override async onRegister(context: PluginContext): Promise<void> {
    const envPath = context.config.get<string>("envPath", ".env");
    this.provider = new EnvVaultProvider(envPath);
    (context.services as unknown as { register: (type: string, provider: VaultProvider, primary: boolean) => void }).register?.("vault", this.provider, true);
  }

  override async onInitialize(): Promise<void> {
    if (this.provider) {
      await this.provider.initialize();
    }
  }
}
