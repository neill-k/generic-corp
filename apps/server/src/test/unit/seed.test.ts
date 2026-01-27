import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMock = {
  agent: {
    count: vi.fn(async () => 0),
    create: vi.fn(async () => ({})),
  },
  gameState: {
    create: vi.fn(async () => ({})),
  },
};

vi.mock("../../db/index.js", () => ({
  db: dbMock,
}));

describe("seedAgents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when agents already exist", async () => {
    dbMock.agent.count.mockResolvedValueOnce(1);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { seedAgents } = await import("../../db/seed.js");
    await seedAgents();

    expect(dbMock.agent.create).not.toHaveBeenCalled();
    expect(dbMock.gameState.create).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("seeds default agents and game state", async () => {
    dbMock.agent.count.mockResolvedValueOnce(0);
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { seedAgents } = await import("../../db/seed.js");
    await seedAgents();

    expect(dbMock.agent.create).toHaveBeenCalledTimes(5);
    expect(dbMock.gameState.create).toHaveBeenCalledTimes(1);
    logSpy.mockRestore();
  });
});
