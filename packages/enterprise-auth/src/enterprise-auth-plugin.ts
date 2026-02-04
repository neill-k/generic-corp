import { GcPlugin } from "@generic-corp/sdk";
import type { PluginManifest, PluginContext } from "@generic-corp/sdk";
import { OktaIdentityProvider } from "./okta-identity-provider.js";

export class EnterpriseAuthPlugin extends GcPlugin {
  readonly manifest: PluginManifest = {
    id: "enterprise-auth",
    name: "Enterprise Authentication",
    version: "0.1.0",
    description: "Okta-based identity and access management for enterprise deployments",
    author: "Generic Corp",
    license: "FSL-1.1-MIT",
    tags: ["enterprise", "identity", "auth"],
  };

  private provider: OktaIdentityProvider | null = null;

  override async onRegister(context: PluginContext): Promise<void> {
    const domain = context.config.get<string>("oktaDomain", "");
    const clientId = context.config.get<string>("oktaClientId", "");

    if (!domain || !clientId) {
      context.logger.warn(
        "Okta config missing (oktaDomain, oktaClientId) — auth plugin inactive",
      );
      return;
    }

    this.provider = new OktaIdentityProvider({ domain, clientId });

    (context.services as unknown as {
      register: (type: string, provider: OktaIdentityProvider, primary: boolean) => void;
    }).register?.("identity", this.provider, true);

    context.logger.info(`Okta identity provider registered for domain: ${domain}`);
  }

  override async onInitialize(context: PluginContext): Promise<void> {
    if (this.provider) {
      context.ui.registerNavItem({
        id: "auth-settings",
        label: "Auth",
        icon: "shield",
        path: "/plugins/enterprise-auth",
        position: 90,
      });

      context.ui.registerPage({
        id: "auth-settings",
        path: "/plugins/enterprise-auth",
        title: "Authentication Settings",
        apiEndpoint: "/api/plugins/enterprise-auth/settings",
      });
    }
  }

  override async onShutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.dispose();
      this.provider = null;
    }
  }
}
