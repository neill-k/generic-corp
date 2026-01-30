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
import { AgentDetailPage } from "./routes/agents.$id.js";

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

const agentDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/agents/$id",
  component: AgentDetailPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  chatRoute,
  orgRoute,
  boardRoute,
  agentDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
