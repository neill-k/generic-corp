import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../db/index.js", () => ({
  db: {
    agent: {
      findMany: vi.fn(async () => [
        { id: "a1", name: "Marcus Bell" },
        { id: "a2", name: "Sable Chen" },
        { id: "a3", name: "DeVonte Jackson" },
      ]),
    },
  },
}));

describe("agents registry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes agents present in DB", async () => {
    const agents = await import("../../agents/index.js");
    await agents.initializeAgents();

    expect(agents.hasAgent("Marcus Bell")).toBe(true);
    expect(agents.hasAgent("Sable Chen")).toBe(true);
    expect(agents.hasAgent("DeVonte Jackson")).toBe(true);
    expect(agents.getAllAgents().length).toBe(3);
  });
});
