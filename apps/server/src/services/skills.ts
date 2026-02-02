// Re-export from core — skills are now in @generic-corp/core
export {
  SKILL_PROMPTS,
  ALL_SKILL_IDS,
  getAllSkillPrompts,
  registerSkill,
  unregisterSkill,
  getRegisteredSkillIds,
} from "@generic-corp/core";
export type { SkillId } from "@generic-corp/core";
