import { describe, it, expect } from "vitest";
import { ServiceContainer } from "./service-container.js";
import { StorageProvider, VaultProvider, IdentityProvider } from "@generic-corp/sdk";

class TestStorage extends StorageProvider {
  readonly providerId = "test-storage";
  readonly providerName = "Test Storage";
  initCalled = false;
  disposeCalled = false;
  override async initialize() { this.initCalled = true; }
  override async dispose() { this.disposeCalled = true; }
}

class AltStorage extends StorageProvider {
  readonly providerId = "alt-storage";
  readonly providerName = "Alt Storage";
}

class TestVault extends VaultProvider {
  readonly providerId = "test-vault";
  readonly providerName = "Test Vault";
  override async resolve() { return "secret"; }
}

class TestIdentity extends IdentityProvider {
  readonly providerId = "test-identity";
  readonly providerName = "Test Identity";
}

describe("ServiceContainer", () => {
  it("registers and retrieves providers", () => {
    const sc = new ServiceContainer();
    const storage = new TestStorage();
    sc.register("storage", storage);
    expect(sc.has("storage")).toBe(true);
    expect(sc.get("storage")).toBe(storage);
  });

  it("returns undefined for unregistered type", () => {
    const sc = new ServiceContainer();
    expect(sc.get("storage")).toBeUndefined();
    expect(sc.has("storage")).toBe(false);
  });

  it("first registered becomes primary by default", () => {
    const sc = new ServiceContainer();
    const s1 = new TestStorage();
    const s2 = new AltStorage();
    sc.register("storage", s1);
    sc.register("storage", s2);
    expect(sc.get("storage")).toBe(s1);
  });

  it("explicit primary overrides first", () => {
    const sc = new ServiceContainer();
    const s1 = new TestStorage();
    const s2 = new AltStorage();
    sc.register("storage", s1);
    sc.register("storage", s2, true);
    expect(sc.get("storage")).toBe(s2);
  });

  it("getAll returns all providers of a type", () => {
    const sc = new ServiceContainer();
    sc.register("storage", new TestStorage());
    sc.register("storage", new AltStorage());
    expect(sc.getAll("storage")).toHaveLength(2);
  });

  it("initializeAll calls initialize on all providers", async () => {
    const sc = new ServiceContainer();
    const s = new TestStorage();
    sc.register("storage", s);
    await sc.initializeAll();
    expect(s.initCalled).toBe(true);
  });

  it("disposeAll calls dispose on all providers", async () => {
    const sc = new ServiceContainer();
    const s = new TestStorage();
    sc.register("storage", s);
    await sc.disposeAll();
    expect(s.disposeCalled).toBe(true);
  });

  it("supports different provider types", () => {
    const sc = new ServiceContainer();
    sc.register("storage", new TestStorage());
    sc.register("vault", new TestVault());
    sc.register("identity", new TestIdentity());
    expect(sc.has("storage")).toBe(true);
    expect(sc.has("vault")).toBe(true);
    expect(sc.has("identity")).toBe(true);
  });
});
