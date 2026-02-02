import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../db/client.js", () => {
  const mockDb = {
    workspace: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("../../services/app-events.js", () => ({
  appEventBus: {
    emit: vi.fn(),
  },
}));

vi.mock("../../services/crypto.js", () => ({
  encrypt: vi.fn().mockReturnValue({ enc: "encrypted-data", iv: "test-iv", tag: "test-tag" }),
  decrypt: vi.fn().mockReturnValue("sk-ant-raw-key"),
  maskApiKey: vi.fn().mockImplementation((enc: string) => (enc ? "sk-ant-••••••••" : "")),
}));

import { db } from "../../db/client.js";
import { appEventBus } from "../../services/app-events.js";
import { encrypt, maskApiKey } from "../../services/crypto.js";
import { createWorkspaceRouter } from "./workspace.js";

const mockDb = db as unknown as {
  workspace: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockEmit = appEventBus.emit as ReturnType<typeof vi.fn>;
const mockEncrypt = encrypt as ReturnType<typeof vi.fn>;
const mockMaskApiKey = maskApiKey as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", createWorkspaceRouter());
  return app;
}

const defaultWorkspace = {
  id: "ws-1",
  name: "Generic Corp",
  slug: "generic-corp",
  description: "",
  timezone: "America/New_York",
  language: "en-US",
  llmProvider: "anthropic",
  llmModel: "claude-sonnet-4-20250514",
  llmApiKeyEnc: "",
  llmApiKeyIv: "",
  llmApiKeyTag: "",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("workspace routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/workspace", () => {
    it("returns existing workspace with masked API key", async () => {
      const ws = { ...defaultWorkspace, llmApiKeyEnc: "some-encrypted-data" };
      mockDb.workspace.findFirst.mockResolvedValue(ws);

      const res = await request(createApp()).get("/api/workspace");

      expect(res.status).toBe(200);
      expect(res.body.workspace.id).toBe("ws-1");
      expect(res.body.workspace.name).toBe("Generic Corp");
      expect(res.body.workspace.llmApiKey).toBe("sk-ant-••••••••");
      expect(res.body.workspace).not.toHaveProperty("llmApiKeyEnc");
      expect(res.body.workspace).not.toHaveProperty("llmApiKeyIv");
      expect(res.body.workspace).not.toHaveProperty("llmApiKeyTag");
    });

    it("auto-creates workspace with defaults when none exists", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(null);
      mockDb.workspace.create.mockResolvedValue(defaultWorkspace);

      const res = await request(createApp()).get("/api/workspace");

      expect(res.status).toBe(200);
      expect(res.body.workspace.name).toBe("Generic Corp");
      expect(res.body.workspace.slug).toBe("generic-corp");
      expect(mockDb.workspace.create).toHaveBeenCalledWith({
        data: {
          name: "Generic Corp",
          slug: "generic-corp",
        },
      });
    });

    it("returns empty string for llmApiKey when not set", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);

      const res = await request(createApp()).get("/api/workspace");

      expect(res.status).toBe(200);
      expect(res.body.workspace.llmApiKey).toBe("");
      expect(mockMaskApiKey).toHaveBeenCalledWith("");
    });
  });

  describe("PATCH /api/workspace", () => {
    it("updates workspace fields", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);
      const updated = { ...defaultWorkspace, name: "New Corp", description: "Updated" };
      mockDb.workspace.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ name: "New Corp", description: "Updated" });

      expect(res.status).toBe(200);
      expect(res.body.workspace.name).toBe("New Corp");
      expect(res.body.workspace.description).toBe("Updated");
      expect(mockDb.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { name: "New Corp", description: "Updated" },
      });
      expect(mockEmit).toHaveBeenCalledWith("workspace_updated", { workspaceId: "ws-1" });
    });

    it("encrypts API key when provided", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);
      const updated = {
        ...defaultWorkspace,
        llmApiKeyEnc: "encrypted-data",
        llmApiKeyIv: "test-iv",
        llmApiKeyTag: "test-tag",
      };
      mockDb.workspace.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ llmApiKey: "sk-ant-raw-secret-key" });

      expect(res.status).toBe(200);
      expect(mockEncrypt).toHaveBeenCalledWith("sk-ant-raw-secret-key");
      expect(mockDb.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: {
          llmApiKeyEnc: "encrypted-data",
          llmApiKeyIv: "test-iv",
          llmApiKeyTag: "test-tag",
        },
      });
      expect(res.body.workspace.llmApiKey).toBe("sk-ant-••••••••");
      expect(res.body.workspace).not.toHaveProperty("llmApiKeyEnc");
    });

    it("auto-creates workspace if none exists before updating", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(null);
      mockDb.workspace.create.mockResolvedValue(defaultWorkspace);
      const updated = { ...defaultWorkspace, name: "New Name" };
      mockDb.workspace.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ name: "New Name" });

      expect(res.status).toBe(200);
      expect(mockDb.workspace.create).toHaveBeenCalled();
      expect(mockDb.workspace.update).toHaveBeenCalled();
    });

    it("returns validation error for invalid slug", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ slug: "INVALID SLUG!" });

      expect(res.status).toBe(500);
    });

    it("returns validation error for empty name", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ name: "" });

      expect(res.status).toBe(500);
    });

    it("updates slug when valid", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);
      const updated = { ...defaultWorkspace, slug: "new-slug" };
      mockDb.workspace.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ slug: "new-slug" });

      expect(res.status).toBe(200);
      expect(res.body.workspace.slug).toBe("new-slug");
    });

    it("updates LLM provider and model", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);
      const updated = { ...defaultWorkspace, llmProvider: "openai", llmModel: "gpt-4" };
      mockDb.workspace.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/workspace")
        .send({ llmProvider: "openai", llmModel: "gpt-4" });

      expect(res.status).toBe(200);
      expect(res.body.workspace.llmProvider).toBe("openai");
      expect(res.body.workspace.llmModel).toBe("gpt-4");
      expect(mockDb.workspace.update).toHaveBeenCalledWith({
        where: { id: "ws-1" },
        data: { llmProvider: "openai", llmModel: "gpt-4" },
      });
    });
  });

  describe("DELETE /api/workspace", () => {
    it("deletes workspace and emits event", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(defaultWorkspace);
      mockDb.workspace.delete.mockResolvedValue(defaultWorkspace);

      const res = await request(createApp()).delete("/api/workspace");

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(mockDb.workspace.delete).toHaveBeenCalledWith({ where: { id: "ws-1" } });
      expect(mockEmit).toHaveBeenCalledWith("workspace_updated", { workspaceId: "ws-1" });
    });

    it("returns 404 when no workspace exists", async () => {
      mockDb.workspace.findFirst.mockResolvedValue(null);

      const res = await request(createApp()).delete("/api/workspace");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Workspace not found");
    });
  });
});
