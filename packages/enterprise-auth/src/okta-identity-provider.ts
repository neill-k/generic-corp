import { IdentityProvider } from "@generic-corp/sdk";
import type { IdentityContext } from "@generic-corp/sdk";

/**
 * Stub Okta identity provider — demonstrates the enterprise plugin pattern.
 * In production, this would validate tokens against the Okta API.
 */
export class OktaIdentityProvider extends IdentityProvider {
  readonly providerId = "okta-identity";
  readonly providerName = "Okta Identity Provider";

  private domain: string;
  private clientId: string;

  constructor(config: { domain: string; clientId: string }) {
    super();
    this.domain = config.domain;
    this.clientId = config.clientId;
  }

  override async initialize(): Promise<void> {
    // In production: validate Okta config, fetch JWKS, etc.
    if (!this.domain || !this.clientId) {
      throw new Error("OktaIdentityProvider requires domain and clientId");
    }
  }

  override async authenticate(token: string): Promise<IdentityContext | null> {
    // Stub: In production, verify JWT against Okta JWKS endpoint
    if (!token || token === "invalid") {
      return null;
    }

    // Stub: decode token payload without verification
    return {
      userId: `okta-user-${token.slice(0, 8)}`,
      displayName: `Okta User ${token.slice(0, 8)}`,
      roles: ["user"],
      metadata: {
        provider: "okta",
        domain: this.domain,
      },
    };
  }

  override async authorize(
    identity: IdentityContext,
    permission: string,
  ): Promise<boolean> {
    // Stub: role-based permission check
    const rolePermissions: Record<string, string[]> = {
      admin: ["read", "write", "delete", "admin"],
      user: ["read", "write"],
      viewer: ["read"],
    };

    return identity.roles.some((role) =>
      (rolePermissions[role] ?? []).includes(permission),
    );
  }

  override async dispose(): Promise<void> {
    // Cleanup: close connections, invalidate caches
  }
}
