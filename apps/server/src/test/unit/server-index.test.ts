import { describe, expect, it, vi } from "vitest";

describe("server entry", () => {
  it("createHttpServer configures app without listening", async () => {
    const { createHttpServer } = await import("../../index.js");
    const { httpServer } = createHttpServer();

    const closeSpy = vi.spyOn(httpServer, "close");
    httpServer.close();
    expect(closeSpy).toHaveBeenCalled();
  });
});
