import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteStorageProvider } from "./local-sqlite-storage.js";
import { unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testDbPath = join(tmpdir(), `gc-test-${Date.now()}.sqlite`);

describe("SqliteStorageProvider", () => {
  let provider: SqliteStorageProvider;

  beforeEach(async () => {
    provider = new SqliteStorageProvider(testDbPath);
    await provider.initialize();
  });

  afterEach(async () => {
    await provider.dispose();
    try { unlinkSync(testDbPath); } catch { /* ignore */ }
    try { unlinkSync(testDbPath + "-wal"); } catch { /* ignore */ }
    try { unlinkSync(testDbPath + "-shm"); } catch { /* ignore */ }
  });

  it("returns undefined for missing key", async () => {
    expect(await provider.get("ns", "missing")).toBeUndefined();
  });

  it("stores and retrieves a value", async () => {
    await provider.set("ns", "key1", "value1");
    expect(await provider.get("ns", "key1")).toBe("value1");
  });

  it("overwrites existing value", async () => {
    await provider.set("ns", "key1", "old");
    await provider.set("ns", "key1", "new");
    expect(await provider.get("ns", "key1")).toBe("new");
  });

  it("isolates namespaces", async () => {
    await provider.set("ns1", "key", "val1");
    await provider.set("ns2", "key", "val2");
    expect(await provider.get("ns1", "key")).toBe("val1");
    expect(await provider.get("ns2", "key")).toBe("val2");
  });

  it("deletes a key", async () => {
    await provider.set("ns", "key", "val");
    expect(await provider.delete("ns", "key")).toBe(true);
    expect(await provider.get("ns", "key")).toBeUndefined();
  });

  it("delete returns false for missing key", async () => {
    expect(await provider.delete("ns", "missing")).toBe(false);
  });

  it("lists entries in a namespace", async () => {
    await provider.set("ns", "b", "2");
    await provider.set("ns", "a", "1");
    await provider.set("other", "c", "3");

    const entries = await provider.list("ns");
    expect(entries).toHaveLength(2);
    expect(entries[0]!.key).toBe("a"); // sorted by key
    expect(entries[1]!.key).toBe("b");
  });

  it("returns empty list for empty namespace", async () => {
    expect(await provider.list("empty")).toEqual([]);
  });

  it("returns undefined after dispose", async () => {
    await provider.set("ns", "key", "val");
    await provider.dispose();
    // Re-create since db is closed
    provider = new SqliteStorageProvider(testDbPath);
    expect(await provider.get("ns", "key")).toBeUndefined();
  });
});
