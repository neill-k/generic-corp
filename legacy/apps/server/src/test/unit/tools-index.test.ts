import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(async () => "contents"),
    writeFile: vi.fn(async () => undefined),
  },
}));

vi.mock("child_process", () => ({
  exec: vi.fn((
    _cmd: string,
    optionsOrCb?: any,
    maybeCb?: any
  ) => {
    const cb = typeof optionsOrCb === "function" ? optionsOrCb : maybeCb;
    cb?.(null, { stdout: "out", stderr: "" });
    return {} as any;
  }),
}));

vi.mock("../../db/index.js", () => ({
  db: {
    agent: {
      findFirst: vi.fn(async () => ({ id: "a2", name: "Other" })),
    },
  },
}));

vi.mock("../../services/message-service.js", () => ({
  MessageService: {
    send: vi.fn(async () => ({ id: "m1" })),
    getUnread: vi.fn(async () => []),
    createDraft: vi.fn(async () => ({ id: "d1" })),
  },
}));

describe("services/tools index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getToolsForAgent filters based on permissions", async () => {
    const { getToolsForAgent } = await import("../../services/tools/index.js");
    const tools = getToolsForAgent({
      id: "a1",
      name: "Agent",
      status: "idle",
      capabilities: [],
      toolPermissions: { Read: true, Write: false, Bash: true, Glob: false, Grep: false },
    } as any);

    const names = tools.map((t) => t.name);
    expect(names).toContain("filesystem_read");
    expect(names).toContain("bash");
    expect(names).toContain("messaging_send");
    expect(names).toContain("messaging_check_inbox");
    expect(names).toContain("external_draft");
    expect(names).not.toContain("filesystem_write");
    expect(names).not.toContain("glob");
  });

  it("filesystemReadTool returns error when read fails", async () => {
    const { promises: fs } = await import("fs");
    (fs.readFile as any).mockRejectedValueOnce(new Error("nope"));

    const { filesystemReadTool } = await import("../../services/tools/index.js");
    const result = await filesystemReadTool.execute(
      { path: `${process.cwd()}/apps/server/README.md` },
      { agentId: "a1", agentName: "Agent" }
    );

    expect(result.success).toBe(false);
  });

  it("filesystemWriteTool returns error when write fails", async () => {
    const { promises: fs } = await import("fs");
    (fs.writeFile as any).mockRejectedValueOnce(new Error("nope"));

    const { filesystemWriteTool } = await import("../../services/tools/index.js");
    const result = await filesystemWriteTool.execute(
      { path: `${process.cwd()}/apps/server/README.md`, content: "x" },
      { agentId: "a1", agentName: "Agent" }
    );

    expect(result.success).toBe(false);
  });

  it("messagingSendTool returns not found when recipient missing", async () => {
    const { db } = await import("../../db/index.js");
    (db as any).agent.findFirst = vi.fn(async () => null);

    const { messagingSendTool } = await import("../../services/tools/index.js");
    const result = await messagingSendTool.execute(
      { to: "Missing", subject: "s", body: "b" },
      { agentId: "a1", agentName: "Agent" }
    );

    expect(result.success).toBe(false);
    expect(String((result as any).error)).toContain("not found");
  });

  it("bashTool executes allowed command", async () => {
    const { bashTool } = await import("../../services/tools/index.js");
    const result = await bashTool.execute(
      { command: "echo ok" },
      { agentId: "a1", agentName: "Agent" }
    );
    expect(result.success).toBe(true);
    expect((result as any).stdout).toBeDefined();
  });

  it("globTool returns files list", async () => {
    const { globTool } = await import("../../services/tools/index.js");
    const result = await globTool.execute(
      { pattern: "*.ts" },
      { agentId: "a1", agentName: "Agent" }
    );
    expect(result.success).toBe(true);
    expect((result as any).count).toBeDefined();
  });

  it("bashTool blocks dangerous commands", async () => {
    const { bashTool } = await import("../../services/tools/index.js");
    const result = await bashTool.execute(
      { command: "rm -rf /" },
      { agentId: "a1", agentName: "Agent", taskId: "t1" }
    );
    expect(result.success).toBe(false);
  });

  it("grepTool returns empty matches when grep exits 1", async () => {
    const { exec } = await import("child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockImplementationOnce((_cmd: string, optionsOrCb?: any, maybeCb?: any) => {
      const cb = typeof optionsOrCb === "function" ? optionsOrCb : maybeCb;
      const err: any = new Error("no matches");
      err.code = 1;
      cb?.(err, { stdout: "", stderr: "" });
      return {} as any;
    });

    const { grepTool } = await import("../../services/tools/index.js");
    const result = await grepTool.execute(
      { pattern: "x" },
      { agentId: "a1", agentName: "Agent", taskId: "t1" }
    );
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
    expect(result.matches).toEqual([]);
  });

  it("grepTool returns error for unexpected grep error", async () => {
    const { exec } = await import("child_process");
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockImplementationOnce((_cmd: string, optionsOrCb?: any, maybeCb?: any) => {
      const cb = typeof optionsOrCb === "function" ? optionsOrCb : maybeCb;
      const err: any = new Error("boom");
      err.code = 2;
      cb?.(err, { stdout: "", stderr: "bad" });
      return {} as any;
    });

    const { grepTool } = await import("../../services/tools/index.js");
    const result = await grepTool.execute(
      { pattern: "x" },
      { agentId: "a1", agentName: "Agent" }
    );
    expect(result.success).toBe(false);
  });
});
