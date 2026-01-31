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
    const result = await checkContextHealth(tmpDir);
    expect(result).toBeNull();
  });

  it("returns token count info when context.md is under the advisory limit", async () => {
    // 1000 chars ≈ 250 tokens, well under 6000
    writeFileSync(path.join(tmpDir, ".gc", "context.md"), "x".repeat(1000), "utf8");

    const result = await checkContextHealth(tmpDir);
    expect(result).not.toBeNull();
    expect(result).toContain("250");
    expect(result).toContain("within recommended range");
  });

  it("suggests compacting when context.md exceeds the advisory limit", async () => {
    // 28000 chars ≈ 7000 tokens, over the 6000 limit
    writeFileSync(path.join(tmpDir, ".gc", "context.md"), "x".repeat(28000), "utf8");

    const result = await checkContextHealth(tmpDir);
    expect(result).not.toBeNull();
    expect(result).toContain("7000");
    expect(result).toContain("compacting");
  });

  it("respects GC_CONTEXT_TOKEN_LIMIT env var", async () => {
    // 4000 chars ≈ 1000 tokens, over a limit of 500
    writeFileSync(path.join(tmpDir, ".gc", "context.md"), "x".repeat(4000), "utf8");

    const original = process.env["GC_CONTEXT_TOKEN_LIMIT"];
    process.env["GC_CONTEXT_TOKEN_LIMIT"] = "500";
    try {
      const result = await checkContextHealth(tmpDir);
      expect(result).not.toBeNull();
      expect(result).toContain("1000");
      expect(result).toContain("500");
      expect(result).toContain("compacting");
    } finally {
      if (original !== undefined) {
        process.env["GC_CONTEXT_TOKEN_LIMIT"] = original;
      } else {
        delete process.env["GC_CONTEXT_TOKEN_LIMIT"];
      }
    }
  });
});
