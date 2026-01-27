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

function createRouterMock() {
  const routes = new Map<string, Handler>();
  return {
    routes,
    get(path: string, handler: Handler) {
      routes.set(`GET ${path}`, handler);
    },
    delete(path: string, handler: Handler) {
      routes.set(`DELETE ${path}`, handler);
    },
  } as any;
}

const routerMock = createRouterMock();

vi.mock("express", () => ({
  Router: () => routerMock,
}));

const isEncryptionInitializedMock = vi.fn(() => true);

vi.mock("../../services/encryption.js", () => ({
  isEncryptionInitialized: () => isEncryptionInitializedMock(),
}));

const dbMock = {
  providerAccount: {
    findMany: vi.fn(async () => [{ id: "p1" }]),
    findFirst: vi.fn(async () => ({ id: "p1" })),
    delete: vi.fn(async () => ({})),
  },
};

vi.mock("../../db/index.js", () => ({
  db: dbMock,
}));

vi.mock("../../api/providers/openai-codex.js", () => ({
  setupOpenAICodexRoutes: vi.fn(),
}));

vi.mock("../../api/providers/github-copilot.js", () => ({
  setupGitHubCopilotRoutes: vi.fn(),
}));

vi.mock("../../api/providers/google-code-assist.js", () => ({
  setupGoogleCodeAssistRoutes: vi.fn(),
}));

describe("provider routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerMock.routes.clear();
  });

  it("GET /accounts returns 503 when encryption not configured", async () => {
    isEncryptionInitializedMock.mockReturnValueOnce(false);
    const { setupProviderRoutes } = await import("../../api/providers/index.js");
    setupProviderRoutes();

    const handler = routerMock.routes.get("GET /accounts")!;
    const res = createRes();
    await handler({ query: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: "Encryption not configured" });
  });

  it("GET /accounts returns accounts", async () => {
    const { setupProviderRoutes } = await import("../../api/providers/index.js");
    setupProviderRoutes();

    const handler = routerMock.routes.get("GET /accounts")!;
    const res = createRes();
    await handler({ query: { ownerKey: "local" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([{ id: "p1" }]);
  });

  it("DELETE /accounts/:id handles not-found and deletes", async () => {
    const { setupProviderRoutes } = await import("../../api/providers/index.js");
    setupProviderRoutes();

    const handler = routerMock.routes.get("DELETE /accounts/:id")!;
    const res1 = createRes();
    dbMock.providerAccount.findFirst.mockResolvedValueOnce(null);
    await handler({ params: { id: "missing" }, query: {} }, res1);
    expect(res1.statusCode).toBe(404);

    const res2 = createRes();
    await handler({ params: { id: "p1" }, query: {} }, res2);
    expect(res2.statusCode).toBe(200);
    expect(res2.body).toEqual({ success: true });
    expect(dbMock.providerAccount.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });
});
