import { describe, expect, it, vi } from "vitest";

vi.mock("../queue/agent-queues.js", () => ({
  enqueueAgentTask: vi.fn(),
}));

vi.mock("../lib/prisma-tenant.js", () => ({
  getPublicPrisma: vi.fn(() => ({
    tenant: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "t1", slug: "test", displayName: "Test", schemaName: "tenant_test", status: "active" })),
      update: vi.fn(async () => ({ id: "t1", slug: "test", displayName: "Test", schemaName: "tenant_test", status: "active" })),
      delete: vi.fn(async () => ({})),
    },
  })),
  getPrismaForTenant: vi.fn(async () => ({
    agent: {
      findMany: vi.fn(async () => []),
    },
  })),
  clearTenantCache: vi.fn(async () => {}),
}));

vi.mock("../lib/schema-provisioner.js", () => ({
  provisionOrgSchema: vi.fn(async () => {}),
  dropOrgSchema: vi.fn(async () => {}),
}));

import { createGcMcpServer } from "./server.js";

const mockPrisma = {
  agent: {
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: "a1", name: "test" })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
  orgNode: {
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: "n1" })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  },
  task: {
    create: vi.fn(async () => ({ id: "t_created" })),
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    count: vi.fn(async () => 0),
  },
  message: {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: "m1", threadId: "t1" })),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    count: vi.fn(async () => 0),
  },
  workspace: {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({ id: "w1", name: "Test", slug: "test" })),
    update: vi.fn(async () => ({ id: "w1", name: "Test", slug: "test" })),
  },
  toolPermission: {
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: "tp1", name: "test" })),
    update: vi.fn(async () => ({ id: "tp1", name: "test", enabled: true })),
    delete: vi.fn(async () => ({})),
  },
  mcpServerConfig: {
    findUnique: vi.fn(async () => null),
    findMany: vi.fn(async () => []),
    create: vi.fn(async () => ({ id: "mcp1", name: "test" })),
    update: vi.fn(async () => ({ id: "mcp1", name: "test" })),
    delete: vi.fn(async () => ({})),
  },
} as unknown as import("@prisma/client").PrismaClient;

describe("createGcMcpServer", () => {
  it("creates an SDK MCP server instance", () => {
    const server = createGcMcpServer({
      prisma: mockPrisma,
      orgSlug: "test-org",
      agentId: "marcus",
      taskId: "task1",
    });
    expect(server).toBeTruthy();
    expect(server).toHaveProperty("instance");
  });
});
