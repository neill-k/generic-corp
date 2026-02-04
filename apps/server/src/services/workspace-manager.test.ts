import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { existsSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { WorkspaceManager } from "./workspace-manager.js";

describe("WorkspaceManager", () => {
  let tmpDir: string;
  let manager: WorkspaceManager;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `gc-ws-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    manager = new WorkspaceManager(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("ensureInitialized", () => {
    it("creates workspace root with board and docs directories", async () => {
      await manager.ensureInitialized();

      expect(existsSync(path.join(tmpDir, "board", "status-updates"))).toBe(true);
      expect(existsSync(path.join(tmpDir, "board", "blockers"))).toBe(true);
      expect(existsSync(path.join(tmpDir, "board", "findings"))).toBe(true);
      expect(existsSync(path.join(tmpDir, "board", "requests"))).toBe(true);
      expect(existsSync(path.join(tmpDir, "board", "completed"))).toBe(true);
      expect(existsSync(path.join(tmpDir, "docs", "learnings"))).toBe(true);
      expect(existsSync(path.join(tmpDir, "docs", "digests"))).toBe(true);
    });

    it("is idempotent", async () => {
      await manager.ensureInitialized();
      await manager.ensureInitialized();
      expect(existsSync(path.join(tmpDir, "board", "status-updates"))).toBe(true);
    });
  });

  describe("ensureAgentWorkspace", () => {
    it("creates agent directory with .gc/context.md", async () => {
      const agentPath = await manager.ensureAgentWorkspace("marcus");

      expect(existsSync(agentPath)).toBe(true);
      expect(existsSync(path.join(agentPath, ".gc"))).toBe(true);
      expect(existsSync(path.join(agentPath, ".gc", "context.md"))).toBe(true);
      expect(existsSync(path.join(agentPath, ".gc", "results"))).toBe(true);
    });

    it("does not overwrite existing context.md", async () => {
      const agentPath = await manager.ensureAgentWorkspace("marcus");
      const contextPath = path.join(agentPath, ".gc", "context.md");

      const { writeFileSync } = await import("node:fs");
      writeFileSync(contextPath, "# My custom context\n", "utf8");

      await manager.ensureAgentWorkspace("marcus");

      const content = readFileSync(contextPath, "utf8");
      expect(content).toBe("# My custom context\n");
    });

    it("seeds context.md on first creation", async () => {
      const agentPath = await manager.ensureAgentWorkspace("sable");
      const contextPath = path.join(agentPath, ".gc", "context.md");

      const content = readFileSync(contextPath, "utf8");
      expect(content).toContain("# Working Context");
    });
  });

  describe("getAgentWorkspacePath", () => {
    it("returns path under workspace root", () => {
      const agentPath = manager.getAgentWorkspacePath("marcus");
      expect(agentPath).toBe(path.join(tmpDir, "agents", "marcus"));
    });
  });

  describe("getWorkspaceRoot", () => {
    it("returns the workspace root path", () => {
      expect(manager.getWorkspaceRoot()).toBe(tmpDir);
    });
  });
});
