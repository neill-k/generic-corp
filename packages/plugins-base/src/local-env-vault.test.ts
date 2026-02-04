import { describe, it, expect, afterEach } from "vitest";
import { EnvVaultProvider } from "./local-env-vault.js";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testEnvPath = join(tmpdir(), `.env-test-${Date.now()}`);

describe("EnvVaultProvider", () => {
  afterEach(() => {
    try { unlinkSync(testEnvPath); } catch { /* ignore */ }
    delete process.env["GC_TEST_SECRET"];
  });

  it("resolves from .env file", async () => {
    writeFileSync(testEnvPath, 'MY_KEY=abc123\nOTHER_KEY="quoted value"\n');
    const provider = new EnvVaultProvider(testEnvPath);
    await provider.initialize();

    expect(await provider.resolve("MY_KEY")).toBe("abc123");
    expect(await provider.resolve("OTHER_KEY")).toBe("quoted value");
  });

  it("resolves from process.env as fallback", async () => {
    process.env["GC_TEST_SECRET"] = "from-env";
    const provider = new EnvVaultProvider("/nonexistent/.env");
    await provider.initialize();

    expect(await provider.resolve("GC_TEST_SECRET")).toBe("from-env");
  });

  it(".env file takes priority over process.env", async () => {
    process.env["GC_TEST_SECRET"] = "from-process";
    writeFileSync(testEnvPath, "GC_TEST_SECRET=from-file\n");

    const provider = new EnvVaultProvider(testEnvPath);
    await provider.initialize();

    expect(await provider.resolve("GC_TEST_SECRET")).toBe("from-file");
  });

  it("returns undefined for missing secrets", async () => {
    const provider = new EnvVaultProvider("/nonexistent/.env");
    await provider.initialize();
    expect(await provider.resolve("NONEXISTENT_KEY_12345")).toBeUndefined();
  });

  it("exists returns correct values", async () => {
    writeFileSync(testEnvPath, "EXISTS_KEY=yes\n");
    const provider = new EnvVaultProvider(testEnvPath);
    await provider.initialize();

    expect(await provider.exists("EXISTS_KEY")).toBe(true);
    expect(await provider.exists("NOPE_KEY_12345")).toBe(false);
  });

  it("skips comments and empty lines", async () => {
    writeFileSync(testEnvPath, "# comment\n\nKEY=val\n# another comment\n");
    const provider = new EnvVaultProvider(testEnvPath);
    await provider.initialize();

    expect(await provider.resolve("KEY")).toBe("val");
  });

  it("handles single-quoted values", async () => {
    writeFileSync(testEnvPath, "KEY='single quoted'\n");
    const provider = new EnvVaultProvider(testEnvPath);
    await provider.initialize();

    expect(await provider.resolve("KEY")).toBe("single quoted");
  });

  it("handles missing .env file gracefully", async () => {
    const provider = new EnvVaultProvider("/does/not/exist/.env");
    await expect(provider.initialize()).resolves.toBeUndefined();
  });

  it("listPlaceholders includes both .env and process.env keys", async () => {
    process.env["GC_TEST_SECRET"] = "test";
    writeFileSync(testEnvPath, "FILE_KEY=val\n");

    const provider = new EnvVaultProvider(testEnvPath);
    await provider.initialize();

    const keys = await provider.listPlaceholders();
    expect(keys).toContain("FILE_KEY");
    expect(keys).toContain("GC_TEST_SECRET");
  });
});
