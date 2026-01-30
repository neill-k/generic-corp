import { describe, expect, it, vi } from "vitest";

const listenSpy = vi.fn((_port: any, cb?: any) => cb?.());

vi.mock("http", () => ({
  createServer: vi.fn((_app: any) => ({
    listen: listenSpy,
  })),
}));

vi.mock("../../websocket/index.js", () => ({
  setupWebSocket: vi.fn(() => ({}) ),
}));

vi.mock("../../api/index.js", () => ({
  setupRoutes: vi.fn(),
}));

const initEncryption = vi.fn(() => undefined);
vi.mock("../../services/encryption.js", () => ({
  initEncryption,
}));

vi.mock("../../db/seed.js", () => ({
  seedAgents: vi.fn(async () => undefined),
}));

vi.mock("../../agents/index.js", () => ({
  initializeAgents: vi.fn(async () => undefined),
}));

vi.mock("../../queues/index.js", () => ({
  initializeQueues: vi.fn(async () => undefined),
}));

describe("server start", () => {
  it("starts listening and initializes subsystems", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    process.env.PORT = "4321";

    const mod = await import("../../index.js");
    await mod.start();

    expect(listenSpy).toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
    delete process.env.PORT;
  });

  it("warns when encryption init fails", async () => {
    initEncryption.mockImplementationOnce(() => {
      throw new Error("nope");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const mod = await import("../../index.js");
    await mod.start();

    expect(warn).toHaveBeenCalled();
  });

  it("exits process on fatal start error", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => undefined) as any);

    const { initializeQueues } = await import("../../queues/index.js");
    (initializeQueues as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("boom"));

    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const mod = await import("../../index.js");
    await mod.start();

    expect(err).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
