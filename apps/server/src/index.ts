import "dotenv/config";

import http from "node:http";

import cors from "cors";
import express from "express";
import { Server as SocketIOServer } from "socket.io";

import { createApiRouter } from "./api/routes.js";
import { errorMiddleware } from "./api/middleware.js";
import { startAgentWorkers, stopAgentWorkers } from "./queue/workers.js";

const PORT = Number(process.env["PORT"] ?? "3000");

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, time: new Date().toISOString() });
  });

  app.use("/api", createApiRouter());
  app.use(errorMiddleware);

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.emit("snapshot", { type: "snapshot", serverTime: new Date().toISOString() });
  });

  await startAgentWorkers();

  server.listen(PORT, () => {
    console.log(`[Server] listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] shutting down (${signal})`);
    await stopAgentWorkers();
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
