import { describe, expect, it, vi, beforeEach } from "vitest";

type Handler = (req: any, res: any) => any;

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    redirectUrl: undefined as string | undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
    redirect(url: string) {
      res.redirectUrl = url;
      return res;
    },
  };
  return res;
}

function createRouterMock() {
  const routes = new Map<string, Handler>();
  return {
    routes,
    post(path: string, handler: Handler) {
      routes.set(`POST ${path}`, handler);
    },
    get(path: string, handler: Handler) {
      routes.set(`GET ${path}`, handler);
    },
  } as any;
}

const dbMock = {
  oAuthTransaction: {
    create: vi.fn(async () => ({ id: "tx1" })),
    findUnique: vi.fn(async () => null),
    delete: vi.fn(async () => ({})),
  },
  providerAccount: {
    create: vi.fn(async () => ({})),
  },
};

vi.mock("../../db/index.js", () => ({
  db: dbMock,
}));

const encryptionMock = {
  isEncryptionInitialized: vi.fn(() => true),
  encryptString: vi.fn((s: string) => `enc:${s}`),
  decryptString: vi.fn((_s: string) => "verifier"),
};

vi.mock("../../services/encryption.js", () => encryptionMock);

function okJson(data: unknown) {
  return {
    ok: true,
    status: 200,
    async json() {
      return data;
    },
    async text() {
      return JSON.stringify(data);
    },
  };
}

function errText(status: number, text: string) {
  return {
    ok: false,
    status,
    async json() {
      return { error: text };
    },
    async text() {
      return text;
    },
  };
}

