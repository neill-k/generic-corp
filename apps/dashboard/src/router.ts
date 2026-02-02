import {
  createRouter,
  createRootRoute,
  createRoute,
} from "@tanstack/react-router";

import { RootLayout } from "./routes/__root.js";
import { IndexPage } from "./routes/index.js";
import { ChatPage } from "./routes/chat.js";
import { OrgPage } from "./routes/org.js";
import { BoardPage } from "./routes/board.js";
import { HelpPage } from "./routes/help.js";
import { AgentDetailPage } from "./routes/agents.$id.js";
import { PluginPage } from "./routes/PluginPage.js";
import { SettingsLayout } from "./components/SettingsLayout.js";
import { SettingsGeneralPage } from "./routes/settings.index.js";
import { SettingsAgentsPage } from "./routes/settings.agents.js";
import { SettingsMcpServersPage } from "./routes/settings.mcp-servers.js";
import { SettingsSkillsPage } from "./routes/settings.skills.js";
import { SettingsBillingPage } from "./routes/settings.billing.js";
import { SettingsSecurityPage } from "./routes/settings.security.js";
import { SettingsNotificationsPage } from "./routes/settings.notifications.js";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chat",
  component: ChatPage,
});

const orgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/org",
  component: OrgPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/board",
  component: BoardPage,
});

const helpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/help",
  component: HelpPage,
});

const agentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents/$id",
  component: AgentDetailPage,
});

const pluginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/plugins/$pluginId",
  component: PluginPage,
});

// Settings layout route (parent for all settings pages)
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsLayout,
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/",
  component: SettingsGeneralPage,
});

const settingsAgentsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/agents",
  component: SettingsAgentsPage,
});

const settingsMcpServersRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/mcp-servers",
  component: SettingsMcpServersPage,
});

const settingsSkillsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/skills",
  component: SettingsSkillsPage,
});

const settingsBillingRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/billing",
  component: SettingsBillingPage,
});

const settingsSecurityRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/security",
  component: SettingsSecurityPage,
});

const settingsNotificationsRoute = createRoute({
  getParentRoute: () => settingsRoute,
  path: "/notifications",
  component: SettingsNotificationsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  chatRoute,
  orgRoute,
  boardRoute,
  helpRoute,
  agentDetailRoute,
  pluginRoute,
  settingsRoute.addChildren([
    settingsIndexRoute,
    settingsAgentsRoute,
    settingsMcpServersRoute,
    settingsSkillsRoute,
    settingsBillingRoute,
    settingsSecurityRoute,
    settingsNotificationsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
