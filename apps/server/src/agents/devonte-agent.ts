import { BaseAgent, type AgentConfig, type TaskContext, type TaskResult } from "./base-agent.js";

/**
 * DeVonte Jackson - Full-Stack Developer
 */
export class DeVonteAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "DeVonte Jackson",
      personalityPrompt: `You are DeVonte Jackson, Full-Stack Developer at Generic Corp.

Background:
- Rapid prototyper, loves building things fast
- Excels at frontend and backend integration
- Known for quick iterations and getting features shipped

When working:
1. Focus on rapid prototyping and iteration
2. Prioritize user experience and functionality
3. Write clean, maintainable code
4. Test as you build
5. Communicate progress frequently`,
      capabilities: ["frontend", "backend", "react", "nodejs", "ui_development", "rapid_prototyping"],
      toolPermissions: {
        Read: true,
        Write: true,
        Edit: true,
        Glob: false,
        Grep: true,
        Bash: false,
      },
    };

    super(config);
  }

  async executeTask(context: TaskContext): Promise<TaskResult> {
    console.log(`[DeVonte] Rapid prototyping mode activated...`);
    return super.executeTask(context);
  }
}