describe("api provider oauth flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.CLIENT_URL = "http://client";
  });

  it("openai connect/start returns 503 when encryption not configured", async () => {
    vi.resetModules();
    encryptionMock.isEncryptionInitialized.mockReturnValueOnce(false);

    process.env.OPENAI_CODEX_CLIENT_ID = "client";
    process.env.OPENAI_CODEX_REDIRECT_URI = "http://redirect";

    const router = createRouterMock();
    const { setupOpenAICodexRoutes } = await import("../../api/providers/openai-codex.js");
    setupOpenAICodexRoutes(router);

    const res = createRes();
    await router.routes.get("POST /openai_codex/connect/start")!({ body: {} }, res);
    expect(res.statusCode).toBe(503);
  });

  it("openai connect/start returns 503 when env missing", async () => {
    vi.resetModules();
    process.env.OPENAI_CODEX_CLIENT_ID = "";
    process.env.OPENAI_CODEX_REDIRECT_URI = "";

    const router = createRouterMock();
    const { setupOpenAICodexRoutes } = await import("../../api/providers/openai-codex.js");
    setupOpenAICodexRoutes(router);

    const res = createRes();
    await router.routes.get("POST /openai_codex/connect/start")!({ body: {} }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it("openai connect/start returns authUrl and persists transaction", async () => {
    vi.resetModules();
    process.env.OPENAI_CODEX_CLIENT_ID = "client";
    process.env.OPENAI_CODEX_REDIRECT_URI = "http://redirect";

    const router = createRouterMock();
    const { setupOpenAICodexRoutes } = await import("../../api/providers/openai-codex.js");
    setupOpenAICodexRoutes(router);

    const res = createRes();
    await router.routes.get("POST /openai_codex/connect/start")!({ body: { ownerKey: "local" } }, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.authUrl).toContain("auth.openai.com/authorize");
    expect(typeof res.body.state).toBe("string");
    expect(dbMock.oAuthTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ provider: "openai_codex", ownerKey: "local" }),
      })
    );
  });

  it("openai callback redirects for oauth error and missing params", async () => {
    vi.resetModules();
    process.env.OPENAI_CODEX_CLIENT_ID = "client";
    process.env.OPENAI_CODEX_REDIRECT_URI = "http://redirect";

    const router = createRouterMock();
    const { setupOpenAICodexRoutes } = await import("../../api/providers/openai-codex.js");
    setupOpenAICodexRoutes(router);

    const handler = router.routes.get("GET /openai_codex/connect/callback")!;

    const res1 = createRes();
    await handler({ query: { error: "access_denied" } }, res1);
    expect(res1.redirectUrl).toContain("/providers?error=");

    const res2 = createRes();
    await handler({ query: { state: "s" } }, res2);
    expect(res2.redirectUrl).toContain("missing_params");
  });

  it("openai callback handles invalid/expired state and token exchange failure", async () => {
    vi.resetModules();
    process.env.OPENAI_CODEX_CLIENT_ID = "client";
    process.env.OPENAI_CODEX_REDIRECT_URI = "http://redirect";

    const router = createRouterMock();
    const { setupOpenAICodexRoutes } = await import("../../api/providers/openai-codex.js");
    setupOpenAICodexRoutes(router);

    const handler = router.routes.get("GET /openai_codex/connect/callback")!;

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce(null);
    const res1 = createRes();
    await handler({ query: { code: "c", state: "s" } }, res1);
    expect(res1.redirectUrl).toContain("invalid_state");

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce({
      id: "tx1",
      provider: "openai_codex",
      ownerKey: "local",
      state: "s",
      encryptedPkceVerifier: "enc:v",
      expiresAt: new Date(0),
    } as any);
    const res2 = createRes();
    await handler({ query: { code: "c", state: "s" } }, res2);
    expect(dbMock.oAuthTransaction.delete).toHaveBeenCalled();
    expect(res2.redirectUrl).toContain("expired_state");

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce({
      id: "tx2",
      provider: "openai_codex",
      ownerKey: "local",
      state: "s",
      encryptedPkceVerifier: "enc:v",
      expiresAt: new Date(Date.now() + 60_000),
    } as any);

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(errText(400, "bad") as any);

    const res3 = createRes();
    await handler({ query: { code: "c", state: "s" } }, res3);
    expect(res3.redirectUrl).toContain("token_exchange_failed");
  });

  it("openai callback success creates provider account", async () => {
    vi.resetModules();
    process.env.OPENAI_CODEX_CLIENT_ID = "client";
    process.env.OPENAI_CODEX_REDIRECT_URI = "http://redirect";

    const router = createRouterMock();
    const { setupOpenAICodexRoutes } = await import("../../api/providers/openai-codex.js");
    setupOpenAICodexRoutes(router);

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce({
      id: "tx3",
      provider: "openai_codex",
      ownerKey: "local",
      state: "s",
      encryptedPkceVerifier: "enc:v",
      expiresAt: new Date(Date.now() + 60_000),
    } as any);

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/oauth/token")) {
        return okJson({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 10,
          token_type: "bearer",
          scope: "openid profile",
        }) as any;
      }
      if (url.includes("/userinfo")) {
        return okJson({ sub: "u1" }) as any;
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const handler = router.routes.get("GET /openai_codex/connect/callback")!;
    const res = createRes();
    await handler({ query: { code: "c", state: "s" } }, res);

    expect(dbMock.providerAccount.create).toHaveBeenCalled();
    expect(dbMock.oAuthTransaction.delete).toHaveBeenCalledWith({ where: { id: "tx3" } });
    expect(res.redirectUrl).toContain("success=openai_codex");
  });

  it("github connect/start returns device code info", async () => {
    vi.resetModules();
    process.env.GITHUB_COPILOT_CLIENT_ID = "client";

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(
      okJson({
        device_code: "dc",
        user_code: "uc",
        verification_uri: "http://verify",
        expires_in: 600,
        interval: 5,
      }) as any
    );

    dbMock.oAuthTransaction.create.mockResolvedValueOnce({ id: "poll1" } as any);

    const router = createRouterMock();
    const { setupGitHubCopilotRoutes } = await import("../../api/providers/github-copilot.js");
    setupGitHubCopilotRoutes(router);

    const res = createRes();
    await router.routes.get("POST /github_copilot/connect/start")!({ body: { ownerKey: "local" } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        pollId: "poll1",
        userCode: "uc",
        verificationUri: "http://verify",
      })
    );
  });

  it("github connect/poll handles pending and success", async () => {
    vi.resetModules();
    process.env.GITHUB_COPILOT_CLIENT_ID = "client";

    const router = createRouterMock();
    const { setupGitHubCopilotRoutes } = await import("../../api/providers/github-copilot.js");
    setupGitHubCopilotRoutes(router);
    const handler = router.routes.get("POST /github_copilot/connect/poll")!;

    const resBad = createRes();
    await handler({ body: {} }, resBad);
    expect(resBad.statusCode).toBe(400);

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce({
      id: "poll1",
      provider: "github_copilot",
      ownerKey: "local",
      state: "dc",
      expiresAt: new Date(Date.now() + 60_000),
    } as any);

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(okJson({ error: "authorization_pending", interval: 5 }) as any);

    const res1 = createRes();
    await handler({ body: { pollId: "poll1" } }, res1);
    expect(res1.body.status).toBe("pending");

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce({
      id: "poll2",
      provider: "github_copilot",
      ownerKey: "local",
      state: "dc",
      expiresAt: new Date(Date.now() + 60_000),
    } as any);

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("/access_token")) {
        return okJson({ access_token: "at", scope: "read:user" }) as any;
      }
      if (url.includes("api.github.com/user")) {
        return okJson({ login: "me", id: 1, name: "Me" }) as any;
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const res2 = createRes();
    await handler({ body: { pollId: "poll2" } }, res2);
    expect(res2.body.status).toBe("success");
    expect(dbMock.providerAccount.create).toHaveBeenCalled();
    expect(dbMock.oAuthTransaction.delete).toHaveBeenCalledWith({ where: { id: "poll2" } });
  });

  it("google connect/start and callback success", async () => {
    vi.resetModules();
    process.env.GOOGLE_CODE_ASSIST_CLIENT_ID = "client";
    process.env.GOOGLE_CODE_ASSIST_REDIRECT_URI = "http://redirect";
    process.env.GOOGLE_CODE_ASSIST_CLIENT_SECRET = "";

    const router = createRouterMock();
    const { setupGoogleCodeAssistRoutes } = await import("../../api/providers/google-code-assist.js");
    setupGoogleCodeAssistRoutes(router);

    const startRes = createRes();
    await router.routes.get("POST /google_code_assist/connect/start")!({ body: { ownerKey: "local" } }, startRes);
    expect(startRes.body.authUrl).toContain("accounts.google.com");
    expect(dbMock.oAuthTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ provider: "google_code_assist" }) })
    );

    dbMock.oAuthTransaction.findUnique.mockResolvedValueOnce({
      id: "txg",
      provider: "google_code_assist",
      ownerKey: "local",
      state: "s",
      encryptedPkceVerifier: "enc:v",
      expiresAt: new Date(Date.now() + 60_000),
    } as any);

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("oauth2.googleapis.com/token")) {
        return okJson({
          access_token: "at",
          refresh_token: "rt",
          expires_in: 10,
          token_type: "bearer",
          scope: "openid profile",
        }) as any;
      }
      if (url.includes("googleapis.com/oauth2")) {
        return okJson({ email: "a@b.com", name: "A", id: "1" }) as any;
      }
      throw new Error(`unexpected url: ${url}`);
    });

    const cbRes = createRes();
    await router.routes.get("GET /google_code_assist/connect/callback")!({ query: { code: "c", state: "s" } }, cbRes);
    expect(cbRes.redirectUrl).toContain("success=google_code_assist");
    expect(dbMock.providerAccount.create).toHaveBeenCalled();
  });
});
