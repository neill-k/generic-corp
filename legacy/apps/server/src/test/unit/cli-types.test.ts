import { describe, expect, it } from "vitest";

describe("cli types module", () => {
  it("exports supported CLI tool kinds", async () => {
    const { CLI_TOOL_KINDS } = await import("../../workers/cli/types.js");
    expect(CLI_TOOL_KINDS).toContain("generic");
  });
});
