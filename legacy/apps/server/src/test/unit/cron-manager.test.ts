import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("bullmq", () => {
  class Queue {
    add = vi.fn(async () => ({}));
    removeRepeatable = vi.fn(async () => ({}));
    close = vi.fn(async () => ({}));
    constructor(_name: string, _opts: any) {}
  }

  class Worker {
    private handlers: Record<string, Function[]> = {};
    on = vi.fn((event: string, cb: Function) => {
      this.handlers[event] = this.handlers[event] || [];
      this.handlers[event].push(cb);
      return this;
    });
    close = vi.fn(async () => ({}));
    constructor(_name: string, _processor: any, _opts: any) {}
  }

  class Job {}

  return { Queue, Worker, Job };
});

describe("CronManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers, pauses, resumes, triggers, and executes jobs", async () => {
    const { CronManager } = await import("../../services/CronManager.js");
    const { EventBus } = await import("../../services/event-bus.js");

    const emitSpy = vi.spyOn(EventBus, "emit");

    const redis = {} as any;
    const cm = new CronManager(redis);
    const handler = vi.fn(async () => {});

    await cm.register({ name: "job1", pattern: "* * * * *", handler });
    await cm.pause("job1");
    await cm.resume("job1");
    await cm.trigger("job1");

    await (cm as any).executeJob({ name: "job1", data: { cronName: "job1" } });
    expect(handler).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalled();

    const status = cm.getJobStatus("job1");
    expect(status?.runCount).toBe(1);

    await cm.unregister("job1");
    await cm.shutdown();
  });

  it("executeJob no-ops when no handler exists", async () => {
    const { CronManager } = await import("../../services/CronManager.js");
    const redis = {} as any;
    const cm = new CronManager(redis);

    await (cm as any).executeJob({ name: "missing", data: { cronName: "missing" } });
    await cm.shutdown();
  });
});
