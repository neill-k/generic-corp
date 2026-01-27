import { describe, expect, it, vi, beforeEach } from "vitest";

const executeAgentTaskMock = vi.fn();
const updateTaskStatusMock = vi.fn(async () => undefined);
const updateAgentStatusMock = vi.fn(async () => undefined);
const emitTaskProgressMock = vi.fn(async () => undefined);
const emitTaskCompletedMock = vi.fn(async () => undefined);
const getUnreadMessagesMock = vi.fn(async () => []);
const hasUnreadMessagesMock = vi.fn(async () => false);
const createTaskMock = vi.fn(async () => "t1");
const logActivityMock = vi.fn(async () => undefined);

let cancelHandler: (() => void) | undefined;
let newMessageHandler: ((msg: any) => void) | undefined;
let statusQueryHandler: (() => any) | undefined;

const continueAsNewMock = vi.fn(async () => undefined);

vi.mock("@temporalio/workflow", () => ({
  proxyActivities: () => ({
    executeAgentTask: (...args: any[]) => executeAgentTaskMock(...args),
    updateTaskStatus: (...args: any[]) => updateTaskStatusMock(...args),
    updateAgentStatus: (...args: any[]) => updateAgentStatusMock(...args),
    emitTaskProgress: (...args: any[]) => emitTaskProgressMock(...args),
    emitTaskCompleted: (...args: any[]) => emitTaskCompletedMock(...args),
    getUnreadMessages: (...args: any[]) => getUnreadMessagesMock(...args),
    hasUnreadMessages: (...args: any[]) => hasUnreadMessagesMock(...args),
    createTask: (...args: any[]) => createTaskMock(...args),
    logActivity: (...args: any[]) => logActivityMock(...args),
  }),
  defineSignal: (name: string) => ({ __type: "signal", name }),
  defineQuery: (name: string) => ({ __type: "query", name }),
  setHandler: (signalOrQuery: any, handler: any) => {
    if (signalOrQuery?.__type === "signal" && signalOrQuery.name === "cancelTask") {
      cancelHandler = handler;
    }
    if (signalOrQuery?.__type === "signal" && signalOrQuery.name === "newMessage") {
      newMessageHandler = handler;
      // Seed an initial message so the workflow processes the signal path.
      handler({ messageId: "m1", fromAgentName: "Alice", subject: "Hello" });
    }
    if (signalOrQuery?.__type === "query" && signalOrQuery.name === "getStatus") {
      statusQueryHandler = handler;
    }
  },
  condition: async (predicate: () => boolean, _timeout?: any) => predicate(),
  continueAsNew: (...args: any[]) => continueAsNewMock(...args),
}));

describe("Temporal workflows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cancelHandler = undefined;
    newMessageHandler = undefined;
    statusQueryHandler = undefined;
  });

  it("agentTaskWorkflow executes activities and returns success", async () => {
    executeAgentTaskMock.mockResolvedValueOnce({ success: true, output: "done" });

    const { agentTaskWorkflow } = await import("../../temporal/workflows/agentWorkflows.js");
    const result = await agentTaskWorkflow({
      taskId: "t1",
      agentId: "a1",
      agentName: "Agent",
      title: "Title",
      description: "Desc",
      priority: "normal",
    });

    expect(result).toEqual({ success: true, output: "done", error: undefined });
    expect(updateTaskStatusMock).toHaveBeenCalledWith("t1", "in_progress");
    expect(updateAgentStatusMock).toHaveBeenCalledWith("a1", "working", "t1");
    expect(emitTaskProgressMock).toHaveBeenCalled();
    expect(emitTaskCompletedMock).toHaveBeenCalled();
  });

  it("agentTaskWorkflow returns cancelled when cancelTask signal fires", async () => {
    updateTaskStatusMock.mockImplementationOnce(async (_taskId: string, status: string) => {
      if (status === "in_progress") cancelHandler?.();
    });

    const { agentTaskWorkflow } = await import("../../temporal/workflows/agentWorkflows.js");
    const result = await agentTaskWorkflow({
      taskId: "t2",
      agentId: "a1",
      agentName: "Agent",
      title: "Title",
      description: "Desc",
      priority: "normal",
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/cancel/i);
    expect(executeAgentTaskMock).not.toHaveBeenCalled();
    expect(updateTaskStatusMock).toHaveBeenCalledWith("t2", "failed", { error: "Cancelled" });
  });

  it("agentTaskWorkflow catches errors from executeAgentTask", async () => {
    executeAgentTaskMock.mockRejectedValueOnce(new Error("boom"));

    const { agentTaskWorkflow } = await import("../../temporal/workflows/agentWorkflows.js");
    const result = await agentTaskWorkflow({
      taskId: "t3",
      agentId: "a1",
      agentName: "Agent",
      title: "Title",
      description: "Desc",
      priority: "normal",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("boom");
    expect(updateTaskStatusMock).toHaveBeenCalledWith("t3", "failed", { error: "boom" });
    expect(updateAgentStatusMock).toHaveBeenCalledWith("a1", "idle", null);
  });

  it("agentLifecycleWorkflow creates inbox tasks and continues as new", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    createTaskMock
      .mockResolvedValueOnce("task-1")
      .mockResolvedValueOnce("task-2");

    hasUnreadMessagesMock
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);

    getUnreadMessagesMock.mockResolvedValueOnce([
      { id: "m2", fromAgentName: "Bob", subject: "Ping" },
    ]);

    const { agentLifecycleWorkflow } = await import("../../temporal/workflows/agentWorkflows.js");
    await agentLifecycleWorkflow({ agentId: "a1", agentName: "Agent" });

    expect(newMessageHandler).toBeTypeOf("function");
    expect(createTaskMock).toHaveBeenCalledTimes(2);
    expect(logActivityMock).toHaveBeenCalled();
    expect(continueAsNewMock).toHaveBeenCalledWith({ agentId: "a1", agentName: "Agent" });

    const status = statusQueryHandler?.();
    expect(status).toEqual(
      expect.objectContaining({
        status: "idle",
        messagesProcessed: 2,
      })
    );

    logSpy.mockRestore();
  });
});
