import { describe, expect, it, vi } from "vitest";

const connectMock = vi.fn(async (_args: any) => ({ connection: true }));
const workerRunMock = vi.fn(async () => undefined);
const workerCreateMock = vi.fn(async (_args: any) => ({ run: workerRunMock }));

vi.mock("@temporalio/worker", () => ({
  NativeConnection: { connect: (args: any) => connectMock(args) },
  Worker: { create: (args: any) => workerCreateMock(args) },
}));

describe("Temporal agent worker", () => {
  it("connects and starts worker", async () => {
    process.env.TEMPORAL_ADDRESS = "example:7233";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { runWorker } = await import("../../temporal/workers/agentWorker.js");
    await runWorker();

    expect(connectMock).toHaveBeenCalledWith({ address: "example:7233" });
    expect(workerCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: "default",
        taskQueue: "agent-tasks",
        activities: expect.any(Object),
      })
    );
    expect(workerRunMock).toHaveBeenCalled();

    logSpy.mockRestore();
  });
});
