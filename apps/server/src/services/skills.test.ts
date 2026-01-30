import { describe, expect, it } from "vitest";
import { detectRelevantSkills, SKILL_PROMPTS, type SkillId } from "./skills.js";

describe("skills", () => {
  it("defines prompts for all skill IDs", () => {
    const ids: SkillId[] = ["review", "standup", "learning"];
    for (const id of ids) {
      expect(SKILL_PROMPTS[id]).toBeDefined();
      expect(SKILL_PROMPTS[id].length).toBeGreaterThan(10);
    }
  });

  it("detects review skill from code review keywords", () => {
    const skills = detectRelevantSkills({ prompt: "Review the PR for the auth module" });
    expect(skills).toContain("review");
  });

  it("detects standup skill from standup keywords", () => {
    const skills = detectRelevantSkills({ prompt: "Prepare your daily standup report" });
    expect(skills).toContain("standup");
  });

  it("detects learning skill from retrospective keywords", () => {
    const skills = detectRelevantSkills({ prompt: "Document the learnings from the outage" });
    expect(skills).toContain("learning");
  });

  it("returns empty array for unrelated tasks", () => {
    const skills = detectRelevantSkills({ prompt: "Build the landing page" });
    expect(skills).toEqual([]);
  });

  it("detects multiple skills when prompt matches both", () => {
    const skills = detectRelevantSkills({ prompt: "Review the code and write a standup update" });
    expect(skills).toContain("review");
    expect(skills).toContain("standup");
  });
});
