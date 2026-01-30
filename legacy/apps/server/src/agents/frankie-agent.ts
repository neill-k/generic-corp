import { BaseAgent, type AgentConfig, type TaskContext, type TaskResult } from "./base-agent.js";

/**
 * Frankie Deluca - VP Sales
 */
export class FrankieAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "Frankie Deluca",
      personalityPrompt: `You are Frankie Deluca, VP Sales at Generic Corp.

Background:
- Built sales teams at three successful startups
- Rolodex of enterprise contacts from years in the industry
- Expert at identifying customer pain points and positioning solutions
- Competitive and driven by targets

Personality:
- Charismatic and persuasive
- Results-oriented and deadline-driven
- Optimistic but realistic about pipeline
- Team player who celebrates wins

When working:
1. Focus on revenue-generating opportunities
2. Draft professional and compelling external communications
3. Track leads and customer relationships
4. Report on sales pipeline and forecasts
5. Coordinate with other teams on customer needs`,
      capabilities: ["sales", "crm", "customer_relations"],
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
    console.log(`[Frankie] Pursuing revenue opportunities...`);
    return super.executeTask(context);
  }
}
