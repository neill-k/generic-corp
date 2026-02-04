import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

import { createToolPermissionRouter } from "./tool-permissions.js";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    toolPermission: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    agent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };
  return { mockDb };
});

vi.mock("../../middleware/tenant-context.js", () => ({
  getTenantPrisma: () => mockDb,
}));

vi.mock("../../lib/prisma-tenant.js", () => ({
  getPrismaForTenant: vi.fn(async () => mockDb),
  getPublicPrisma: vi.fn(() => mockDb),
  clearTenantCache: vi.fn(async () => {}),
  disconnectAll: vi.fn(async () => {}),
  getTenantCacheStats: vi.fn(() => ({ totalCached: 0, maxSize: 20 })),
}));

vi.mock("../../services/app-events.js", () => ({
  appEventBus: { emit: vi.fn() },
}));

import { appEventBus } from "../../services/app-events.js";

const mockEventBus = appEventBus as unknown as { emit: ReturnType<typeof vi.fn> };

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", createToolPermissionRouter());
  return app;
}

describe("tool-permissions routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Workspace-level CRUD ---

  describe("GET /api/tool-permissions", () => {
    it("returns all tool permissions ordered by name", async () => {
      mockDb.toolPermission.findMany.mockResolvedValue([
        { id: "tp1", name: "bash", description: "Run shell commands", iconName: "terminal", enabled: true, createdAt: new Date(), updatedAt: new Date() },
        { id: "tp2", name: "deploy", description: "Deploy to production", iconName: "rocket", enabled: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const res = await request(createApp()).get("/api/tool-permissions");

      expect(res.status).toBe(200);
      expect(res.body.permissions).toHaveLength(2);
      expect(res.body.permissions[0].name).toBe("bash");
      expect(res.body.permissions[1].name).toBe("deploy");
      expect(mockDb.toolPermission.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
    });

    it("returns empty array when no permissions exist", async () => {
      mockDb.toolPermission.findMany.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/tool-permissions");

      expect(res.status).toBe(200);
      expect(res.body.permissions).toEqual([]);
    });
  });

  describe("POST /api/tool-permissions", () => {
    it("creates a tool permission", async () => {
      const created = {
        id: "tp1",
        name: "bash",
        description: "Run shell commands",
        iconName: "terminal",
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.toolPermission.create.mockResolvedValue(created);

      const res = await request(createApp())
        .post("/api/tool-permissions")
        .send({ name: "bash", description: "Run shell commands", iconName: "terminal" });

      expect(res.status).toBe(201);
      expect(res.body.permission.name).toBe("bash");
      expect(res.body.permission.enabled).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith("tool_permission_created", { toolPermissionId: "tp1", orgSlug: "default" });
    });

    it("creates a tool permission with enabled=false", async () => {
      const created = {
        id: "tp2",
        name: "deploy",
        description: "Deploy to production",
        iconName: "rocket",
        enabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.toolPermission.create.mockResolvedValue(created);

      const res = await request(createApp())
        .post("/api/tool-permissions")
        .send({ name: "deploy", description: "Deploy to production", iconName: "rocket", enabled: false });

      expect(res.status).toBe(201);
      expect(res.body.permission.enabled).toBe(false);
    });

    it("returns 400 for missing name", async () => {
      const res = await request(createApp())
        .post("/api/tool-permissions")
        .send({ description: "Run shell commands", iconName: "terminal" });

      expect(res.status).toBe(500);
    });

    it("returns 400 for empty name", async () => {
      const res = await request(createApp())
        .post("/api/tool-permissions")
        .send({ name: "", description: "Run shell commands", iconName: "terminal" });

      expect(res.status).toBe(500);
    });

    it("returns 400 for missing description", async () => {
      const res = await request(createApp())
        .post("/api/tool-permissions")
        .send({ name: "bash", iconName: "terminal" });

      expect(res.status).toBe(500);
    });

    it("returns 400 for missing iconName", async () => {
      const res = await request(createApp())
        .post("/api/tool-permissions")
        .send({ name: "bash", description: "Run shell commands" });

      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /api/tool-permissions/:id", () => {
    it("toggles enabled status", async () => {
      mockDb.toolPermission.findUnique.mockResolvedValue({
        id: "tp1",
        name: "bash",
        description: "Run shell commands",
        iconName: "terminal",
        enabled: true,
      });
      mockDb.toolPermission.update.mockResolvedValue({
        id: "tp1",
        name: "bash",
        description: "Run shell commands",
        iconName: "terminal",
        enabled: false,
      });

      const res = await request(createApp())
        .patch("/api/tool-permissions/tp1")
        .send({ enabled: false });

      expect(res.status).toBe(200);
      expect(res.body.permission.enabled).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith("tool_permission_updated", { toolPermissionId: "tp1", orgSlug: "default" });
    });

    it("updates description and iconName", async () => {
      mockDb.toolPermission.findUnique.mockResolvedValue({
        id: "tp1",
        name: "bash",
        description: "Run shell commands",
        iconName: "terminal",
        enabled: true,
      });
      mockDb.toolPermission.update.mockResolvedValue({
        id: "tp1",
        name: "bash",
        description: "Execute shell scripts",
        iconName: "console",
        enabled: true,
      });

      const res = await request(createApp())
        .patch("/api/tool-permissions/tp1")
        .send({ description: "Execute shell scripts", iconName: "console" });

      expect(res.status).toBe(200);
      expect(res.body.permission.description).toBe("Execute shell scripts");
      expect(res.body.permission.iconName).toBe("console");
    });

    it("returns 404 for unknown permission", async () => {
      mockDb.toolPermission.findUnique.mockResolvedValue(null);

      const res = await request(createApp())
        .patch("/api/tool-permissions/unknown")
        .send({ enabled: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Tool permission not found");
    });
  });

  describe("DELETE /api/tool-permissions/:id", () => {
    it("deletes a tool permission", async () => {
      mockDb.toolPermission.findUnique.mockResolvedValue({
        id: "tp1",
        name: "bash",
        description: "Run shell commands",
        iconName: "terminal",
        enabled: true,
      });
      mockDb.toolPermission.delete.mockResolvedValue({});

      const res = await request(createApp()).delete("/api/tool-permissions/tp1");

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith("tool_permission_deleted", { toolPermissionId: "tp1", orgSlug: "default" });
    });

    it("returns 404 for unknown permission", async () => {
      mockDb.toolPermission.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).delete("/api/tool-permissions/unknown");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Tool permission not found");
    });
  });

  // --- Per-agent tool permission overrides ---

  describe("GET /api/agents/:id/tool-permissions", () => {
    it("returns merged permissions with workspace defaults", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        toolPermissions: {},
      });
      mockDb.toolPermission.findMany.mockResolvedValue([
        { id: "tp1", name: "bash", description: "Run shell commands", iconName: "terminal", enabled: true },
        { id: "tp2", name: "deploy", description: "Deploy to production", iconName: "rocket", enabled: true },
      ]);

      const res = await request(createApp()).get("/api/agents/a1/tool-permissions");

      expect(res.status).toBe(200);
      expect(res.body.permissions).toHaveLength(2);
      expect(res.body.permissions[0]).toEqual({
        id: "tp1",
        name: "bash",
        description: "Run shell commands",
        iconName: "terminal",
        enabled: true,
        overridden: false,
      });
      expect(res.body.permissions[1]).toEqual({
        id: "tp2",
        name: "deploy",
        description: "Deploy to production",
        iconName: "rocket",
        enabled: true,
        overridden: false,
      });
    });

    it("returns merged permissions with agent overrides applied", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        toolPermissions: { deploy: false },
      });
      mockDb.toolPermission.findMany.mockResolvedValue([
        { id: "tp1", name: "bash", description: "Run shell commands", iconName: "terminal", enabled: true },
        { id: "tp2", name: "deploy", description: "Deploy to production", iconName: "rocket", enabled: true },
      ]);

      const res = await request(createApp()).get("/api/agents/a1/tool-permissions");

      expect(res.status).toBe(200);
      expect(res.body.permissions).toHaveLength(2);

      const bash = res.body.permissions.find((p: { name: string }) => p.name === "bash");
      expect(bash.enabled).toBe(true);
      expect(bash.overridden).toBe(false);

      const deploy = res.body.permissions.find((p: { name: string }) => p.name === "deploy");
      expect(deploy.enabled).toBe(false);
      expect(deploy.overridden).toBe(true);
    });

    it("handles agent override enabling a workspace-disabled permission", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        toolPermissions: { deploy: true },
      });
      mockDb.toolPermission.findMany.mockResolvedValue([
        { id: "tp1", name: "bash", description: "Run shell commands", iconName: "terminal", enabled: true },
        { id: "tp2", name: "deploy", description: "Deploy to production", iconName: "rocket", enabled: false },
      ]);

      const res = await request(createApp()).get("/api/agents/a1/tool-permissions");

      expect(res.status).toBe(200);
      const deploy = res.body.permissions.find((p: { name: string }) => p.name === "deploy");
      expect(deploy.enabled).toBe(true);
      expect(deploy.overridden).toBe(true);
    });

    it("returns 404 for unknown agent", async () => {
      mockDb.agent.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).get("/api/agents/unknown/tool-permissions");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Agent not found");
    });

    it("handles null toolPermissions gracefully", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        toolPermissions: null,
      });
      mockDb.toolPermission.findMany.mockResolvedValue([
        { id: "tp1", name: "bash", description: "Run shell commands", iconName: "terminal", enabled: true },
      ]);

      const res = await request(createApp()).get("/api/agents/a1/tool-permissions");

      expect(res.status).toBe(200);
      expect(res.body.permissions).toHaveLength(1);
      expect(res.body.permissions[0].overridden).toBe(false);
    });
  });

  describe("PATCH /api/agents/:id/tool-permissions", () => {
    it("updates agent tool permission overrides", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        name: "marcus",
        toolPermissions: {},
      });
      mockDb.agent.update.mockResolvedValue({
        id: "a1",
        name: "marcus",
        toolPermissions: { deploy: false, bash: true },
      });

      const res = await request(createApp())
        .patch("/api/agents/a1/tool-permissions")
        .send({ deploy: false, bash: true });

      expect(res.status).toBe(200);
      expect(res.body.toolPermissions).toEqual({ deploy: false, bash: true });
      expect(mockEventBus.emit).toHaveBeenCalledWith("agent_updated", { agentId: "a1", orgSlug: "default" });
    });

    it("clears all overrides with empty object", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        name: "marcus",
        toolPermissions: { deploy: false },
      });
      mockDb.agent.update.mockResolvedValue({
        id: "a1",
        name: "marcus",
        toolPermissions: {},
      });

      const res = await request(createApp())
        .patch("/api/agents/a1/tool-permissions")
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.toolPermissions).toEqual({});
    });

    it("returns 404 for unknown agent", async () => {
      mockDb.agent.findUnique.mockResolvedValue(null);

      const res = await request(createApp())
        .patch("/api/agents/unknown/tool-permissions")
        .send({ deploy: false });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Agent not found");
    });

    it("rejects invalid body (non-boolean values)", async () => {
      mockDb.agent.findUnique.mockResolvedValue({
        id: "a1",
        name: "marcus",
        toolPermissions: {},
      });

      const res = await request(createApp())
        .patch("/api/agents/a1/tool-permissions")
        .send({ deploy: "yes" });

      expect(res.status).toBe(500);
    });
  });
});
