import { describe, it, expect } from "vitest";
import { UiRegistry } from "./ui-registry.js";

describe("UiRegistry", () => {
  it("registers and returns nav items with pluginId", () => {
    const reg = new UiRegistry();
    reg.setCurrentPluginId("vault-plugin");
    reg.registerNavItem({
      id: "secrets",
      label: "Secrets",
      icon: "lock",
      path: "/plugins/vault",
      position: 50,
    });

    const manifest = reg.getManifest();
    expect(manifest.navItems).toHaveLength(1);
    expect(manifest.navItems[0]!.pluginId).toBe("vault-plugin");
    expect(manifest.navItems[0]!.id).toBe("secrets");
  });

  it("registers pages with pluginId", () => {
    const reg = new UiRegistry();
    reg.setCurrentPluginId("my-plugin");
    reg.registerPage({
      id: "my-page",
      path: "/plugins/my-plugin",
      title: "My Page",
      apiEndpoint: "/api/plugins/my-plugin/page",
    });

    const manifest = reg.getManifest();
    expect(manifest.pages).toHaveLength(1);
    expect(manifest.pages[0]!.pluginId).toBe("my-plugin");
  });

  it("registers widgets with pluginId", () => {
    const reg = new UiRegistry();
    reg.setCurrentPluginId("dashboard-plugin");
    reg.registerWidget({
      id: "stats",
      targetPage: "dashboard",
      position: "top",
      title: "Stats",
      apiEndpoint: "/api/plugins/stats",
    });

    const manifest = reg.getManifest();
    expect(manifest.widgets).toHaveLength(1);
    expect(manifest.widgets[0]!.pluginId).toBe("dashboard-plugin");
  });

  it("sorts nav items by position", () => {
    const reg = new UiRegistry();
    reg.setCurrentPluginId("p1");
    reg.registerNavItem({ id: "b", label: "B", icon: "b", path: "/b", position: 200 });
    reg.registerNavItem({ id: "a", label: "A", icon: "a", path: "/a", position: 10 });
    reg.registerNavItem({ id: "c", label: "C", icon: "c", path: "/c" }); // default 100

    const manifest = reg.getManifest();
    expect(manifest.navItems.map((n) => n.id)).toEqual(["a", "c", "b"]);
  });

  it("returns empty manifest when nothing registered", () => {
    const reg = new UiRegistry();
    const manifest = reg.getManifest();
    expect(manifest.navItems).toEqual([]);
    expect(manifest.pages).toEqual([]);
    expect(manifest.widgets).toEqual([]);
  });
});
