import "dotenv/config";

import http from "node:http";
import path from "node:path";

import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";

import { PluginHost } from "@generic-corp/core";
import { LocalEnvVaultPlugin, LocalSqliteStoragePlugin, ConsoleChatPlugin } from "@generic-corp/plugins-base";

import { createApiRouter } from "./api/routes.js";
import { errorMiddleware } from "./api/middleware.js";
import { BoardService } from "./services/board-service.js";
import { WorkspaceManager } from "./services/workspace-manager.js";
import { setWorkspaceManager, startAgentWorkers, stopAgentWorkers } from "./queue/workers.js";
import { startStuckAgentChecker, stopStuckAgentChecker } from "./services/error-recovery.js";
import { createWebSocketHub } from "./ws/hub.js";
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

  const boardService = new BoardService(resolveWorkspaceRoot());
  app.use("/api", createApiRouter({ boardService }));
  app.use(errorMiddleware);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  const eventBus = pluginHost.getEventBus();
  const wsHub = createWebSocketHub(io, eventBus);

  const wm = new WorkspaceManager(resolveWorkspaceRoot());
  await wm.ensureInitialized();
  setWorkspaceManager(wm);

  await startAgentWorkers();
  startStuckAgentChecker();

  server.listen(PORT, () => {
    console.log(`[Server] listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] shutting down (${signal})`);
    stopStuckAgentChecker();
    wsHub.stop();
    await stopAgentWorkers();
    await pluginHost.shutdownAll();
    io.close();
    server.close();
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

void main().catch((error) => {
  console.error("[Server] startup failed", error);
  process.exit(1);
});
