import { describe, expect, it, vi, beforeEach } from "vitest";

import { seedOrganization } from "./seed-org.js";

vi.mock("./seed-data.js", () => ({
  AGENT_SEED: [
    { name: "main", displayName: "Main Agent", role: "CEO", department: "leadership", level: "system", personality: "analytical", avatarColor: "#4F46E5", reportsTo: null },
    { name: "marcus", displayName: "Marcus", role: "CTO", department: "engineering", level: "c-suite", personality: "analytical", avatarColor: "#DC2626", reportsTo: null },
    { name: "sable", displayName: "Sable", role: "Engineer", department: "engineering", level: "lead", personality: "creative", avatarColor: "#059669", reportsTo: "marcus" },
  ],
  TOOL_PERMISSION_SEED: [
    { name: "bash", description: "Shell access", iconName: "terminal", enabled: true },
  ],
  DEFAULT_WORKSPACE: { name: "Default Workspace", slug: "default", description: "Default workspace" },
}));

vi.mock("@generic-corp/shared", () => ({
  MAIN_AGENT_NAME: "main",
}));

const mockPrisma = {
  workspace: { findFirst: vi.fn(), create: vi.fn() },
  toolPermission: { upsert: vi.fn() },
  agent: { upsert: vi.fn() },
  orgNode: { upsert: vi.fn() },
};

describe("seedOrganization", () => {
  let nodeCounter: number;

  beforeEach(() => {
    vi.clearAllMocks();
    nodeCounter = 0;

    mockPrisma.agent.upsert.mockImplementation(async (args: { where: { name: string } }) => {
      return { id: `id-${args.where.name}` };
    });

    mockPrisma.orgNode.upsert.mockImplementation(async () => {
      return { id: `node-${++nodeCounter}` };
    });
  });

  it("seeds workspace if none exists", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    await seedOrganization(mockPrisma as never);

    expect(mockPrisma.workspace.findFirst).toHaveBeenCalledOnce();
    expect(mockPrisma.workspace.create).toHaveBeenCalledOnce();
    expect(mockPrisma.workspace.create).toHaveBeenCalledWith({
      data: { name: "Default Workspace", slug: "default", description: "Default workspace" },
    });
  });

  it("skips workspace creation if one exists", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue({ id: "ws-1", name: "Existing" });

    await seedOrganization(mockPrisma as never);

    expect(mockPrisma.workspace.findFirst).toHaveBeenCalledOnce();
    expect(mockPrisma.workspace.create).not.toHaveBeenCalled();
  });

  it("upserts all tool permissions", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    await seedOrganization(mockPrisma as never);

    expect(mockPrisma.toolPermission.upsert).toHaveBeenCalledOnce();
    expect(mockPrisma.toolPermission.upsert).toHaveBeenCalledWith({
      where: { name: "bash" },
      update: {
        description: "Shell access",
        iconName: "terminal",
        enabled: true,
      },
      create: { name: "bash", description: "Shell access", iconName: "terminal", enabled: true },
    });
  });

  it("upserts all agents", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    await seedOrganization(mockPrisma as never);

    expect(mockPrisma.agent.upsert).toHaveBeenCalledTimes(3);

    const callNames = mockPrisma.agent.upsert.mock.calls.map(
      (call: [{ where: { name: string } }]) => call[0].where.name,
    );
    expect(callNames).toContain("main");
    expect(callNames).toContain("marcus");
    expect(callNames).toContain("sable");
  });

  it("creates org hierarchy excluding main agent", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    await seedOrganization(mockPrisma as never);

    // orgNode.upsert should be called for marcus and sable, but NOT main
    expect(mockPrisma.orgNode.upsert).toHaveBeenCalledTimes(2);

    const agentIds = mockPrisma.orgNode.upsert.mock.calls.map(
      (call: [{ where: { agentId: string } }]) => call[0].where.agentId,
    );
    expect(agentIds).toContain("id-marcus");
    expect(agentIds).toContain("id-sable");
    expect(agentIds).not.toContain("id-main");
  });

  it("sets parent-child relationships correctly", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    await seedOrganization(mockPrisma as never);

    // First orgNode call is for marcus (root), second is for sable (child of marcus)
    const marcusCall = mockPrisma.orgNode.upsert.mock.calls[0][0] as {
      where: { agentId: string };
      create: { parentNodeId: string | null };
    };
    expect(marcusCall.where.agentId).toBe("id-marcus");
    expect(marcusCall.create.parentNodeId).toBeNull();

    const sableCall = mockPrisma.orgNode.upsert.mock.calls[1][0] as {
      where: { agentId: string };
      create: { parentNodeId: string | null };
    };
    expect(sableCall.where.agentId).toBe("id-sable");
    // sable reports to marcus, whose orgNode id is "node-1" (first upsert)
    expect(sableCall.create.parentNodeId).toBe("node-1");
  });

  it("assigns tree-layout positions", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    await seedOrganization(mockPrisma as never);

    for (const call of mockPrisma.orgNode.upsert.mock.calls) {
      const args = call[0] as {
        create: { positionX: number; positionY: number };
      };
      // At least one of positionX or positionY should be a defined number
      expect(typeof args.create.positionX).toBe("number");
      expect(typeof args.create.positionY).toBe("number");
    }

    // With our mock data (marcus root, sable child), the tree layout should give
    // sable x=0 (leaf at nextX=0), marcus centered over sable at x=0 too,
    // but sable is at depth 1 (y=150) and marcus at depth 0 (y=0)
    const marcusCreate = (mockPrisma.orgNode.upsert.mock.calls[0][0] as {
      create: { positionX: number; positionY: number };
    }).create;
    const sableCreate = (mockPrisma.orgNode.upsert.mock.calls[1][0] as {
      create: { positionX: number; positionY: number };
    }).create;

    // marcus is root (depth 0), sable is depth 1
    expect(sableCreate.positionY).toBeGreaterThan(marcusCreate.positionY);
  });
});
