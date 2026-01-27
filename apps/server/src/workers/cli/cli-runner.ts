import { spawn } from "child_process";
import type { CliRunRequest, CliRunResult, CliToolAdapter } from "./types.js";

export class CliRunner {
  async run(adapter: CliToolAdapter, req: CliRunRequest): Promise<CliRunResult> {
    const start = Date.now();
    const { command, args, env: adapterEnv } = adapter.buildCommand(req);

    const env = {
      ...process.env,
      ...(req.env ?? {}),
      ...(adapterEnv ?? {}),
    };

    return await new Promise<CliRunResult>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: req.cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let settled = false;

      const timeoutMs = req.timeoutMs ?? 120_000;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.kill("SIGKILL");
        reject(new Error(`CLI timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err);
      });

      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? -1,
          durationMs: Date.now() - start,
        });
      });
    });
  }
}
