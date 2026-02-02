import type {
  NavItemExtension,
  PageExtension,
  WidgetExtension,
  UiExtensionRegistrar,
  UiManifest,
} from "@generic-corp/sdk";

export class UiRegistry implements UiExtensionRegistrar {
  private readonly navItems: NavItemExtension[] = [];
  private readonly pages: PageExtension[] = [];
  private readonly widgets: WidgetExtension[] = [];
  private currentPluginId = "";

  setCurrentPluginId(pluginId: string): void {
    this.currentPluginId = pluginId;
  }

  registerNavItem(item: Omit<NavItemExtension, "pluginId">): void {
    this.navItems.push({ ...item, pluginId: this.currentPluginId });
  }

  registerPage(page: Omit<PageExtension, "pluginId">): void {
    this.pages.push({ ...page, pluginId: this.currentPluginId });
  }

  registerWidget(widget: Omit<WidgetExtension, "pluginId">): void {
    this.widgets.push({ ...widget, pluginId: this.currentPluginId });
  }

  getManifest(): UiManifest {
    return {
      navItems: [...this.navItems].sort((a, b) => (a.position ?? 100) - (b.position ?? 100)),
      pages: [...this.pages],
      widgets: [...this.widgets],
    };
  }
}
