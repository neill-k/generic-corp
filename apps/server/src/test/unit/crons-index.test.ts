import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../services/CronManager.js", () => ({
  getCronManager: vi.fn(() => ({
    register: vi.fn(async () => {}),
    getStatus: vi.fn(() => [{ name: "x", pattern: "* * * * *", enabled: true, runCount: 0 }]),
  })),
  shutdownCronManager: vi.fn(async () => {}),
}));

vi.mock("../../crons/ceo.js", () => ({ ceoCronJobs: [{ name: "ceo:job", pattern: "* * * * *", handler: vi.fn(async () => {}) }] }));
vi.mock("../../crons/workers.js", () => ({ workerCronJobs: [{ name: "workers:job", pattern: "* * * * *", handler: vi.fn(async () => {}) }] }));
vi.mock("../../crons/system.js", () => ({ systemCronJobs: [{ name: "system:job", pattern: "* * * * *", handler: vi.fn(async () => {}) }] }));

describe("crons index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes and registers all cron jobs", async () => {
    const { initializeCronJobs } = await import("../../crons/index.js");
    const { getCronManager } = await import("../../services/CronManager.js");

    await initializeCronJobs({} as any);
    const cm = (getCronManager as any).mock.results[0].value;
    expect(cm.register).toHaveBeenCalledTimes(3);
  });

  it("returns empty status if cron manager not initialized", async () => {
    const { getCronJobStatus } = await import("../../crons/index.js");
    const { getCronManager } = await import("../../services/CronManager.js");
    (getCronManager as any).mockImplementationOnce(() => {
      throw new Error("no redis");
    });

    expect(getCronJobStatus()).toEqual([]);
  });

  it("shuts down cron jobs", async () => {
    const { shutdownCronJobs } = await import("../../crons/index.js");
    const { shutdownCronManager } = await import("../../services/CronManager.js");

    await shutdownCronJobs();
    expect(shutdownCronManager).toHaveBeenCalled();
  });
});
