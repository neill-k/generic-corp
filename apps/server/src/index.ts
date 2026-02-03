import "dotenv/config";

import http from "node:http";
import path from "node:path";

import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";

import { PluginHost } from "@generic-corp/core";
import { LocalEnvVaultPlugin, LocalSqliteStoragePlugin, ConsoleChatPlugin } from "@generic-corp/plugins-base";

import { createTenantApiRouter } from "./api/routes.js";
import { createOrganizationRoutes } from "./api/routes/organizations.js";
import { errorMiddleware } from "./api/middleware.js";
import { tenantContext } from "./middleware/tenant-context.js";
import { disconnectAll } from "./lib/prisma-tenant.js";
import { BoardService } from "./services/board-service.js";
import { WorkspaceManager } from "./services/workspace-manager.js";
import { setWorkspaceManager, startAgentWorkers, stopAgentWorkers } from "./queue/workers.js";
import { startStuckAgentChecker, stopStuckAgentChecker } from "./services/error-recovery.js";
import { createWebSocketHub } from "./ws/hub.js";
import { MainAgentStreamService } from "./services/main-agent-stream.js";
import { GcServerPlugin } from "./plugins/gc-server-plugin.js";

const PORT = Number(process.env["PORT"] ?? "3000");

function resolveWorkspaceRoot(): string {
  return path.resolve(process.cwd(), process.env["GC_WORKSPACE_ROOT"] ?? "./workspace");
}

async function main() {
  // --- Plugin Host Bootstrap ---
  const pluginHost = new PluginHost({
    pluginConfig: {
      "local-env-vault": { envPath: process.env["GC_ENV_PATH"] ?? ".env" },
      "local-sqlite-storage": { dbPath: process.env["GC_STORAGE_PATH"] ?? "./gc-storage.sqlite" },
    },
  });

  // Register plugins
  pluginHost.registerPlugin(new LocalEnvVaultPlugin());
  pluginHost.registerPlugin(new LocalSqliteStoragePlugin());
  pluginHost.registerPlugin(new ConsoleChatPlugin());
  pluginHost.registerPlugin(new GcServerPlugin());

  // Run full plugin lifecycle
  await pluginHost.initializeAll();

  // --- Express + Socket.io Setup ---
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  // Plugin UI manifest endpoint
  app.get("/api/plugins/ui", (_req, res) => {
    res.json(pluginHost.getUiRegistry().getManifest());
  });

  // --- Public routes (no tenant context required) ---
  const publicRouter = express.Router();
  // Import db inline — only used as public prisma for organization routes
  const { db } = await import("./db/client.js");
  publicRouter.use("/organizations", createOrganizationRoutes(db));
  app.use("/api", publicRouter);

  // --- Tenant-scoped routes (tenantContext middleware applied) ---
  const boardService = new BoardService(resolveWorkspaceRoot());
  const tenantRouter = express.Router();
  tenantRouter.use(tenantContext);
  tenantRouter.use("/", createTenantApiRouter({ boardService }));
  app.use("/api", tenantRouter);

  app.use(errorMiddleware);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  const wm = new WorkspaceManager(resolveWorkspaceRoot());
  await wm.ensureInitialized();

  const streamService = new MainAgentStreamService(wm);

  const eventBus = pluginHost.getEventBus();
  const wsHub = createWebSocketHub(io, eventBus, { streamService });
  setWorkspaceManager(wm);

  await startAgentWorkers();
  startStuckAgentChecker(db);

  server.listen(PORT, () => {
    console.log(`[Server] listening on http://localhost:${PORT}`);
  });

  async function gracefulShutdown(signal: string) {
    console.log(`[Server] ${signal} received, shutting down gracefully...`);

    // 1. Stop accepting new WebSocket connections
    wsHub.stop();
    io.close();

    // 2. Drain agent workers
    await stopAgentWorkers();

    // 3. Stop error recovery checker
    stopStuckAgentChecker();

    // 4. Shutdown plugins
    await pluginHost.shutdownAll();

    // 5. Disconnect all tenant Prisma clients
    await disconnectAll();

    // 6. Disconnect public Prisma client
    await db.$disconnect();

    // 7. Close the HTTP server
    server.close();

    console.log("[Server] Shutdown complete.");
    process.exit(0);
  }

  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
}

void main().catch((error) => {
  console.error("[Server] startup failed", error);
  process.exit(1);
});
