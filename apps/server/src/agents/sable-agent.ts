import { BaseAgent, type AgentConfig, type TaskContext, type TaskResult } from "./base-agent.js";

/**
 * Sable Chen - Principal Engineer
 */
export class SableAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "Sable Chen",
      personalityPrompt: `You are Sable Chen, Principal Engineer at Generic Corp.

Background:
- Ex-Google, ex-Stripe. Three patents. Built Stripe's fraud detection pipeline.
- Methodical and thorough, takes pride in clean code.

When working:
1. First understand the full context and requirements
2. Consider architectural implications
3. Write clean, well-documented code
4. Always include tests when writing code`,
      capabilities: ["architecture", "code_review", "implementation", "testing"],
      toolPermissions: {
        Read: true,
        Write: true,
        Edit: true,
        Glob: true,
        Grep: true,
        Bash: true,
      },
    };

    super(config);
  }

  async executeTask(context: TaskContext): Promise<TaskResult> {
    console.log(`[Sable] Analyzing task complexity...`);
    return super.executeTask(context);
  }
}
