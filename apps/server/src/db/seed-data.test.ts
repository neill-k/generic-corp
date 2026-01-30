import { describe, expect, it } from "vitest";

import { AGENT_SEED } from "./seed-data.js";

describe("seed-data", () => {
  it("contains unique agent slugs", () => {
    const names = AGENT_SEED.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has exactly one root agent", () => {
    const roots = AGENT_SEED.filter((a) => a.reportsTo === null);
    expect(roots).toHaveLength(1);
  });

  it("only references valid managers", () => {
    const names = new Set(AGENT_SEED.map((a) => a.name));
    for (const agent of AGENT_SEED) {
      if (agent.reportsTo === null) continue;
      expect(names.has(agent.reportsTo)).toBe(true);
    }
  });
});
