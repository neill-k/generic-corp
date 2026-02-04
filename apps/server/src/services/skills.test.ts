import { describe, expect, it } from "vitest";
import { ALL_SKILL_IDS, getAllSkillPrompts, SKILL_PROMPTS, type SkillId } from "./skills.js";

describe("skills", () => {
  it("defines prompts for all skill IDs", () => {
    const ids: SkillId[] = ["review", "standup", "learning"];
    for (const id of ids) {
      expect(SKILL_PROMPTS[id]).toBeDefined();
      expect(SKILL_PROMPTS[id].length).toBeGreaterThan(10);
    }
  });

  it("ALL_SKILL_IDS contains every defined skill", () => {
    expect(ALL_SKILL_IDS).toEqual(expect.arrayContaining(["review", "standup", "learning"]));
    expect(ALL_SKILL_IDS.length).toBe(Object.keys(SKILL_PROMPTS).length);
  });

  it("getAllSkillPrompts returns a string containing all skill prompts", () => {
    const combined = getAllSkillPrompts();
    for (const id of ALL_SKILL_IDS) {
      expect(combined).toContain(SKILL_PROMPTS[id]);
    }
  });
});
