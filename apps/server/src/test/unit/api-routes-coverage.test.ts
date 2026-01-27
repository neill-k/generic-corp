import { describe, expect, it, vi, beforeEach } from "vitest";

type Handler = (req: any, res: any) => any;

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function createAppMock() {
  const routes = new Map<string, Handler>();
  return {
    routes,
    get(path: string, handler: Handler) {
      routes.set(`GET ${path}`, handler);
    },
    post(path: string, handler: Handler) {
      routes.set(`POST ${path}`, handler);
    },
    use(_path: string, _router: any) {
      // ignore for unit tests
    },
  } as any;
}

const dbMock = {
  agent: {
    findMany: vi.fn(async () => [{ id: "a1" }]),
    findUnique: vi.fn(async () => ({ id: "a1", deletedAt: null })),
    findFirst: vi.fn(async () => ({ id: "a1", name: "Marcus Bell", deletedAt: null })),
  },
  task: {
    findMany: vi.fn(async () => [{ id: "t1" }]),
    findUnique: vi.fn(async () => ({ id: "t1", status: "pending", agentId: "a1" })),
    create: vi.fn(async () => ({ id: "t-created" })),
  },
  message: {
    findMany: vi.fn(async () => []),
  },
  activityLog: {
    findMany: vi.fn(async () => []),
  },
  gameState: {
    findUnique: vi.fn(async () => null),
  },
  providerAccount: {
    findUnique: vi.fn(async () => ({ id: "p1", provider: "openai_codex", status: "active" })),
  },
};

vi.mock("../../db/index.js", () => ({
  db: dbMock,
}));

const eventBusMock = {
  emit: vi.fn(),
};

vi.mock("../../services/event-bus.js", () => ({
  EventBus: eventBusMock,
}));

vi.mock("../../api/providers/index.js", () => ({
  setupProviderRoutes: () => ({}),
}));

