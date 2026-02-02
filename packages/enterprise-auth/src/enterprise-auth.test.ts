import { describe, expect, it } from "vitest";
import { OktaIdentityProvider } from "./okta-identity-provider.js";
import { EnterpriseAuthPlugin } from "./enterprise-auth-plugin.js";

describe("OktaIdentityProvider", () => {
  it("has correct provider metadata", () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    expect(provider.providerId).toBe("okta-identity");
    expect(provider.providerName).toBe("Okta Identity Provider");
  });

  it("initializes successfully with valid config", async () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    await expect(provider.initialize()).resolves.toBeUndefined();
  });

  it("rejects initialization with empty domain", async () => {
    const provider = new OktaIdentityProvider({
      domain: "",
      clientId: "client123",
    });
    await expect(provider.initialize()).rejects.toThrow(
      "OktaIdentityProvider requires domain and clientId",
    );
  });

  it("returns null for invalid token", async () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    const ctx = await provider.authenticate("invalid");
    expect(ctx).toBeNull();
  });

  it("returns null for empty token", async () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    const ctx = await provider.authenticate("");
    expect(ctx).toBeNull();
  });

  it("returns identity context for valid token", async () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    const ctx = await provider.authenticate("abcdef123456");
    expect(ctx).not.toBeNull();
    expect(ctx!.userId).toBe("okta-user-abcdef12");
    expect(ctx!.displayName).toBe("Okta User abcdef12");
    expect(ctx!.roles).toContain("user");
    expect(ctx!.metadata["provider"]).toBe("okta");
    expect(ctx!.metadata["domain"]).toBe("test.okta.com");
  });

  it("authorizes user role for read/write", async () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    const ctx = await provider.authenticate("abcdef123456");
    expect(await provider.authorize(ctx!, "read")).toBe(true);
    expect(await provider.authorize(ctx!, "write")).toBe(true);
  });

  it("denies user role for admin permission", async () => {
    const provider = new OktaIdentityProvider({
      domain: "test.okta.com",
      clientId: "client123",
    });
    const ctx = await provider.authenticate("abcdef123456");
    expect(await provider.authorize(ctx!, "admin")).toBe(false);
    expect(await provider.authorize(ctx!, "delete")).toBe(false);
  });
});

describe("EnterpriseAuthPlugin", () => {
  it("has correct manifest", () => {
    const plugin = new EnterpriseAuthPlugin();
    expect(plugin.manifest.id).toBe("enterprise-auth");
    expect(plugin.manifest.tags).toContain("enterprise");
    expect(plugin.manifest.tags).toContain("identity");
  });

  it("exports a default instance for dynamic loading", async () => {
    const mod = await import("./index.js");
    expect(mod.default).toBeInstanceOf(EnterpriseAuthPlugin);
  });
});
