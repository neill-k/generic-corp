import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../../db/client.js", () => {
  const mockDb = {
    mcpServerConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
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

import { db } from "../../db/client.js";
import { appEventBus } from "../../services/app-events.js";
import { createMcpServerRouter } from "./mcp-servers.js";

const mockDb = db as unknown as {
  mcpServerConfig: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const mockEmit = appEventBus.emit as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api", createMcpServerRouter());
  return app;
}

const defaultServer = {
  id: "mcp-1",
  name: "My MCP Server",
  protocol: "sse",
  uri: "https://mcp.example.com/v1",
  status: "disconnected",
  toolCount: 0,
  lastPingAt: null,
  errorMessage: null,
  consecutiveFailures: 0,
  iconName: null,
  iconColor: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("mcp-servers routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/mcp-servers", () => {
    it("returns all MCP servers ordered by name", async () => {
      mockDb.mcpServerConfig.findMany.mockResolvedValue([
        { ...defaultServer, id: "mcp-1", name: "Alpha Server" },
        { ...defaultServer, id: "mcp-2", name: "Beta Server" },
      ]);

      const res = await request(createApp()).get("/api/mcp-servers");

      expect(res.status).toBe(200);
      expect(res.body.servers).toHaveLength(2);
      expect(res.body.servers[0].name).toBe("Alpha Server");
      expect(res.body.servers[1].name).toBe("Beta Server");
      expect(mockDb.mcpServerConfig.findMany).toHaveBeenCalledWith({
        orderBy: { name: "asc" },
      });
    });

    it("returns empty array when no servers exist", async () => {
      mockDb.mcpServerConfig.findMany.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/mcp-servers");

      expect(res.status).toBe(200);
      expect(res.body.servers).toEqual([]);
    });
  });

  describe("POST /api/mcp-servers", () => {
    it("creates an MCP server with valid data", async () => {
      mockDb.mcpServerConfig.create.mockResolvedValue(defaultServer);

      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "My MCP Server",
          protocol: "sse",
          uri: "https://mcp.example.com/v1",
        });

      expect(res.status).toBe(201);
      expect(res.body.server.name).toBe("My MCP Server");
      expect(mockDb.mcpServerConfig.create).toHaveBeenCalledWith({
        data: {
          name: "My MCP Server",
          protocol: "sse",
          uri: "https://mcp.example.com/v1",
          iconName: undefined,
          iconColor: undefined,
        },
      });
      expect(mockEmit).toHaveBeenCalledWith("mcp_server_created", {
        mcpServerId: "mcp-1",
      });
    });

    it("creates an MCP server with optional icon fields", async () => {
      const serverWithIcon = {
        ...defaultServer,
        iconName: "server",
        iconColor: "#FF0000",
      };
      mockDb.mcpServerConfig.create.mockResolvedValue(serverWithIcon);

      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "My MCP Server",
          protocol: "http",
          uri: "https://mcp.example.com/api",
          iconName: "server",
          iconColor: "#FF0000",
        });

      expect(res.status).toBe(201);
      expect(res.body.server.iconName).toBe("server");
      expect(res.body.server.iconColor).toBe("#FF0000");
    });

    it("rejects localhost URI (SSRF)", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Evil Server",
          protocol: "sse",
          uri: "http://localhost:3000",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Private IP ranges are not allowed");
      expect(mockDb.mcpServerConfig.create).not.toHaveBeenCalled();
    });

    it("rejects 127.0.0.1 URI (SSRF)", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Evil Server",
          protocol: "http",
          uri: "http://127.0.0.1:8080",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 10.x.x.x URI (SSRF)", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Internal Server",
          protocol: "sse",
          uri: "http://10.0.0.5:9090",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 192.168.x.x URI (SSRF)", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Home Server",
          protocol: "sse",
          uri: "http://192.168.1.100:3000",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Private IP ranges are not allowed");
    });

    it("rejects 172.16-31.x.x URI (SSRF)", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Docker Server",
          protocol: "http",
          uri: "http://172.17.0.2:8080",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Private IP ranges are not allowed");
    });

    it("allows stdio protocol with any URI (skips SSRF)", async () => {
      const stdioServer = {
        ...defaultServer,
        protocol: "stdio",
        uri: "/usr/local/bin/my-mcp-server",
      };
      mockDb.mcpServerConfig.create.mockResolvedValue(stdioServer);

      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Local Tool",
          protocol: "stdio",
          uri: "/usr/local/bin/my-mcp-server",
        });

      expect(res.status).toBe(201);
      expect(res.body.server.protocol).toBe("stdio");
    });

    it("allows stdio protocol even with localhost URI", async () => {
      const stdioServer = {
        ...defaultServer,
        protocol: "stdio",
        uri: "http://localhost:3000",
      };
      mockDb.mcpServerConfig.create.mockResolvedValue(stdioServer);

      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Local Tool",
          protocol: "stdio",
          uri: "http://localhost:3000",
        });

      expect(res.status).toBe(201);
    });

    it("returns validation error for missing name", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          protocol: "sse",
          uri: "https://mcp.example.com/v1",
        });

      expect(res.status).toBe(500);
    });

    it("returns validation error for invalid protocol", async () => {
      const res = await request(createApp())
        .post("/api/mcp-servers")
        .send({
          name: "Test",
          protocol: "invalid",
          uri: "https://mcp.example.com/v1",
        });

      expect(res.status).toBe(500);
    });
  });

  describe("PATCH /api/mcp-servers/:id", () => {
    it("updates an MCP server", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(defaultServer);
      const updated = { ...defaultServer, name: "Renamed Server" };
      mockDb.mcpServerConfig.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/mcp-servers/mcp-1")
        .send({ name: "Renamed Server" });

      expect(res.status).toBe(200);
      expect(res.body.server.name).toBe("Renamed Server");
      expect(mockDb.mcpServerConfig.update).toHaveBeenCalledWith({
        where: { id: "mcp-1" },
        data: { name: "Renamed Server" },
      });
      expect(mockEmit).toHaveBeenCalledWith("mcp_server_updated", {
        mcpServerId: "mcp-1",
      });
    });

    it("re-validates SSRF when URI is changed", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(defaultServer);

      const res = await request(createApp())
        .patch("/api/mcp-servers/mcp-1")
        .send({ uri: "http://192.168.1.1:3000" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Private IP ranges are not allowed");
      expect(mockDb.mcpServerConfig.update).not.toHaveBeenCalled();
    });

    it("allows URI change to valid public URL", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(defaultServer);
      const updated = { ...defaultServer, uri: "https://new.example.com/mcp" };
      mockDb.mcpServerConfig.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/mcp-servers/mcp-1")
        .send({ uri: "https://new.example.com/mcp" });

      expect(res.status).toBe(200);
      expect(res.body.server.uri).toBe("https://new.example.com/mcp");
    });

    it("uses existing server protocol for SSRF check when protocol not in update", async () => {
      const stdioServer = { ...defaultServer, protocol: "stdio" };
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(stdioServer);
      const updated = { ...stdioServer, uri: "http://localhost:3000" };
      mockDb.mcpServerConfig.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/mcp-servers/mcp-1")
        .send({ uri: "http://localhost:3000" });

      // stdio protocol should skip SSRF check even when URI is localhost
      expect(res.status).toBe(200);
    });

    it("returns 404 for unknown server", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(null);

      const res = await request(createApp())
        .patch("/api/mcp-servers/unknown")
        .send({ name: "Updated" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("MCP server not found");
    });
  });

  describe("DELETE /api/mcp-servers/:id", () => {
    it("deletes an MCP server", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(defaultServer);
      mockDb.mcpServerConfig.delete.mockResolvedValue(defaultServer);

      const res = await request(createApp()).delete("/api/mcp-servers/mcp-1");

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(mockDb.mcpServerConfig.delete).toHaveBeenCalledWith({
        where: { id: "mcp-1" },
      });
      expect(mockEmit).toHaveBeenCalledWith("mcp_server_deleted", {
        mcpServerId: "mcp-1",
      });
    });

    it("returns 404 for unknown server", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).delete("/api/mcp-servers/unknown");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("MCP server not found");
    });
  });

  describe("POST /api/mcp-servers/:id/ping", () => {
    it("updates lastPingAt, resets failures, sets status to connected", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(defaultServer);
      const pinged = {
        ...defaultServer,
        lastPingAt: new Date(),
        consecutiveFailures: 0,
        status: "connected",
        errorMessage: null,
      };
      mockDb.mcpServerConfig.update.mockResolvedValue(pinged);

      const res = await request(createApp()).post("/api/mcp-servers/mcp-1/ping");

      expect(res.status).toBe(200);
      expect(res.body.server.status).toBe("connected");
      expect(res.body.server.consecutiveFailures).toBe(0);
      expect(mockDb.mcpServerConfig.update).toHaveBeenCalledWith({
        where: { id: "mcp-1" },
        data: {
          lastPingAt: expect.any(Date),
          consecutiveFailures: 0,
          status: "connected",
          errorMessage: null,
        },
      });
      expect(mockEmit).toHaveBeenCalledWith("mcp_server_status_changed", {
        mcpServerId: "mcp-1",
        status: "connected",
      });
    });

    it("returns 404 for unknown server", async () => {
      mockDb.mcpServerConfig.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).post("/api/mcp-servers/unknown/ping");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("MCP server not found");
    });
  });
});
