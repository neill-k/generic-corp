import { describe, expect, it } from "vitest";

describe("tool-executor descriptions", () => {
  it("renders tool descriptions", async () => {
    const { getToolDescriptions } = await import("../../services/tool-executor.js");
    const { getAllTools } = await import("../../services/tools/index.js");
    const text = getToolDescriptions(getAllTools());

    expect(text).toContain("filesystem_read");
    expect(text).toContain("Example usage");
  });
});
