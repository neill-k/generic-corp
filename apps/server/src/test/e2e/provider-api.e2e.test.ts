import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import net from "node:net";

function waitForPortOpen(port: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const tryOnce = () => {
      const socket = net.connect({ host: "127.0.0.1", port }, () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", (error) => {
        socket.destroy();

        if (Date.now() - startedAt > timeoutMs) {
          reject(error);
          return;
        }

        setTimeout(tryOnce, 100);
      });
    };

    tryOnce();
  });
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  const body = text.length ? JSON.parse(text) : null;
  return { res, body };
}

const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;

describe.skipIf(!hasEncryptionKey)("E2E: Provider API endpoints", () => {
  let serverProc: ChildProcess | null = null;
  let baseUrl = "";

  beforeAll(async () => {
    const port = 31_338;
    baseUrl = `http://127.0.0.1:${port}`;

    serverProc = spawn("node", ["dist/index.js"], {
      cwd: new URL("../../../../", import.meta.url),
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(port),
      },
    });

    await waitForPortOpen(port, 20_000);

    const { res } = await fetchJson(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  afterAll(async () => {
    if (!serverProc) return;

    serverProc.kill("SIGTERM");

    await new Promise<void>((resolve) => {
      serverProc!.once("exit", () => resolve());
      setTimeout(() => {
        if (serverProc && serverProc.exitCode === null) {
          serverProc.kill("SIGKILL");
        }
        resolve();
      }, 5_000);
    });
  });

  it("GET /api/providers/accounts returns empty array initially", async () => {
    const { res, body } = await fetchJson(`${baseUrl}/api/providers/accounts`);

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
  });

  it("GET /api/providers/openai-codex/start returns auth URL", async () => {
    const { res, body } = await fetchJson(
      `${baseUrl}/api/providers/openai-codex/start`
    );

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("authUrl");
    expect(body.authUrl).toContain("auth.openai.com");
    expect(body.authUrl).toContain("state=");
  });

  it("GET /api/providers/github-copilot/start returns device code info", async () => {
    const { res, body } = await fetchJson(
      `${baseUrl}/api/providers/github-copilot/start`
    );

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("userCode");
    expect(body).toHaveProperty("verificationUri");
    expect(body).toHaveProperty("expiresIn");
    expect(body).toHaveProperty("pollId");
  });

  it("GET /api/providers/google-code-assist/start returns auth URL", async () => {
    const { res, body } = await fetchJson(
      `${baseUrl}/api/providers/google-code-assist/start`
    );

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("authUrl");
    expect(body.authUrl).toContain("accounts.google.com");
    expect(body.authUrl).toContain("state=");
  });

  it("POST /api/tasks with invalid providerAccountId returns 404", async () => {
    const { res, body } = await fetchJson(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "Sable Chen",
        title: "Test task",
        description: "Test",
        provider: "openai_codex",
        providerAccountId: "non-existent-id",
      }),
    });

    expect(res.status).toBe(404);
    expect(body.error).toContain("Provider account");
  });

  it("POST /api/tasks with providerAccountId but no provider returns 400", async () => {
    const { res, body } = await fetchJson(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "Sable Chen",
        title: "Test task",
        description: "Test",
        providerAccountId: "some-id",
      }),
    });

    expect(res.status).toBe(400);
    expect(body.error).toContain("provider is required");
  });
});
