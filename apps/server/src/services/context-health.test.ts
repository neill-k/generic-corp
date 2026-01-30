import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import { checkContextHealth } from "./context-health.js";

describe("checkContextHealth", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `gc-context-health-${Date.now()}`);
    mkdirSync(path.join(tmpDir, ".gc"), { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null when context.md does not exist", async () => {
    const warning = await checkContextHealth(tmpDir);
    expect(warning).toBeNull();
  });

  it("returns null when context.md is under the token limit", async () => {
    // 1000 chars ≈ 250 tokens, well under 6000
    writeFileSync(path.join(tmpDir, ".gc", "context.md"), "x".repeat(1000), "utf8");

    const warning = await checkContextHealth(tmpDir);
    expect(warning).toBeNull();
  });

  it("returns a warning when context.md exceeds the token limit", async () => {
    // 28000 chars ≈ 7000 tokens, over the 6000 limit
    writeFileSync(path.join(tmpDir, ".gc", "context.md"), "x".repeat(28000), "utf8");

    const warning = await checkContextHealth(tmpDir);
    expect(warning).not.toBeNull();
    expect(warning).toContain("7000");
    expect(warning).toContain("compacting");
  });

  it("uses a custom token limit when provided", async () => {
    // 4000 chars ≈ 1000 tokens
    writeFileSync(path.join(tmpDir, ".gc", "context.md"), "x".repeat(4000), "utf8");

    const warning = await checkContextHealth(tmpDir, 500);
    expect(warning).not.toBeNull();
    expect(warning).toContain("1000");
  });
});
