import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { setupWebSocket } from "./websocket/index.js";
import { setupRoutes } from "./api/index.js";
import { initializeQueues } from "./queues/index.js";
import { TaskWatcher } from "./services/taskWatcher.js";
import { seedAgents } from "./db/seed.js";
import { initializeAgents } from "./agents/index.js";
import { initEncryption } from "./services/encryption.js";
import { runWorker } from "./temporal/index.js";
import {
  applyProductionHardening,
  applyErrorHandlers,
} from "./middleware/production.js";

const app = express();
const httpServer = createServer(app);

// Middleware - Order matters!
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" })); // Add size limit to prevent DoS

// Apply production hardening (logging, rate limiting, health checks)
applyProductionHardening(app);

// Setup API routes
setupRoutes(app);

// Setup WebSocket
const io = setupWebSocket(httpServer);

// Initialize task file watcher
const taskWatcher = new TaskWatcher(io);

// Apply error handlers (must be last)
applyErrorHandlers(app);

// Initialize queues and start server
async function start() {
  try {
    try {
      initEncryption();
      console.log("[Server] Encryption initialized");
    } catch (err) {
      console.warn("[Server] Encryption not available:", err instanceof Error ? err.message : err);
      console.warn("[Server] Provider account features will be disabled");
    }

    await seedAgents();

    // Initialize agent implementations
    await initializeAgents();

    // Initialize task orchestration (Temporal or fallback)
    await initializeQueues(io);

    // Start Temporal worker in background (don't await - it runs forever)
    runWorker().catch((err) => {
      console.error("[Server] Temporal worker failed:", err);
    });

    // Start task file watcher
    taskWatcher.start();

    const port = process.env.PORT || 3000;
    httpServer.listen(port, () => {
      console.log(`[Server] Running on http://localhost:${port}`);
      console.log(`[WebSocket] Ready for connections`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error);
    process.exit(1);
  }
}

start();
