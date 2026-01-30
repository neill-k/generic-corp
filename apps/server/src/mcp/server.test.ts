import { describe, expect, it, vi } from "vitest";

vi.mock("../db/client.js", () => ({
  db: {
    agent: {
      findUnique: vi.fn(async () => null),
    },
    orgNode: {
      findUnique: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    task: {
      create: vi.fn(async () => ({ id: "t_created" })),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
      count: vi.fn(async () => 0),
    },
  },
}));

import { createGcMcpServer } from "./server.js";

describe("createGcMcpServer", () => {
  it("creates an SDK MCP server instance", () => {
    const server = createGcMcpServer("marcus", "task1");
    expect(server).toBeTruthy();
    expect(server).toHaveProperty("instance");
  });
});
