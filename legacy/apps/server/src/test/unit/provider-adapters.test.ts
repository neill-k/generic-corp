import { describe, expect, it, vi, beforeEach } from "vitest";

const dbMock = {
  providerAccount: {
    update: vi.fn(async () => ({})),
  },
};

vi.mock("../../db/index.js", () => ({
  db: dbMock,
}));

vi.mock("../../services/encryption.js", () => ({
  encryptString: (plaintext: string) => `enc:${plaintext}`,
  decryptString: (_ciphertext: string) => "refresh-token",
}));

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
      throw new Error("not json");
    },
    async text() {
      return text;
    },
  };
}

describe("provider adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("openaiCodexAdapter.execute sets account header and parses output", async () => {
    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(
      okJson({
        choices: [{ text: "hello" }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      }) as any
    );

    const { openaiCodexAdapter } = await import("../../providers/openai-codex.js");
    const result = await openaiCodexAdapter.execute(
      {
        id: "p1",
        accountMeta: { userInfo: { sub: "acct-123" } },
      } as any,
      "token",
      { prompt: "hi" }
    );

    expect(result.output).toBe("hello");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/codex/completions"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "ChatGPT-Account-Id": "acct-123",
        }),
      })
    );
  });

  it("openaiCodexAdapter.execute throws on non-OK response", async () => {
    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(errText(401, "nope") as any);

    const { openaiCodexAdapter } = await import("../../providers/openai-codex.js");
    await expect(
      openaiCodexAdapter.execute({ id: "p1", accountMeta: null } as any, "token", { prompt: "hi" })
    ).rejects.toThrow(/401/);
  });

  it("githubCopilotAdapter.execute includes system prompt and parses output", async () => {
    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(
      okJson({
        choices: [{ message: { content: "ok" } }],
        usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
      }) as any
    );

    const { githubCopilotAdapter } = await import("../../providers/github-copilot.js");
    const result = await githubCopilotAdapter.execute(
      { id: "p1" } as any,
      "token",
      { prompt: "hi", systemPrompt: "sys" }
    );

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(body.messages[1]).toEqual({ role: "user", content: "hi" });
    expect(result.output).toBe("ok");
  });

  it("googleCodeAssistAdapter.execute formats contents and parses output", async () => {
    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(
      okJson({
        candidates: [{ content: { parts: [{ text: "hello" }] } }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2, totalTokenCount: 3 },
      }) as any
    );

    const { googleCodeAssistAdapter } = await import("../../providers/google-code-assist.js");
    const result = await googleCodeAssistAdapter.execute(
      { id: "p1" } as any,
      "token",
      { prompt: "hi", systemPrompt: "sys" }
    );

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(body.contents[0]).toEqual({ role: "user", parts: [{ text: "System: sys" }] });
    expect(body.contents[1]).toEqual({ role: "model", parts: [{ text: "Understood." }] });
    expect(body.contents[2]).toEqual({ role: "user", parts: [{ text: "hi" }] });
    expect(result.output).toBe("hello");
  });

  it("openaiCodexAdapter.refreshToken returns null when no refresh token", async () => {
    const { openaiCodexAdapter } = await import("../../providers/openai-codex.js");
    const refreshed = await openaiCodexAdapter.refreshToken!({ id: "p1", encryptedRefreshToken: null } as any);
    expect(refreshed).toBeNull();
  });

  it("openaiCodexAdapter.refreshToken marks account error when refresh fails", async () => {
    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(errText(400, "bad") as any);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { openaiCodexAdapter } = await import("../../providers/openai-codex.js");
    const refreshed = await openaiCodexAdapter.refreshToken!({
      id: "p1",
      encryptedRefreshToken: "enc:refresh",
    } as any);

    expect(refreshed).toBeNull();
    expect(dbMock.providerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ status: "error" }),
      })
    );

    errSpy.mockRestore();
  });

  it("openaiCodexAdapter.refreshToken updates stored tokens on success", async () => {
    vi.spyOn(Date, "now").mockReturnValueOnce(1_000_000);

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(
      okJson({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 10,
      }) as any
    );

    const { openaiCodexAdapter } = await import("../../providers/openai-codex.js");
    const refreshed = await openaiCodexAdapter.refreshToken!({
      id: "p1",
      encryptedRefreshToken: "enc:old-refresh",
    } as any);

    expect(refreshed?.accessToken).toBe("new-access");
    expect(refreshed?.expiresAt?.getTime()).toBe(1_000_000 + 10_000);
    expect(dbMock.providerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({
          encryptedAccessToken: "enc:new-access",
          encryptedRefreshToken: "enc:new-refresh",
          lastError: null,
          lastErrorAt: null,
        }),
      })
    );
  });

  it("googleCodeAssistAdapter.refreshToken updates stored tokens on success", async () => {
    vi.resetModules();
    process.env.GOOGLE_CODE_ASSIST_CLIENT_ID = "client";
    process.env.GOOGLE_CODE_ASSIST_CLIENT_SECRET = "secret";

    const fetchMock = vi.mocked(fetch as any);
    fetchMock.mockResolvedValueOnce(
      okJson({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 10,
      }) as any
    );

    const { googleCodeAssistAdapter } = await import("../../providers/google-code-assist.js");
    const refreshed = await googleCodeAssistAdapter.refreshToken!({
      id: "p1",
      encryptedRefreshToken: "enc:old-refresh",
    } as any);

    expect(refreshed?.accessToken).toBe("new-access");
    expect(dbMock.providerAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({
          encryptedAccessToken: "enc:new-access",
          encryptedRefreshToken: "enc:new-refresh",
        }),
      })
    );
  });
});
