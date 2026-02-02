import { describe, it, expect } from "vitest";
import { VaultResolver } from "./vault-resolver.js";
import { VaultProvider } from "@generic-corp/sdk";

class MockVault extends VaultProvider {
  readonly providerId = "mock";
  readonly providerName = "Mock Vault";
  private readonly secrets = new Map<string, string>([
    ["STRIPE_KEY", "sk_live_abc123"],
    ["GITHUB_TOKEN", "ghp_xyz789"],
  ]);

  async resolve(name: string): Promise<string | undefined> {
    return this.secrets.get(name);
  }
}

describe("VaultResolver", () => {
  it("resolves string with placeholders", async () => {
    const resolver = new VaultResolver();
    resolver.setVaultProvider(new MockVault());

    const result = await resolver.resolveString("Key is {{STRIPE_KEY}}");
    expect(result.resolved).toBe("Key is sk_live_abc123");
    expect(result.placeholdersFound).toBe(1);
    expect(result.placeholdersResolved).toBe(1);
    expect(result.unresolved).toEqual([]);
  });

  it("reports unresolved placeholders", async () => {
    const resolver = new VaultResolver();
    resolver.setVaultProvider(new MockVault());

    const result = await resolver.resolveString("{{MISSING_KEY}} here");
    expect(result.resolved).toBe("{{MISSING_KEY}} here");
    expect(result.placeholdersFound).toBe(1);
    expect(result.placeholdersResolved).toBe(0);
    expect(result.unresolved).toEqual(["MISSING_KEY"]);
  });

  it("resolves multiple placeholders in one string", async () => {
    const resolver = new VaultResolver();
    resolver.setVaultProvider(new MockVault());

    const result = await resolver.resolveString("{{STRIPE_KEY}} and {{GITHUB_TOKEN}}");
    expect(result.resolved).toBe("sk_live_abc123 and ghp_xyz789");
    expect(result.placeholdersResolved).toBe(2);
  });

  it("passes through when no vault provider set", async () => {
    const resolver = new VaultResolver();
    const result = await resolver.resolveString("{{STRIPE_KEY}} stays");
    expect(result.resolved).toBe("{{STRIPE_KEY}} stays");
    expect(result.unresolved).toEqual(["STRIPE_KEY"]);
  });

  it("returns original string when no placeholders found", async () => {
    const resolver = new VaultResolver();
    const result = await resolver.resolveString("plain text");
    expect(result.resolved).toBe("plain text");
    expect(result.placeholdersFound).toBe(0);
  });

  it("resolveInput deep-walks objects", async () => {
    const resolver = new VaultResolver();
    resolver.setVaultProvider(new MockVault());

    const result = await resolver.resolveInput({
      key: "{{STRIPE_KEY}}",
      nested: { token: "{{GITHUB_TOKEN}}" },
      array: ["{{STRIPE_KEY}}", "plain"],
      number: 42,
      bool: true,
      nil: null,
    });

    expect(result["key"]).toBe("sk_live_abc123");
    expect((result["nested"] as Record<string, unknown>)["token"]).toBe("ghp_xyz789");
    expect(result["array"]).toEqual(["sk_live_abc123", "plain"]);
    expect(result["number"]).toBe(42);
    expect(result["bool"]).toBe(true);
    expect(result["nil"]).toBeNull();
  });

  it("scrubs resolved secrets from text", async () => {
    const resolver = new VaultResolver();
    resolver.setVaultProvider(new MockVault());

    await resolver.resolveString("{{STRIPE_KEY}}");
    const scrubbed = resolver.scrubSecrets("The key is sk_live_abc123 here");
    expect(scrubbed).toBe("The key is ***REDACTED*** here");
  });

  it("clearResolvedSecrets stops scrubbing", async () => {
    const resolver = new VaultResolver();
    resolver.setVaultProvider(new MockVault());

    await resolver.resolveString("{{STRIPE_KEY}}");
    resolver.clearResolvedSecrets();
    const result = resolver.scrubSecrets("sk_live_abc123");
    expect(result).toBe("sk_live_abc123");
  });
});
