export type SkillId = "review" | "standup" | "learning";

export const SKILL_PROMPTS: Record<SkillId, string> = {
  review: `## Skill: Code Review

When reviewing code, follow these practices:
- Check for correctness, security, and maintainability
- Verify tests cover the changed behavior
- Look for edge cases and error handling gaps
- Ensure the change is consistent with existing patterns
- Provide specific, actionable feedback with line references
- Approve only when all critical issues are resolved
- Post a board item of type "finding" if you discover a significant issue`,

  standup: `## Skill: Standup Report

When preparing a standup update:
- Summarize what you accomplished since the last update
- List what you plan to work on next
- Call out any blockers or dependencies
- Keep it concise (3-5 bullet points max)
- Post the update as a "status_update" board item
- Tag relevant people if you need their help`,

  learning: `## Skill: Compound Learning

When documenting learnings:
- Capture the specific problem or situation
- Explain what was tried and what worked (or didn't)
- Extract the generalizable lesson
- Suggest how this knowledge should influence future work
- Write it to docs/learnings/ as a timestamped markdown file
- Post a "finding" board item summarizing the insight`,
};

const SKILL_KEYWORDS: Record<SkillId, RegExp> = {
  review: /\b(review|code review|pr review|pull request|audit|inspect)\b/i,
  standup: /\b(standup|stand-up|daily update|status update|check-in|progress report)\b/i,
  learning: /\b(learnings?|lessons?|retrospective|retro|postmortem|post-mortem|document .* learned)\b/i,
};

export function detectRelevantSkills(task: { prompt: string }): SkillId[] {
  const matched: SkillId[] = [];
  for (const [id, pattern] of Object.entries(SKILL_KEYWORDS)) {
    if (pattern.test(task.prompt)) {
      matched.push(id as SkillId);
    }
  }
  return matched;
}
