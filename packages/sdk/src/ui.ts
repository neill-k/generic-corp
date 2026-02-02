export interface NavItemExtension {
  id: string;
  label: string;
  icon: string;
  path: string;
  position?: number;
  pluginId: string;
}

export interface PageExtension {
  id: string;
  path: string;
  title: string;
  apiEndpoint: string;
  pluginId: string;
}

export interface WidgetExtension {
  id: string;
  targetPage: string;
  position: "top" | "bottom" | "sidebar";
  title: string;
  apiEndpoint: string;
  pluginId: string;
}

export interface UiExtensionRegistrar {
  registerNavItem(item: Omit<NavItemExtension, "pluginId">): void;
  registerPage(page: Omit<PageExtension, "pluginId">): void;
  registerWidget(widget: Omit<WidgetExtension, "pluginId">): void;
}

export interface UiManifest {
  navItems: NavItemExtension[];
  pages: PageExtension[];
  widgets: WidgetExtension[];
}
