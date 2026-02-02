import { VAULT_PLACEHOLDER_REGEX } from "@generic-corp/sdk";
import type { VaultProvider } from "@generic-corp/sdk";
import type { VaultResolutionResult } from "@generic-corp/sdk";

export class VaultResolver {
  private vault: VaultProvider | null = null;
  private resolvedSecrets = new Map<string, string>();

  setVaultProvider(vault: VaultProvider | null): void {
    this.vault = vault;
  }

  async resolveString(text: string): Promise<VaultResolutionResult> {
    const regex = new RegExp(VAULT_PLACEHOLDER_REGEX.source, "g");
    const placeholders = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        placeholders.add(match[1]);
      }
    }

    if (placeholders.size === 0) {
      return { resolved: text, placeholdersFound: 0, placeholdersResolved: 0, unresolved: [] };
    }

    if (!this.vault) {
      return {
        resolved: text,
        placeholdersFound: placeholders.size,
        placeholdersResolved: 0,
        unresolved: [...placeholders],
      };
    }

    const unresolved: string[] = [];
    let resolved = text;
    let resolvedCount = 0;

    for (const name of placeholders) {
      const value = await this.vault.resolve(name);
      if (value !== undefined) {
        const pattern = new RegExp(`\\{\\{${name}\\}\\}`, "g");
        resolved = resolved.replace(pattern, value);
        this.resolvedSecrets.set(name, value);
        resolvedCount++;
      } else {
        unresolved.push(name);
      }
    }

    return {
      resolved,
      placeholdersFound: placeholders.size,
      placeholdersResolved: resolvedCount,
      unresolved,
    };
  }

  async resolveInput(args: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.deepResolve(args) as Promise<Record<string, unknown>>;
  }

  private async deepResolve(value: unknown): Promise<unknown> {
    if (typeof value === "string") {
      const result = await this.resolveString(value);
      return result.resolved;
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map((item) => this.deepResolve(item)));
    }
    if (value !== null && typeof value === "object") {
      const resolved: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        resolved[k] = await this.deepResolve(v);
      }
      return resolved;
    }
    return value;
  }

  scrubSecrets(text: string): string {
    let scrubbed = text;
    for (const [, value] of this.resolvedSecrets) {
      if (value.length >= 4) {
        scrubbed = scrubbed.replaceAll(value, "***REDACTED***");
      }
    }
    return scrubbed;
  }

  clearResolvedSecrets(): void {
    this.resolvedSecrets.clear();
  }
}
