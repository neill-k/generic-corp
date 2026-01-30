import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { BoardService } from "./board-service.js";

describe("BoardService", () => {
  let tmpDir: string;
  let service: BoardService;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `gc-board-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    service = new BoardService(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("writeBoardItem", () => {
    it("creates a markdown file in the correct board directory", async () => {
      const filePath = await service.writeBoardItem({
        agentName: "marcus",
        type: "status_update",
        content: "All systems operational",
      });

      expect(existsSync(filePath)).toBe(true);
      const content = readFileSync(filePath, "utf8");
      expect(content).toContain("# status_update");
      expect(content).toContain("Author: marcus");
      expect(content).toContain("All systems operational");
    });

    it("creates files in correct subfolders per type", async () => {
      const blocker = await service.writeBoardItem({
        agentName: "sable",
        type: "blocker",
        content: "Blocked on API",
      });

      expect(blocker).toContain("blockers");

      const finding = await service.writeBoardItem({
        agentName: "sable",
        type: "finding",
        content: "Found a bug",
      });

      expect(finding).toContain("findings");
    });
  });

  describe("listBoardItems", () => {
    it("returns empty array when no board items exist", async () => {
      const items = await service.listBoardItems({});
      expect(items).toEqual([]);
    });

    it("returns written board items", async () => {
      await service.writeBoardItem({
        agentName: "marcus",
        type: "status_update",
        content: "Update 1",
      });

      const items = await service.listBoardItems({});
      expect(items).toHaveLength(1);
      expect(items[0]!.author).toBe("marcus");
      expect(items[0]!.type).toBe("status_update");
    });

    it("filters by type", async () => {
      await service.writeBoardItem({ agentName: "a", type: "status_update", content: "hi" });
      await service.writeBoardItem({ agentName: "b", type: "blocker", content: "blocked" });

      const blockers = await service.listBoardItems({ type: "blocker" });
      expect(blockers).toHaveLength(1);
      expect(blockers[0]!.type).toBe("blocker");
    });

    it("filters by since timestamp", async () => {
      await service.writeBoardItem({ agentName: "a", type: "status_update", content: "old" });

      const futureDate = new Date(Date.now() + 60_000).toISOString();
      const items = await service.listBoardItems({ since: futureDate });
      expect(items).toHaveLength(0);
    });
  });

  describe("archiveBoardItem", () => {
    it("moves a board item to completed/ folder", async () => {
      const filePath = await service.writeBoardItem({
        agentName: "marcus",
        type: "status_update",
        content: "Done with this",
      });

      expect(existsSync(filePath)).toBe(true);

      const archivedPath = await service.archiveBoardItem(filePath);

      expect(existsSync(filePath)).toBe(false);
      expect(existsSync(archivedPath)).toBe(true);
      expect(archivedPath).toContain("completed");
    });
  });

  describe("listArchivedItems", () => {
    it("returns archived items", async () => {
      const filePath = await service.writeBoardItem({
        agentName: "sable",
        type: "blocker",
        content: "Resolved blocker",
      });

      await service.archiveBoardItem(filePath);

      const archived = await service.listArchivedItems();
      expect(archived).toHaveLength(1);
      expect(archived[0]!.author).toBe("sable");
    });

    it("returns empty array when no archived items", async () => {
      const archived = await service.listArchivedItems();
      expect(archived).toEqual([]);
    });
  });
});
