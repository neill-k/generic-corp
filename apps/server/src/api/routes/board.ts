import { readFile, writeFile } from "node:fs/promises";

import express from "express";

import { appEventBus } from "../../services/app-events.js";
import type { BoardService } from "../../services/board-service.js";

export interface BoardRouterDeps {
  boardService?: BoardService;
}

export function createBoardRouter(deps: BoardRouterDeps): express.Router {
  const router = express.Router();

  router.post("/board", async (req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const type = req.body?.type;
      const content = req.body?.content;
      const author = req.body?.author ?? "human";

      if (!type || !content) {
        res.status(400).json({ error: "type and content are required" });
        return;
      }

      const filePath = await deps.boardService.writeBoardItem({
        agentName: author,
        type,
        content,
      });

      appEventBus.emit("board_item_created", { type, author, path: filePath });

      res.status(201).json({ path: filePath });
    } catch (error) {
      next(error);
    }
  });

  router.get("/board", async (req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const type = (req.query["type"] as string) || undefined;
      const since = req.query["since"] as string | undefined;

      const items = await deps.boardService.listBoardItems({
        type: type || undefined,
        since: since || undefined,
      });

      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/board", async (req, res, next) => {
    try {
      const filePath = req.body?.filePath;
      const content = req.body?.content;

      if (!filePath || typeof filePath !== "string") {
        res.status(400).json({ error: "filePath is required" });
        return;
      }
      if (!content || typeof content !== "string") {
        res.status(400).json({ error: "content is required" });
        return;
      }

      let existing: string;
      try {
        existing = await readFile(filePath, "utf8");
      } catch {
        res.status(404).json({ error: "Board item not found" });
        return;
      }

      const separatorIndex = existing.indexOf("\n---\n");
      if (separatorIndex === -1) {
        res.status(400).json({ error: "Invalid board item format" });
        return;
      }

      const header = existing.slice(0, separatorIndex + 5);
      const updated = `${header}\n${content.trim()}\n`;
      await writeFile(filePath, updated, "utf8");

      appEventBus.emit("board_item_updated", { type: "updated", author: "human", path: filePath });

      res.json({ updated: true, path: filePath });
    } catch (error) {
      next(error);
    }
  });

  router.post("/board/archive", async (req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const filePath = req.body?.filePath;
      if (!filePath || typeof filePath !== "string") {
        res.status(400).json({ error: "filePath is required" });
        return;
      }

      const archivedPath = await deps.boardService.archiveBoardItem(filePath);

      appEventBus.emit("board_item_archived", { path: filePath, archivedPath });

      res.json({ archivedPath });
    } catch (error) {
      next(error);
    }
  });

  router.get("/board/archived", async (_req, res, next) => {
    try {
      if (!deps.boardService) {
        res.status(503).json({ error: "Board service not available" });
        return;
      }

      const items = await deps.boardService.listArchivedItems();
      res.json({ items });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
