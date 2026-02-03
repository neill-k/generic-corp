import { describe, expect, it, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const { mockPublicPrisma, mockTenantPrisma } = vi.hoisted(() => {
  const mockPublicPrisma = {
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
  const mockTenantPrisma = {
    agent: {
      findMany: vi.fn(),
    },
  };
  return { mockPublicPrisma, mockTenantPrisma };
});

vi.mock("../../lib/schema-provisioner.js", () => ({
  provisionOrgSchema: vi.fn(async () => {}),
  dropOrgSchema: vi.fn(async () => {}),
}));

vi.mock("../../lib/prisma-tenant.js", () => ({
  getPrismaForTenant: vi.fn(async () => mockTenantPrisma),
  clearTenantCache: vi.fn(async () => {}),
}));

import { provisionOrgSchema, dropOrgSchema } from "../../lib/schema-provisioner.js";
import { getPrismaForTenant, clearTenantCache } from "../../lib/prisma-tenant.js";
import { createOrganizationRoutes } from "./organizations.js";
import type { PrismaClient } from "@prisma/client";

const mockProvisionOrgSchema = provisionOrgSchema as ReturnType<typeof vi.fn>;
const mockDropOrgSchema = dropOrgSchema as ReturnType<typeof vi.fn>;
const mockGetPrismaForTenant = getPrismaForTenant as ReturnType<typeof vi.fn>;
const mockClearTenantCache = clearTenantCache as ReturnType<typeof vi.fn>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/organizations", createOrganizationRoutes(mockPublicPrisma as unknown as PrismaClient));
  return app;
}

const defaultTenant = {
  id: "tenant-1",
  slug: "acme_corp",
  displayName: "Acme Corp",
  schemaName: "tenant_acme_corp",
  status: "active",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

describe("organizations routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Restore default mock implementations after clearAllMocks resets them
    mockProvisionOrgSchema.mockResolvedValue(undefined);
    mockDropOrgSchema.mockResolvedValue(undefined);
    mockGetPrismaForTenant.mockResolvedValue(mockTenantPrisma);
    mockClearTenantCache.mockResolvedValue(undefined);
  });

  describe("POST /api/organizations", () => {
    it("creates an org successfully", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPublicPrisma.tenant.create.mockResolvedValue({
        ...defaultTenant,
        status: "provisioning",
      });
      mockPublicPrisma.tenant.update.mockResolvedValue(defaultTenant);

      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "Acme Corp" });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe("acme_corp");
      expect(res.body.displayName).toBe("Acme Corp");
      expect(res.body.schemaName).toBe("tenant_acme_corp");
      expect(res.body.status).toBe("active");

      // Verify slug duplicate check
      expect(mockPublicPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: "acme_corp" },
      });

      // Verify tenant row created with provisioning status
      expect(mockPublicPrisma.tenant.create).toHaveBeenCalledWith({
        data: {
          slug: "acme_corp",
          displayName: "Acme Corp",
          schemaName: "tenant_acme_corp",
          status: "provisioning",
        },
      });

      // Verify schema was provisioned
      expect(mockProvisionOrgSchema).toHaveBeenCalledWith(
        mockPublicPrisma,
        "tenant_acme_corp",
      );

      // Verify tenant marked active after provisioning
      expect(mockPublicPrisma.tenant.update).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
        data: { status: "active" },
      });
    });

    it("returns 400 if name is missing", async () => {
      const res = await request(createApp())
        .post("/api/organizations")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name is required/);
      expect(mockPublicPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it("returns 400 if name is empty string", async () => {
      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name is required/);
      expect(mockPublicPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it("returns 400 if name is whitespace only", async () => {
      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/name is required/);
      expect(mockPublicPrisma.tenant.create).not.toHaveBeenCalled();
    });

    it("returns 409 if slug already exists", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);

      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "Acme Corp" });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already exists/);
      expect(mockPublicPrisma.tenant.create).not.toHaveBeenCalled();
      expect(mockProvisionOrgSchema).not.toHaveBeenCalled();
    });

    it("rolls back tenant row if schema provisioning fails", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPublicPrisma.tenant.create.mockResolvedValue({
        ...defaultTenant,
        id: "tenant-1",
        status: "provisioning",
      });
      mockProvisionOrgSchema.mockRejectedValue(new Error("DDL failed"));

      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "Acme Corp" });

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to provision/);

      // Verify rollback: tenant row deleted
      expect(mockPublicPrisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
      });

      // Verify tenant was NOT marked active
      expect(mockPublicPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it("handles slugification correctly: spaces become underscores", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPublicPrisma.tenant.create.mockResolvedValue({
        ...defaultTenant,
        slug: "my_cool_org",
        displayName: "My Cool Org",
        schemaName: "tenant_my_cool_org",
        status: "provisioning",
      });
      mockPublicPrisma.tenant.update.mockResolvedValue({
        ...defaultTenant,
        slug: "my_cool_org",
        displayName: "My Cool Org",
        schemaName: "tenant_my_cool_org",
      });

      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "My Cool Org" });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe("my_cool_org");
      expect(mockPublicPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "my_cool_org",
            schemaName: "tenant_my_cool_org",
          }),
        }),
      );
    });

    it("handles slugification correctly: strips special characters", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);
      mockPublicPrisma.tenant.create.mockResolvedValue({
        ...defaultTenant,
        slug: "acme_corp",
        displayName: "Acme Corp!",
        schemaName: "tenant_acme_corp",
        status: "provisioning",
      });
      mockPublicPrisma.tenant.update.mockResolvedValue({
        ...defaultTenant,
        slug: "acme_corp",
        displayName: "Acme Corp!",
        schemaName: "tenant_acme_corp",
      });

      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "Acme Corp!" });

      expect(res.status).toBe(201);
      expect(mockPublicPrisma.tenant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "acme_corp",
          }),
        }),
      );
    });

    it("returns 400 when name generates an invalid slug (no letters)", async () => {
      const res = await request(createApp())
        .post("/api/organizations")
        .send({ name: "123" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid/i);
      expect(mockPublicPrisma.tenant.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/organizations", () => {
    it("lists all active organizations", async () => {
      const tenants = [
        { ...defaultTenant, id: "tenant-1", slug: "alpha_org", displayName: "Alpha Org" },
        { ...defaultTenant, id: "tenant-2", slug: "beta_org", displayName: "Beta Org" },
      ];
      mockPublicPrisma.tenant.findMany.mockResolvedValue(tenants);

      const res = await request(createApp()).get("/api/organizations");

      expect(res.status).toBe(200);
      expect(res.body.organizations).toHaveLength(2);
      expect(res.body.organizations[0].slug).toBe("alpha_org");
      expect(res.body.organizations[1].slug).toBe("beta_org");

      expect(mockPublicPrisma.tenant.findMany).toHaveBeenCalledWith({
        where: { status: "active" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          displayName: true,
          schemaName: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it("returns empty array when no orgs exist", async () => {
      mockPublicPrisma.tenant.findMany.mockResolvedValue([]);

      const res = await request(createApp()).get("/api/organizations");

      expect(res.status).toBe(200);
      expect(res.body.organizations).toEqual([]);
    });
  });

  describe("PATCH /api/organizations/:slug", () => {
    it("renames an org successfully", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);
      const updated = { ...defaultTenant, displayName: "New Acme Name" };
      mockPublicPrisma.tenant.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/organizations/acme_corp")
        .send({ displayName: "New Acme Name" });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe("New Acme Name");
      expect(res.body.slug).toBe("acme_corp");

      expect(mockPublicPrisma.tenant.findUnique).toHaveBeenCalledWith({
        where: { slug: "acme_corp" },
      });

      expect(mockPublicPrisma.tenant.update).toHaveBeenCalledWith({
        where: { slug: "acme_corp" },
        data: { displayName: "New Acme Name" },
      });
    });

    it("trims whitespace from displayName", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);
      const updated = { ...defaultTenant, displayName: "Trimmed Name" };
      mockPublicPrisma.tenant.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch("/api/organizations/acme_corp")
        .send({ displayName: "  Trimmed Name  " });

      expect(res.status).toBe(200);
      expect(mockPublicPrisma.tenant.update).toHaveBeenCalledWith({
        where: { slug: "acme_corp" },
        data: { displayName: "Trimmed Name" },
      });
    });

    it("returns 404 if org not found", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);

      const res = await request(createApp())
        .patch("/api/organizations/nonexistent")
        .send({ displayName: "Something" });

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/);
      expect(mockPublicPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it("returns 400 if displayName is missing", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);

      const res = await request(createApp())
        .patch("/api/organizations/acme_corp")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/displayName is required/);
      expect(mockPublicPrisma.tenant.update).not.toHaveBeenCalled();
    });

    it("returns 400 if displayName is empty string", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);

      const res = await request(createApp())
        .patch("/api/organizations/acme_corp")
        .send({ displayName: "" });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/displayName is required/);
      expect(mockPublicPrisma.tenant.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /api/organizations/:slug", () => {
    it("deletes an org successfully", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);
      mockTenantPrisma.agent.findMany.mockResolvedValue([]);
      mockPublicPrisma.tenant.delete.mockResolvedValue(defaultTenant);

      const res = await request(createApp()).delete("/api/organizations/acme_corp");

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(res.body.slug).toBe("acme_corp");

      // Verify running agents check
      expect(mockGetPrismaForTenant).toHaveBeenCalledWith("acme_corp");
      expect(mockTenantPrisma.agent.findMany).toHaveBeenCalledWith({
        where: { status: { in: ["working", "running"] } },
        select: { name: true, displayName: true },
      });

      // Verify cache cleared
      expect(mockClearTenantCache).toHaveBeenCalledWith("acme_corp");

      // Verify schema dropped
      expect(mockDropOrgSchema).toHaveBeenCalledWith(
        mockPublicPrisma,
        "tenant_acme_corp",
      );

      // Verify tenant row deleted
      expect(mockPublicPrisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
      });
    });

    it("returns 404 if org not found", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(null);

      const res = await request(createApp()).delete("/api/organizations/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/);
      expect(mockGetPrismaForTenant).not.toHaveBeenCalled();
      expect(mockDropOrgSchema).not.toHaveBeenCalled();
      expect(mockPublicPrisma.tenant.delete).not.toHaveBeenCalled();
    });

    it("returns 409 if org has running agents", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);
      mockTenantPrisma.agent.findMany.mockResolvedValue([
        { name: "agent-1", displayName: "Worker Bot" },
        { name: "agent-2", displayName: "Manager Bot" },
      ]);

      const res = await request(createApp()).delete("/api/organizations/acme_corp");

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/running agents/);
      expect(res.body.runningAgents).toEqual(["Worker Bot", "Manager Bot"]);

      // Verify deletion was not attempted
      expect(mockClearTenantCache).not.toHaveBeenCalled();
      expect(mockDropOrgSchema).not.toHaveBeenCalled();
      expect(mockPublicPrisma.tenant.delete).not.toHaveBeenCalled();
    });

    it("proceeds with deletion if tenant schema connection fails", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);
      mockGetPrismaForTenant.mockRejectedValue(new Error("Connection failed"));
      mockPublicPrisma.tenant.delete.mockResolvedValue(defaultTenant);

      const res = await request(createApp()).delete("/api/organizations/acme_corp");

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
      expect(res.body.slug).toBe("acme_corp");

      // Verify it still clears cache, drops schema, and deletes row
      expect(mockClearTenantCache).toHaveBeenCalledWith("acme_corp");
      expect(mockDropOrgSchema).toHaveBeenCalledWith(
        mockPublicPrisma,
        "tenant_acme_corp",
      );
      expect(mockPublicPrisma.tenant.delete).toHaveBeenCalledWith({
        where: { id: "tenant-1" },
      });
    });

    it("uses agent name as fallback when displayName is null", async () => {
      mockPublicPrisma.tenant.findUnique.mockResolvedValue(defaultTenant);
      mockTenantPrisma.agent.findMany.mockResolvedValue([
        { name: "agent-1", displayName: null },
      ]);

      const res = await request(createApp()).delete("/api/organizations/acme_corp");

      expect(res.status).toBe(409);
      expect(res.body.runningAgents).toEqual(["agent-1"]);
    });
  });
});
