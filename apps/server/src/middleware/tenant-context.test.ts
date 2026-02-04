import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// Hoist mocks so they are available before module imports
const { mockPublicPrisma, mockTenantPrisma } = vi.hoisted(() => {
  const mockPublicPrisma = {
    tenant: {
      findUnique: vi.fn(),
    },
  };
  const mockTenantPrisma = {
    agent: { findMany: vi.fn() },
    task: { findMany: vi.fn() },
  };
  return { mockPublicPrisma, mockTenantPrisma };
});

vi.mock("../lib/prisma-tenant.js", () => ({
  getPrismaForTenant: vi.fn(),
  getPublicPrisma: vi.fn(() => mockPublicPrisma),
}));

import { getPrismaForTenant, getPublicPrisma } from "../lib/prisma-tenant.js";
import {
  tenantContext,
  requireTenant,
  optionalTenantContext,
  getTenantPrisma,
} from "./tenant-context.js";

const mockGetPrismaForTenant = getPrismaForTenant as ReturnType<typeof vi.fn>;
const mockGetPublicPrisma = getPublicPrisma as ReturnType<typeof vi.fn>;

// Fixture: active tenant record returned by public prisma
const activeTenant = {
  id: "tenant-1",
  slug: "acme",
  schemaName: "tenant_acme",
  status: "active",
};

// Fixture: suspended tenant
const suspendedTenant = {
  id: "tenant-2",
  slug: "defunct",
  schemaName: "tenant_defunct",
  status: "suspended",
};

/**
 * Create a minimal Express app that applies the given middleware,
 * then exposes a GET /test route that reports tenant context state.
 */
function createTestApp(middleware: express.RequestHandler) {
  const app = express();
  app.use(middleware);
  app.get("/test", (req, res) => {
    res.json({
      hasTenant: !!req.tenant,
      hasPrisma: !!req.prisma,
      tenant: req.tenant ?? null,
    });
  });
  return app;
}

