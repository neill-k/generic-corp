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

vi.mock("../../db/index.js", () => ({
  db: {
    agent: {
      findMany: vi.fn(async () => [{ id: "a1" }]),
      findUnique: vi.fn(async () => ({ id: "a1", deletedAt: null })),
      findFirst: vi.fn(async () => ({ id: "a1", name: "Marcus Bell" })),
    },
    task: {
      findMany: vi.fn(async () => [{ id: "t1" }]),
      findUnique: vi.fn(async () => ({ id: "t1", status: "pending", agentId: "a1" })),
      create: vi.fn(async () => ({ id: "t1" })),
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
  },
}));

vi.mock("../../services/event-bus.js", async () => {
  const actual = await vi.importActual<any>("../../services/event-bus.js");
  return {
    ...actual,
    EventBus: {
      emit: vi.fn(),
      on: actual.EventBus.on.bind(actual.EventBus),
      off: actual.EventBus.off.bind(actual.EventBus),
      once: actual.EventBus.once.bind(actual.EventBus),
    },
  };
});

vi.mock("../../api/providers/index.js", () => ({
  setupProviderRoutes: () => ({}),
}));

describe("api routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/agents returns agents", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("GET /api/agents")!;
    const res = createRes();
    await handler({ query: {} }, res);
    expect(res.statusCode).toBe(200);
  });

  it("POST /api/tasks validates agentId and title", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    setupRoutes(app);

    const handler = app.routes.get("POST /api/tasks")!;
    const res = createRes();
    await handler({ body: {} }, res);
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/tasks/:id/execute emits task:queued", async () => {
    const app = createAppMock();
    const { setupRoutes } = await import("../../api/index.js");
    const { EventBus } = await import("../../services/event-bus.js");
    setupRoutes(app);

    const handler = app.routes.get("POST /api/tasks/:id/execute")!;
    const res = createRes();
    await handler({ params: { id: "t1" } }, res);
    expect(res.statusCode).toBe(200);
    expect(EventBus.emit).toHaveBeenCalledWith("task:queued", expect.any(Object));
  });
});
