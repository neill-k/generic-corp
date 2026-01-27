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

const runE2e = process.env.RUN_E2E === "1";

describe.skipIf(!runE2e)("E2E: REST task execution (CLI runtime)", () => {
  let serverProc: ChildProcess | null = null;
  let baseUrl = "";

  beforeAll(async () => {
    const port = 31_337;
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

  it("creates a task and persists a result", async () => {
    const title = `E2E: 2+2 ${Date.now()}`;

    const create = await fetchJson(`${baseUrl}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId: "Sable Chen",
        title,
        description: "What is 2+2? Answer with just the number.",
        priority: "normal",
      }),
    });

    expect(create.res.status).toBe(201);
    expect(create.body).toHaveProperty("id");

    const taskId = create.body.id as string;

    const execute = await fetchJson(`${baseUrl}/api/tasks/${taskId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    expect(execute.res.status).toBe(200);

    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      const getTask = await fetchJson(`${baseUrl}/api/tasks/${taskId}`);
      expect(getTask.res.status).toBe(200);

      const status = getTask.body.status as string;
      if (status === "failed") {
        throw new Error(`Task failed: ${JSON.stringify(getTask.body.result)}`);
      }

      if (status === "completed") {
        expect(getTask.body.result).toBeTruthy();
        expect(getTask.body.result.success).toBe(true);
        expect(getTask.body.result.output).toBeTypeOf("string");
        expect(getTask.body.result.output.length).toBeGreaterThan(0);
        return;
      }

      await new Promise((r) => setTimeout(r, 1000));
    }

    throw new Error("Timed out waiting for task to complete");
  });
});
