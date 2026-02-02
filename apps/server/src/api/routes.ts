import express from "express";

import type { AgentRuntime } from "../services/agent-lifecycle.js";
import type { BoardService } from "../services/board-service.js";
import { createAgentRouter } from "./routes/agents.js";
import { createBoardRouter } from "./routes/board.js";
import { createMessageRouter } from "./routes/messages.js";
import { createOrgRouter } from "./routes/org-nodes.js";
import { createTaskRouter } from "./routes/tasks.js";
import { createThreadRouter } from "./routes/threads.js";

export interface ApiRouterDeps {
  boardService?: BoardService;
  runtime?: AgentRuntime;
}

export function createApiRouter(deps: ApiRouterDeps = {}): express.Router {
  const router = express.Router();

  router.use("/", createAgentRouter());
  router.use("/", createTaskRouter());
  router.use("/", createMessageRouter());
  router.use("/", createThreadRouter({ runtime: deps.runtime }));
  router.use("/", createOrgRouter());
  router.use("/", createBoardRouter({ boardService: deps.boardService }));

  return router;
}
