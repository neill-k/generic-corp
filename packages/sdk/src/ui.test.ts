import { describe, it, expect } from "vitest";
import type {
  NavItemExtension,
  PageExtension,
  WidgetExtension,
  UiManifest,
} from "./ui.js";

describe("UI extension types", () => {
  it("NavItemExtension has required fields", () => {
    const item: NavItemExtension = {
      id: "vault-secrets",
      label: "Secrets",
      icon: "lock",
      path: "/plugins/vault",
      pluginId: "local-env-vault",
    };
    expect(item.id).toBe("vault-secrets");
    expect(item.pluginId).toBe("local-env-vault");
  });

  it("NavItemExtension supports optional position", () => {
    const item: NavItemExtension = {
      id: "test",
      label: "Test",
      icon: "test",
      path: "/test",
      position: 50,
      pluginId: "test-plugin",
    };
    expect(item.position).toBe(50);
  });

  it("PageExtension has required fields", () => {
    const page: PageExtension = {
      id: "vault-page",
      path: "/plugins/vault",
      title: "Vault Secrets",
      apiEndpoint: "/api/plugins/vault/page",
      pluginId: "local-env-vault",
    };
    expect(page.path).toBe("/plugins/vault");
    expect(page.apiEndpoint).toBe("/api/plugins/vault/page");
  });

  it("WidgetExtension has required fields and valid position", () => {
    const widget: WidgetExtension = {
      id: "vault-widget",
      targetPage: "dashboard",
      position: "bottom",
      title: "Active Secrets",
      apiEndpoint: "/api/plugins/vault/widget",
      pluginId: "local-env-vault",
    };
    expect(widget.targetPage).toBe("dashboard");
    expect(["top", "bottom", "sidebar"]).toContain(widget.position);
  });

  it("UiManifest aggregates all extension types", () => {
    const manifest: UiManifest = {
      navItems: [
        { id: "n1", label: "Nav", icon: "i", path: "/p", pluginId: "p1" },
      ],
      pages: [
        { id: "pg1", path: "/p", title: "Page", apiEndpoint: "/api", pluginId: "p1" },
      ],
      widgets: [
        { id: "w1", targetPage: "dashboard", position: "top", title: "W", apiEndpoint: "/api", pluginId: "p1" },
      ],
    };
    expect(manifest.navItems).toHaveLength(1);
    expect(manifest.pages).toHaveLength(1);
    expect(manifest.widgets).toHaveLength(1);
  });

  it("empty UiManifest is valid", () => {
    const manifest: UiManifest = {
      navItems: [],
      pages: [],
      widgets: [],
    };
    expect(manifest.navItems).toHaveLength(0);
    expect(manifest.pages).toHaveLength(0);
    expect(manifest.widgets).toHaveLength(0);
  });
});
