import express from "express";

import { getTenantPrisma } from "../../middleware/tenant-context.js";
import { appEventBus } from "../../services/app-events.js";
import { validateMcpUri } from "../../services/mcp-health.js";
import {
  createMcpServerSchema,
  updateMcpServerSchema,
} from "../schemas/mcp-server.schema.js";

export function createMcpServerRouter(): express.Router {
  const router = express.Router();

  // List all MCP servers
  router.get("/mcp-servers", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const servers = await prisma.mcpServerConfig.findMany({
        orderBy: { name: "asc" },
      });
      res.json({ servers });
    } catch (error) {
      next(error);
    }
  });

  // Create MCP server
  router.post("/mcp-servers", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const body = createMcpServerSchema.parse(req.body);

      // SSRF validation for non-stdio protocols
      const ssrfResult = validateMcpUri(body.uri, body.protocol);
      if (!ssrfResult.valid) {
        res.status(400).json({ error: ssrfResult.error });
        return;
      }

      const server = await prisma.mcpServerConfig.create({
        data: {
          name: body.name,
          protocol: body.protocol,
          uri: body.uri,
          iconName: body.iconName,
          iconColor: body.iconColor,
        },
      });

      appEventBus.emit("mcp_server_created", { mcpServerId: server.id, orgSlug: req.tenant?.slug ?? "default" });
      res.status(201).json({ server });
    } catch (error) {
      next(error);
    }
  });

  // Update MCP server
  router.patch("/mcp-servers/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const server = await prisma.mcpServerConfig.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!server) {
        res.status(404).json({ error: "MCP server not found" });
        return;
      }

      const body = updateMcpServerSchema.parse(req.body);

      // If URI changed, re-validate SSRF
      if (body.uri) {
        const protocol = body.protocol ?? server.protocol;
        const ssrfResult = validateMcpUri(body.uri, protocol);
        if (!ssrfResult.valid) {
          res.status(400).json({ error: ssrfResult.error });
          return;
        }
      }

      const updated = await prisma.mcpServerConfig.update({
        where: { id: server.id },
        data: body,
      });

      appEventBus.emit("mcp_server_updated", { mcpServerId: server.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ server: updated });
    } catch (error) {
      next(error);
    }
  });

  // Delete MCP server
  router.delete("/mcp-servers/:id", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const server = await prisma.mcpServerConfig.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!server) {
        res.status(404).json({ error: "MCP server not found" });
        return;
      }

      await prisma.mcpServerConfig.delete({ where: { id: server.id } });
      appEventBus.emit("mcp_server_deleted", { mcpServerId: server.id, orgSlug: req.tenant?.slug ?? "default" });
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  // Ping / manual health check
  router.post("/mcp-servers/:id/ping", async (req, res, next) => {
    try {
      const prisma = getTenantPrisma(req);
      const server = await prisma.mcpServerConfig.findUnique({
        where: { id: req.params["id"] ?? "" },
      });
      if (!server) {
        res.status(404).json({ error: "MCP server not found" });
        return;
      }

      const updated = await prisma.mcpServerConfig.update({
        where: { id: server.id },
        data: {
          lastPingAt: new Date(),
          consecutiveFailures: 0,
          status: "connected",
          errorMessage: null,
        },
      });

      appEventBus.emit("mcp_server_status_changed", {
        mcpServerId: server.id,
        status: "connected",
        orgSlug: req.tenant?.slug ?? "default",
      });
      res.json({ server: updated });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
