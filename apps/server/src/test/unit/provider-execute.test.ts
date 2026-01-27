import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../db/index.js", () => ({
  db: {
    providerAccount: {
      findUnique: vi.fn(async () => ({
        id: "acc",
        provider: "github_copilot",
        status: "active",
        encryptedAccessToken: "enc",
        accessTokenExpiresAt: null,
      })),
      update: vi.fn(async () => ({})),
    },
  },
}));

vi.mock("../../services/encryption.js", () => ({
  decryptString: vi.fn(() => "token"),
  isEncryptionInitialized: vi.fn(() => true),
}));

vi.mock("../../providers/github-copilot.js", () => ({
  githubCopilotAdapter: {
    kind: "github_copilot",
    execute: vi.fn(async () => ({ output: "OK" })),
  },
}));

vi.mock("../../providers/openai-codex.js", () => ({
  openaiCodexAdapter: { kind: "openai_codex", execute: vi.fn(async () => ({ output: "OK" })) },
}));

vi.mock("../../providers/google-code-assist.js", () => ({
  googleCodeAssistAdapter: { kind: "google_code_assist", execute: vi.fn(async () => ({ output: "OK" })) },
}));

describe("executeWithProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes via provider adapter and updates lastUsedAt", async () => {
    const providers = await import("../../providers/index.js");
    const { db } = await import("../../db/index.js");

    const res = await providers.executeWithProvider("acc", { prompt: "Hi" });
    expect(res.output).toBe("OK");
    expect(db.providerAccount.update).toHaveBeenCalled();
  });

  it("throws if encryption not initialized", async () => {
    const enc = await import("../../services/encryption.js");
    (enc.isEncryptionInitialized as any).mockReturnValueOnce(false);

    const providers = await import("../../providers/index.js");
    await expect(providers.executeWithProvider("acc", { prompt: "Hi" })).rejects.toThrow(
      "Encryption not initialized"
    );
  });
});
