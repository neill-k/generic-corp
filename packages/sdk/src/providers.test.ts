import { describe, it, expect } from "vitest";
import {
  Provider,
  StorageProvider,
  VaultProvider,
  IdentityProvider,
  RuntimeProvider,
} from "./providers.js";
import type { AgentEvent, AgentInvocation } from "@generic-corp/shared";

class TestProvider extends Provider {
  readonly providerId = "test";
  readonly providerName = "Test";
}

class TestStorage extends StorageProvider {
  readonly providerId = "test-storage";
  readonly providerName = "Test Storage";
}

class TestVault extends VaultProvider {
  readonly providerId = "test-vault";
  readonly providerName = "Test Vault";
  private readonly secrets = new Map<string, string>([["MY_SECRET", "s3cret"]]);

  override async resolve(name: string): Promise<string | undefined> {
    return this.secrets.get(name);
  }

  override async listPlaceholders(): Promise<string[]> {
    return [...this.secrets.keys()];
  }
}

class TestIdentity extends IdentityProvider {
  readonly providerId = "test-identity";
  readonly providerName = "Test Identity";
}

class TestRuntime extends RuntimeProvider {
  readonly providerId = "test-runtime";
  readonly providerName = "Test Runtime";

  override async *invoke(_params: AgentInvocation): AsyncGenerator<AgentEvent> {
    yield { type: "message", content: "done" };
    yield { type: "result", result: { output: "ok", costUsd: 0, durationMs: 0, numTurns: 1, status: "success" } };
  }
}

describe("Provider base class", () => {
  it("has default initialize and dispose", async () => {
    const p = new TestProvider();
    await expect(p.initialize()).resolves.toBeUndefined();
    await expect(p.dispose()).resolves.toBeUndefined();
  });
});

describe("StorageProvider", () => {
  it("get returns undefined by default", async () => {
    const s = new TestStorage();
    expect(await s.get("ns", "key")).toBeUndefined();
  });

  it("set is a no-op by default", async () => {
    const s = new TestStorage();
    await expect(s.set("ns", "key", "val")).resolves.toBeUndefined();
  });

  it("delete returns false by default", async () => {
    const s = new TestStorage();
    expect(await s.delete("ns", "key")).toBe(false);
  });

  it("list returns empty array by default", async () => {
    const s = new TestStorage();
    expect(await s.list("ns")).toEqual([]);
  });

  it("is instanceof StorageProvider and Provider", () => {
    const s = new TestStorage();
    expect(s).toBeInstanceOf(StorageProvider);
    expect(s).toBeInstanceOf(Provider);
  });
});

describe("VaultProvider", () => {
  it("resolve returns value when present", async () => {
    const v = new TestVault();
    expect(await v.resolve("MY_SECRET")).toBe("s3cret");
  });

  it("resolve returns undefined for missing secret", async () => {
    const v = new TestVault();
    expect(await v.resolve("MISSING")).toBeUndefined();
  });

  it("exists uses resolve result", async () => {
    const v = new TestVault();
    expect(await v.exists("MY_SECRET")).toBe(true);
    expect(await v.exists("MISSING")).toBe(false);
  });

  it("listPlaceholders returns keys", async () => {
    const v = new TestVault();
    expect(await v.listPlaceholders()).toEqual(["MY_SECRET"]);
  });

  it("is instanceof VaultProvider and Provider", () => {
    const v = new TestVault();
    expect(v).toBeInstanceOf(VaultProvider);
    expect(v).toBeInstanceOf(Provider);
  });
});

describe("IdentityProvider", () => {
  it("authenticate returns anonymous by default", async () => {
    const i = new TestIdentity();
    const ctx = await i.authenticate("any-token");
    expect(ctx?.userId).toBe("anonymous");
    expect(ctx?.roles).toEqual([]);
  });

  it("authorize returns true by default", async () => {
    const i = new TestIdentity();
    const ctx = await i.authenticate("token");
    expect(await i.authorize(ctx!, "any-permission")).toBe(true);
  });
});

describe("RuntimeProvider", () => {
  it("invoke yields events", async () => {
    const r = new TestRuntime();
    const events: AgentEvent[] = [];
    for await (const event of r.invoke({
      agentId: "a1",
      taskId: "t1",
      prompt: "test",
      systemPrompt: "sys",
      cwd: "/tmp",
      mcpServer: null,
    })) {
      events.push(event);
    }
    expect(events).toHaveLength(2);
    expect(events[0]!.type).toBe("message");
    expect(events[1]!.type).toBe("result");
  });

  it("is instanceof RuntimeProvider and Provider", () => {
    const r = new TestRuntime();
    expect(r).toBeInstanceOf(RuntimeProvider);
    expect(r).toBeInstanceOf(Provider);
  });
});
