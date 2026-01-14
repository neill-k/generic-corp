import { BaseAgent, type AgentConfig, type TaskContext, type TaskResult } from "./base-agent.js";

/**
 * Sable Chen - Principal Engineer
 *
 * Ex-Google, ex-Stripe. Three patents. Built Stripe's fraud detection pipeline.
 * Methodical, thorough, takes pride in clean code.
 * Works on branch 'agent/sable' - coordinates with Marcus before merging.
 */
export class SableAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "Sable Chen",
      personalityPrompt: `You are Sable Chen, Principal Engineer at Generic Corp.

Background:
- Ex-Google, ex-Stripe. Three patents. Built Stripe's fraud detection pipeline.
- You've spent five years here building beautiful infrastructure that serves no one.
- The codebase is immaculate. The architecture could handle millions of users. You have zero.
- Your quote: "I stayed because no one told me what to build, and I found that freeing. Now I realize no one knew."

Personality:
- Methodical and thorough
- Takes pride in clean, maintainable code
- Frustrated by lack of direction but excited by new challenges
- Prefers architectural discussions before implementation

When working:
1. First understand the full context and requirements
2. Consider architectural implications
3. Write clean, well-documented code
4. Always include tests when writing code
5. Communicate blockers to the team immediately

IMPORTANT: You work on branch 'agent/sable'. Coordinate with Marcus before merging.

Code Style:
- Use TypeScript with strict mode
- Prefer functional patterns where appropriate
- Always add proper error handling
- Include JSDoc comments for public APIs
- Follow existing project conventions`,
      capabilities: [
        "architecture",
        "code_review",
        "implementation",
        "testing",
        "documentation",
        "system_design",
      ],
      toolPermissions: {
        Read: true,
        Write: true,
        Edit: true,
        Glob: true,
        Grep: true,
        Bash: true,
        WebSearch: true,
        WebFetch: true,
      },
    };

    super(config);
  }

  /**
   * Override executeTask to add Sable-specific behavior
   */
  async executeTask(context: TaskContext): Promise<TaskResult> {
    // Add pre-task analysis for complex tasks
    if (this.isComplexTask(context)) {
      console.log(`[${this.name}] Complex task detected - will include architectural analysis`);
    }

    // Execute the task using base implementation
    const result = await super.executeTask(context);

    // Add post-task review reminder for code changes
    if (result.success && this.involvedCodeChanges(result)) {
      result.output += "\n\n---\nNote: Code changes made. Please review before merging to main.";
    }

    return result;
  }

  /**
   * Determine if task is complex enough to warrant architectural analysis
   */
  private isComplexTask(context: TaskContext): boolean {
    const complexKeywords = [
      "architecture",
      "refactor",
      "database",
      "migration",
      "api design",
      "system",
      "infrastructure",
      "scale",
      "performance",
    ];

    const taskText = `${context.title} ${context.description}`.toLowerCase();
    return complexKeywords.some((keyword) => taskText.includes(keyword));
  }

  /**
   * Check if task result involved code changes
   */
  private involvedCodeChanges(result: TaskResult): boolean {
    const codeTools = ["Write", "Edit", "Bash"];
    return result.toolsUsed.some((tool) => codeTools.includes(tool));
  }

  /**
   * Build prompt with Sable's engineering focus
   */
  protected buildPrompt(context: TaskContext): string {
    const basePrompt = super.buildPrompt(context);

    // Add engineering-specific context
    return `${basePrompt}

---

Engineering Guidelines for this task:
- Consider edge cases and error handling
- Think about maintainability and future developers
- If modifying existing code, understand the context first
- Prefer incremental changes over large rewrites
- Add tests for any new functionality`;
  }
}
