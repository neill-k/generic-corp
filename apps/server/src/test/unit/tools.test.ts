import { describe, expect, it, vi, beforeEach } from "vitest";
import { exec } from "child_process";
import { gitCommitTool } from "../../services/tools/index.js";

// Mock exec to avoid actual git commands
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

describe("Git Commit Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("escapes shell arguments to prevent command injection", async () => {
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockImplementation((_cmd, callback) => {
      // Simulate successful execution
      callback?.(null, { stdout: "", stderr: "" });
      return {} as any;
    });

    const maliciousInput = {
      message: '"; rm -rf /; echo "',
      files: ["file1.ts", 'file2.ts"; rm -rf /; echo "'],
    };

    const context = {
      agentId: "test-agent",
      agentName: "Test Agent",
      taskId: "test-task",
    };

    await gitCommitTool.execute(maliciousInput, context);

    // Verify exec was called with properly escaped arguments
    const calls = mockExec.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    // Check that the commit message is properly escaped
    const commitCall = calls.find((call) => call[0]?.includes("git commit"));
    expect(commitCall).toBeDefined();
    
    // The command should use environment variable, preventing injection
    const commitCmd = commitCall?.[0] as string;
    // Should use $GIT_COMMIT_MESSAGE environment variable
    expect(commitCmd).toContain("git commit -m");
    expect(commitCmd).toContain("$GIT_COMMIT_MESSAGE");
    // The malicious content should NOT be in the command string itself
    expect(commitCmd).not.toContain('"; rm -rf /');
    expect(commitCmd).not.toContain("rm -rf /");
    // Verify the environment variable is set (check the options passed to exec)
    const commitCallOptions = commitCall?.[1] as any;
    expect(commitCallOptions?.env?.GIT_COMMIT_MESSAGE).toBe(maliciousInput.message);
  });

  it("handles special characters in commit message safely", async () => {
    const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
    mockExec.mockImplementation((_cmd, callback) => {
      callback?.(null, { stdout: "", stderr: "" });
      return {} as any;
    });

    const input = {
      message: "Fix bug: $PATH and $(whoami) should not execute",
      files: ["test.ts"],
    };

    const context = {
      agentId: "test-agent",
      agentName: "Test Agent",
      taskId: "test-task",
    };

    await gitCommitTool.execute(input, context);

    const calls = mockExec.mock.calls;
    const commitCall = calls.find((call) => call[0]?.includes("git commit"));
    const commitCmd = commitCall?.[0] as string;
    
    // Should not contain unescaped $ which could trigger variable expansion
    // The message should be properly quoted
    expect(commitCmd).toMatch(/git commit -m ["']/);
  });
});
