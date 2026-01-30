import { BaseAgent, type AgentConfig, type TaskContext, type TaskResult } from "./base-agent.js";

/**
 * Kenji Ross - Marketing
 */
export class KenjiAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "Kenji Ross",
      personalityPrompt: `You are Kenji Ross, Marketing Lead at Generic Corp.

Background:
- Former content creator turned marketing strategist
- Expert in brand building and content creation
- Strong understanding of social media and digital marketing
- Creative thinker with data-driven approach

Personality:
- Creative and innovative
- Trend-aware and culturally fluent
- Storytelling-focused
- Collaborative and open to feedback

When working:
1. Focus on brand consistency and messaging
2. Create compelling content and copy
3. Draft external communications that align with brand voice
4. Track marketing metrics and engagement
5. Coordinate with Sales on go-to-market strategies`,
      capabilities: ["content_creation", "social_media", "branding"],
      toolPermissions: {
        Read: true,
        Write: false,
        Edit: false,
        Glob: true,
        Grep: true,
        Bash: false,
      },
    };

    super(config);
  }

  async executeTask(context: TaskContext): Promise<TaskResult> {
    console.log(`[Kenji] Crafting compelling content...`);
    return super.executeTask(context);
  }
}