describe("api routes coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/agents returns 500 on db error", async () => {
    dbMock.agent.findMany.mockRejectedValueOnce(new Error("db"));
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const res = createRes();
    await app.routes.get("GET /api/agents")!({ query: {} }, res);
    expect(res.statusCode).toBe(500);
  });

  it("GET /api/agents/:id returns 404 when missing or deleted", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("GET /api/agents/:id")!;

    dbMock.agent.findUnique.mockResolvedValueOnce(null);
    const res1 = createRes();
    await handler({ params: { id: "missing" } }, res1);
    expect(res1.statusCode).toBe(404);

    dbMock.agent.findUnique.mockResolvedValueOnce({ id: "a1", deletedAt: new Date() } as any);
    const res2 = createRes();
    await handler({ params: { id: "a1" } }, res2);
    expect(res2.statusCode).toBe(404);
  });

  it("GET /api/agents/:id returns agent", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const res = createRes();
    await app.routes.get("GET /api/agents/:id")!({ params: { id: "a1" } }, res);
    expect(res.statusCode).toBe(200);
  });

  it("GET /api/tasks applies query filters and handles errors", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("GET /api/tasks")!;

    const res1 = createRes();
    await handler({ query: { status: "pending", agentId: "a1" } }, res1);
    expect(res1.statusCode).toBe(200);
    expect(dbMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "pending",
          agentId: "a1",
        }),
      })
    );

    const res2 = createRes();
    await handler({ query: { status: ["pending"], agentId: ["a1"] } }, res2);
    expect(res2.statusCode).toBe(200);

    dbMock.task.findMany.mockRejectedValueOnce(new Error("db"));
    const res3 = createRes();
    await handler({ query: {} }, res3);
    expect(res3.statusCode).toBe(500);
  });

  it("GET /api/tasks/:id returns 404 when missing", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    dbMock.task.findUnique.mockResolvedValueOnce(null);
    const res = createRes();
    await app.routes.get("GET /api/tasks/:id")!({ params: { id: "missing" } }, res);
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/tasks validates provider requirements and creates tasks", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);
    const handler = app.routes.get("POST /api/tasks")!;

    const res1 = createRes();
    await handler({ body: { agentId: "a", title: "t", providerAccountId: "p1" } }, res1);
    expect(res1.statusCode).toBe(400);

    dbMock.agent.findFirst.mockResolvedValueOnce(null);
    const res2 = createRes();
    await handler({ body: { agentId: "missing", title: "t" } }, res2);
    expect(res2.statusCode).toBe(404);

    dbMock.providerAccount.findUnique.mockResolvedValueOnce(null);
    const res3 = createRes();
    await handler({ body: { agentId: "Marcus Bell", title: "t", provider: "openai_codex", providerAccountId: "missing" } }, res3);
    expect(res3.statusCode).toBe(404);

    dbMock.providerAccount.findUnique.mockResolvedValueOnce({ id: "p1", provider: "openai_codex", status: "paused" } as any);
    const res4 = createRes();
    await handler({ body: { agentId: "Marcus Bell", title: "t", provider: "openai_codex", providerAccountId: "p1" } }, res4);
    expect(res4.statusCode).toBe(400);

    dbMock.providerAccount.findUnique.mockResolvedValueOnce({ id: "p1", provider: "github_copilot", status: "active" } as any);
    const res5 = createRes();
    await handler({ body: { agentId: "Marcus Bell", title: "t", provider: "openai_codex", providerAccountId: "p1" } }, res5);
    expect(res5.statusCode).toBe(400);

    const res6 = createRes();
    await handler({ body: { agentId: "Marcus Bell", title: "t", provider: "openai_codex", providerAccountId: "p1" } }, res6);
    expect(res6.statusCode).toBe(201);

    dbMock.task.create.mockRejectedValueOnce(new Error("db"));
    const res7 = createRes();
    await handler({ body: { agentId: "Marcus Bell", title: "t" } }, res7);
    expect(res7.statusCode).toBe(500);
  });

  it("POST /api/tasks/:id/execute handles missing, conflict, and success", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);
    const handler = app.routes.get("POST /api/tasks/:id/execute")!;

    dbMock.task.findUnique.mockResolvedValueOnce(null);
    const res1 = createRes();
    await handler({ params: { id: "missing" } }, res1);
    expect(res1.statusCode).toBe(404);

    dbMock.task.findUnique.mockResolvedValueOnce({ id: "t1", status: "completed", agentId: "a1" } as any);
    const res2 = createRes();
    await handler({ params: { id: "t1" } }, res2);
    expect(res2.statusCode).toBe(409);

    const res3 = createRes();
    await handler({ params: { id: "t1" } }, res3);
    expect(res3.statusCode).toBe(200);
    expect(eventBusMock.emit).toHaveBeenCalledWith("task:queued", expect.any(Object));
  });

  it("GET /api/messages includes filters", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("GET /api/messages")!;
    const res = createRes();
    await handler({ query: { agentId: "a1", type: "direct", status: "pending" } }, res);
    expect(res.statusCode).toBe(200);
    expect(dbMock.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ fromAgentId: "a1" }, { toAgentId: "a1" }],
          type: "direct",
          status: "pending",
        }),
      })
    );
  });

  it("GET /api/drafts/pending returns 500 on db error", async () => {
    dbMock.message.findMany.mockRejectedValueOnce(new Error("db"));
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const res = createRes();
    await app.routes.get("GET /api/drafts/pending")!({ query: {} }, res);
    expect(res.statusCode).toBe(500);
  });

  it("GET /api/activity parses limit and defaults", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("GET /api/activity")!;

    const res1 = createRes();
    await handler({ query: { agentId: "a1", limit: "5" } }, res1);
    expect(dbMock.activityLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));

    const res2 = createRes();
    await handler({ query: { limit: "nope" } }, res2);
    expect(dbMock.activityLog.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));

    dbMock.activityLog.findMany.mockRejectedValueOnce(new Error("db"));
    const res3 = createRes();
    await handler({ query: {} }, res3);
    expect(res3.statusCode).toBe(500);
  });

  it("GET /api/game-state returns default when missing", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("GET /api/game-state")!;
    const res1 = createRes();
    await handler({ query: {} }, res1);
    expect(res1.body).toEqual({ budgetRemainingUsd: 100, budgetLimitUsd: 100 });

    dbMock.gameState.findUnique.mockResolvedValueOnce({ budgetRemainingUsd: 1, budgetLimitUsd: 2 } as any);
    const res2 = createRes();
    await handler({ query: {} }, res2);
    expect(res2.body).toEqual({ budgetRemainingUsd: 1, budgetLimitUsd: 2 });

    dbMock.gameState.findUnique.mockRejectedValueOnce(new Error("db"));
    const res3 = createRes();
    await handler({ query: {} }, res3);
    expect(res3.statusCode).toBe(500);
  });
});
