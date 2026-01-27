import { describe, expect, it, vi } from "vitest";

describe("agent classes", () => {
  it("delegates executeTask to BaseAgent implementation", async () => {
    const { BaseAgent } = await import("../../agents/base-agent.js");
    const baseSpy = vi
      .spyOn(BaseAgent.prototype, "executeTask")
      .mockResolvedValue({
        success: true,
        output: "ok",
        tokensUsed: { input: 0, output: 0 },
        costUsd: 0,
        toolsUsed: [],
      } as any);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { FrankieAgent } = await import("../../agents/frankie-agent.js");
    const { GrayAgent } = await import("../../agents/gray-agent.js");
    const { HelenAgent } = await import("../../agents/helen-agent.js");
    const { KenjiAgent } = await import("../../agents/kenji-agent.js");
    const { MirandaAgent } = await import("../../agents/miranda-agent.js");
    const { WalterAgent } = await import("../../agents/walter-agent.js");
    const { YukiAgent } = await import("../../agents/yuki-agent.js");

    const agents = [
      new FrankieAgent(),
      new GrayAgent(),
      new HelenAgent(),
      new KenjiAgent(),
      new MirandaAgent(),
      new WalterAgent(),
      new YukiAgent(),
    ];

    const context = {
      taskId: "t1",
      agentId: "a1",
      title: "Do thing",
      description: "desc",
      priority: "normal",
    };

    for (const agent of agents) {
      const result = await agent.executeTask(context as any);
      expect(result.success).toBe(true);
    }

    expect(baseSpy).toHaveBeenCalledTimes(agents.length);
    logSpy.mockRestore();
  });
});
