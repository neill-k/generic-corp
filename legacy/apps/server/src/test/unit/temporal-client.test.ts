import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@temporalio/client", () => {
  const connect = vi.fn(async () => ({}));
  class Connection {
    static connect = connect;
  }

  class Client {
    workflow: any;
    constructor(_opts: any) {
      this.workflow = {
        start: vi.fn(async (_wf: any, opts: any) => ({ workflowId: opts.workflowId })),
        getHandle: vi.fn((_id: string) => ({
          describe: vi.fn(async () => ({ status: { name: "RUNNING" } })),
          signal: vi.fn(async () => {}),
        })),
      };
    }
  }

  return { Client, Connection };
});

vi.mock("../../db/index.js", () => ({
  db: {
    agent: {
      findMany: vi.fn(async () => [
        { id: "a1", name: "A" },
        { id: "a2", name: "B" },
      ]),
    },
  },
}));

describe("temporal client wrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TEMPORAL_ADDRESS;
  });

  it("connects once and starts workflows", async () => {
    const temporal = await import("../../temporal/client.js");
    await temporal.getTemporalClient();
    await temporal.getTemporalClient();

    const taskId = await temporal.startAgentTaskWorkflow({
      taskId: "t1",
      agentId: "a1",
      agentName: "Agent",
      title: "Title",
      description: "Desc",
      priority: "high",
    });

    expect(taskId).toBe("task-t1");
  });

  it("startAgentLifecycleWorkflow returns existing running workflow", async () => {
    const temporal = await import("../../temporal/client.js");
    const workflowId = await temporal.startAgentLifecycleWorkflow({ agentId: "a1", agentName: "Agent" });
    expect(workflowId).toBe("agent-lifecycle-a1");
  });

  it("signalNewMessage swallows errors", async () => {
    const temporal = await import("../../temporal/client.js");
    const client = await temporal.getTemporalClient();
    (client.workflow.getHandle as any).mockReturnValueOnce({
      signal: vi.fn(async () => {
        throw new Error("boom");
      }),
    });

    await temporal.signalNewMessage("a1", { messageId: "m1", fromAgentName: "X", subject: "S" });
  });

  it("initializeAgentLifecycles starts workflows for agents", async () => {
    const temporal = await import("../../temporal/client.js");
    const client = await temporal.getTemporalClient();
    const getHandleSpy = client.workflow.getHandle as unknown as ReturnType<typeof vi.fn>;

    await temporal.initializeAgentLifecycles();
    expect(getHandleSpy).toHaveBeenCalledWith("agent-lifecycle-a1");
    expect(getHandleSpy).toHaveBeenCalledWith("agent-lifecycle-a2");
  });
});
