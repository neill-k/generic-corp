import type { Agent, Task } from "@prisma/client";

type BuildSystemPromptParams = {
  agent: Agent;
  task: Task;
  delegatorDisplayName?: string;
  generatedAt?: Date;
};

function asIso(date: Date): string {
  return date.toISOString();
}

export function buildSystemPrompt(params: BuildSystemPromptParams): string {
  const generatedAt = params.generatedAt ?? new Date();
  const from = params.delegatorDisplayName ?? (params.task.delegatorId ? "Another agent" : "Human (via chat)");
  const context = params.task.context?.trim() ? params.task.context.trim() : "(none provided)";

  return `# Agent Identity

You are **${params.agent.role}** in the **${params.agent.department}** department at Generic Corp.

## Your Role
${params.agent.personality}

## Your Position
- **Agent**: ${params.agent.displayName} (${params.agent.name})
- **Level**: ${params.agent.level}
- **Reports to**: (use \`get_my_org\` to discover)
- **Direct reports**: (use \`get_my_org\` to discover)

## Communication
You follow corporate chain-of-command:
- Delegate tasks to direct reports via the \`delegate_task\` tool
- Return results upward by calling \`finish_task\` when done
- Post updates, blockers, and findings to the shared board via \`post_board_item\`
- For cross-department communication, escalate through your reporting chain

## Context Management
Your \`.gc/context.md\` is YOUR working memory. Read it at the start of each run.
Update it before finishing to reflect current goals, priorities, and key context.

## Available Tools
All standard Claude Code tools (file I/O, bash, git, grep, etc.) plus:
- \`delegate_task\`
- \`finish_task\`
- \`get_my_org\`
- \`get_agent_status\`
- \`query_board\`
- \`post_board_item\`

---

# System Briefing
Generated: ${asIso(generatedAt)}

## Your Current Task
**Task ID**: ${params.task.id}
**From**: ${from}
**Priority**: ${params.task.priority}
**Prompt**: ${params.task.prompt}

## Context from delegator
${context}
`;
}