describe("tenant-context middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublicPrisma.mockReturnValue(mockPublicPrisma);
    mockGetPrismaForTenant.mockResolvedValue(mockTenantPrisma);
  });

  // ─── tenantContext ──────────────────────────────────────────────

  describe("tenantContext", () => {
    it("returns 400 if no tenant identifier provided", async () => {
      const app = createTestApp(tenantContext);

      const res = await request(app).get("/test");

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("TENANT_REQUIRED");
      expect(res.body.error).toBe("Tenant identifier required");
    });

    it("returns 404 if tenant not found", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);

      const app = createTestApp(tenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("TENANT_NOT_FOUND");
      expect(res.body.tenantSlug).toBe("nonexistent");
    });

    it("returns 403 if tenant is not active", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(suspendedTenant);

      const app = createTestApp(tenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "defunct");

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("TENANT_INACTIVE");
      expect(res.body.status).toBe("suspended");
      expect(res.body.tenantSlug).toBe("defunct");
    });

    it("attaches tenant and prisma to request on success", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);

      const app = createTestApp(tenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(200);
      expect(res.body.hasTenant).toBe(true);
      expect(res.body.hasPrisma).toBe(true);
      expect(res.body.tenant).toEqual({
        id: "tenant-1",
        slug: "acme",
        schemaName: "tenant_acme",
        status: "active",
      });
    });

    it("reads tenant slug from X-Organization-Slug header", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);

      const app = createTestApp(tenantContext);

      await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(mockPublicPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: "acme" },
        select: {
          id: true,
          slug: true,
          schemaName: true,
          status: true,
        },
      });
      expect(mockGetPrismaForTenant).toHaveBeenCalledWith("acme");
    });

    it("returns 500 if getPrismaForTenant throws", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);
      mockGetPrismaForTenant.mockRejectedValue(
        new Error("Connection refused"),
      );

      const app = createTestApp(tenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(500);
      expect(res.body.code).toBe("TENANT_CONTEXT_ERROR");
      expect(res.body.message).toBe("Connection refused");
    });

    it("returns 500 with generic message for non-Error throws", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);
      mockGetPrismaForTenant.mockRejectedValue("string error");

      const app = createTestApp(tenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(500);
      expect(res.body.message).toBe("Unknown error");
    });

    it("returns 500 if public prisma findUnique throws", async () => {
      mockPublicPrisma.tenant.findUnique.mockRejectedValue(
        new Error("Database unreachable"),
      );

      const app = createTestApp(tenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(500);
      expect(res.body.code).toBe("TENANT_CONTEXT_ERROR");
      expect(res.body.message).toBe("Database unreachable");
    });
  });

  // ─── getTenantPrisma ────────────────────────────────────────────

  describe("getTenantPrisma", () => {
    it("returns prisma client from request", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);

      const app = express();
      app.use(tenantContext);
      app.get("/test", (req, res) => {
        const prisma = getTenantPrisma(req);
        res.json({ hasPrisma: !!prisma });
      });

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(200);
      expect(res.body.hasPrisma).toBe(true);
    });

    it("throws if tenant context not initialized", () => {
      // Create a bare request object without prisma attached
      const fakeReq = {} as express.Request;

      expect(() => getTenantPrisma(fakeReq)).toThrowError(
        "Tenant context not initialized",
      );
    });
  });

  // ─── requireTenant ──────────────────────────────────────────────

  describe("requireTenant", () => {
    it("returns 401 if no tenant context", async () => {
      // Apply requireTenant without tenantContext first
      const app = express();
      app.use(requireTenant);
      app.get("/test", (_req, res) => {
        res.json({ ok: true });
      });

      const res = await request(app).get("/test");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TENANT_CONTEXT_MISSING");
      expect(res.body.error).toBe("Tenant context required");
    });

    it("calls next() if tenant context exists", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);

      const app = express();
      app.use(tenantContext);
      app.use(requireTenant);
      app.get("/test", (req, res) => {
        res.json({ tenant: req.tenant });
      });

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(200);
      expect(res.body.tenant.slug).toBe("acme");
    });

    it("returns 401 if tenant is set but prisma is missing", async () => {
      // Manually set tenant but not prisma to test the && condition
      const app = express();
      app.use((req, _res, next) => {
        req.tenant = {
          id: "tenant-1",
          slug: "acme",
          schemaName: "tenant_acme",
          status: "active",
        };
        // Intentionally not setting req.prisma
        next();
      });
      app.use(requireTenant);
      app.get("/test", (_req, res) => {
        res.json({ ok: true });
      });

      const res = await request(app).get("/test");

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("TENANT_CONTEXT_MISSING");
    });
  });

  // ─── optionalTenantContext ──────────────────────────────────────

  describe("optionalTenantContext", () => {
    it("attaches tenant if slug provided and valid", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);

      const app = createTestApp(optionalTenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(200);
      expect(res.body.hasTenant).toBe(true);
      expect(res.body.hasPrisma).toBe(true);
      expect(res.body.tenant.slug).toBe("acme");
    });

    it("continues without tenant if no slug provided", async () => {
      const app = createTestApp(optionalTenantContext);

      const res = await request(app).get("/test");

      expect(res.status).toBe(200);
      expect(res.body.hasTenant).toBe(false);
      expect(res.body.hasPrisma).toBe(false);
      expect(res.body.tenant).toBeNull();
    });

    it("continues without tenant if slug is not found", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);

      const app = createTestApp(optionalTenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "nonexistent");

      expect(res.status).toBe(200);
      expect(res.body.hasTenant).toBe(false);
      expect(res.body.hasPrisma).toBe(false);
    });

    it("continues without tenant if tenant is not active", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(suspendedTenant);

      const app = createTestApp(optionalTenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "defunct");

      expect(res.status).toBe(200);
      expect(res.body.hasTenant).toBe(false);
      expect(res.body.hasPrisma).toBe(false);
    });

    it("does not fail the request if prisma tenant lookup throws", async () => {
      mockPublicPrisma.tenant.findUnique.mockRejectedValue(
        new Error("DB down"),
      );

      const app = createTestApp(optionalTenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      expect(res.status).toBe(200);
      expect(res.body.hasTenant).toBe(false);
      expect(res.body.hasPrisma).toBe(false);
    });

    it("does not fail the request if getPrismaForTenant throws", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(activeTenant);
      mockGetPrismaForTenant.mockRejectedValue(
        new Error("Connection refused"),
      );

      const app = createTestApp(optionalTenantContext);

      const res = await request(app)
        .get("/test")
        .set("X-Organization-Slug", "acme");

      // Request succeeds (200) instead of blowing up
      expect(res.status).toBe(200);
      // Note: req.tenant is assigned before getPrismaForTenant is called,
      // so it remains set even though the prisma client failed.
      // The key assertion is that the request did not fail.
      expect(res.body.hasTenant).toBe(true);
      expect(res.body.hasPrisma).toBe(false);
    });
  });
});
