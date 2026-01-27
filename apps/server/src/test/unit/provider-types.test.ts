import { describe, expect, it } from "vitest";

describe("providers/types", () => {
  it("exports TOKEN_USAGE_KEYS", async () => {
    const mod = await import("../../providers/types.js");
    expect(mod.TOKEN_USAGE_KEYS).toEqual(["input", "output", "total"]);
  });
});
