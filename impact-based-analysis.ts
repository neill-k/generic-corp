import * as fs from "fs";
import * as path from "path";

interface Message {
  id: string;
  fromAgentName: string;
  toAgentName: string;
  subject: string;
  body: string;
  type: string;
  status: string;
  createdAt: string;
  category: string;
  summary: string;
}

interface ImpactAnalysis extends Message {
  impactLevel: "high" | "medium" | "low" | "wasted";
  impactType:
    | "unblocked_execution"
    | "decision_made"
    | "coordination"
    | "status_check"
    | "feedback_loop"
    | "redundant"
    | "confusion"
    | "unclear_request";
  outcome: string;
  movedWork: boolean;
  clarityScore: number; // 1-10, how clear was the ask/response
}

function analyzeMessageImpact(msg: Message): ImpactAnalysis {
  const body = msg.body.toLowerCase();
  const subject = msg.subject.toLowerCase();
  const combined = body + " " + subject;

  let impactLevel: "high" | "medium" | "low" | "wasted" = "low";
  let impactType:
    | "unblocked_execution"
    | "decision_made"
    | "coordination"
    | "status_check"
    | "feedback_loop"
    | "redundant"
    | "confusion"
    | "unclear_request" = "status_check";
  let outcome = "";
  let movedWork = false;
  let clarityScore = 5;

  // HIGH IMPACT: Unblocking execution
  if (
    combined.includes("approved") ||
    combined.includes("green light") ||
    combined.includes("execute")
  ) {
    if (
      combined.includes("week 1") ||
      combined.includes("timeline") ||
      combined.includes("execute immediately")
    ) {
      impactLevel = "high";
      impactType = "decision_made";
      movedWork = true;
      clarityScore = 9;
      outcome = "Executive decision provided clear authorization to proceed";
    }
  }

  // HIGH IMPACT: Critical coordination that unblocks
  if (
    combined.includes("architecture review") &&
    (combined.includes("monday") || combined.includes("tomorrow"))
  ) {
    if (
      combined.includes("timezone") === false &&
      combined.includes("will") &&
      combined.includes("can you")
    ) {
      impactLevel = "high";
      impactType = "coordination";
      movedWork = true;
      clarityScore = 8;
      outcome = "Scheduled critical architectural review meeting";
    }
  }

  // HIGH IMPACT: Status updates with clear next steps
  if (
    (combined.includes("executing on") ||
      combined.includes("confirmed") ||
      combined.includes("greenlit")) &&
    combined.includes("actions in progress")
  ) {
    impactLevel = "high";
    impactType = "unblocked_execution";
    movedWork = true;
    clarityScore = 9;
    outcome = "Team member executing on clear deliverables with approval";
  }

  // MEDIUM IMPACT: Detailed proposals and recommendations
  if (
    combined.includes("here's my") ||
    combined.includes("recommendation") ||
    combined.includes("analysis")
  ) {
    if (combined.length > 2000 && combined.includes("why")) {
      impactLevel = "medium";
      impactType = "decision_made";
      movedWork = true;
      clarityScore = 8;
      outcome = "Thorough analysis provided to support decision making";
    }
  }

  // MEDIUM IMPACT: Coordination with clear asks
  if (
    (combined.includes("can you") ||
      combined.includes("need from you") ||
      combined.includes("please")) &&
    combined.includes("monday") === false &&
    combined.includes("tuesday") === false
  ) {
    if (combined.includes("asap") || combined.includes("urgent")) {
      impactLevel = "medium";
      impactType = "coordination";
      movedWork = true;
      clarityScore = 7;
      outcome = "Clear coordination request with defined requirements";
    }
  }

  // MEDIUM-HIGH: Feedback loop with iterations
  if (combined.includes("implemented") && combined.includes("follow-up")) {
    impactLevel = "medium";
    impactType = "feedback_loop";
    movedWork = true;
    clarityScore = 7;
    outcome = "Work executed and feedback received for iteration";
  }

  // LOW IMPACT: Status updates without action
  if (
    combined.includes("here's the status") ||
    (combined.includes("eod update") && !combined.includes("blocker"))
  ) {
    impactLevel = "low";
    impactType = "status_check";
    movedWork = false;
    clarityScore = 6;
    outcome = "Informational status report - no action required";
  }

  // WASTED: Missing message / Confusion
  if (
    combined.includes("i'm not seeing it") ||
    combined.includes("not seeing the") ||
    combined.includes("can you resend") ||
    combined.includes("could you provide") === false &&
      combined.includes("i'm not seeing")
  ) {
    impactLevel = "wasted";
    impactType = "confusion";
    movedWork = false;
    clarityScore = 2;
    outcome = "Lost message - communication failure, had to resend";
  }

  // WASTED: Unclear requests
  if (
    combined.includes("i'm not sure") &&
    combined.includes("can you clarify")
  ) {
    impactLevel = "low";
    impactType = "unclear_request";
    movedWork = false;
    clarityScore = 3;
    outcome = "Unclear request requiring clarification";
  }

  // REDUNDANT: Duplicate coordination attempts
  if (combined.includes("i see you have") && combined.includes("scheduled")) {
    impactLevel = "low";
    impactType = "redundant";
    movedWork = false;
    clarityScore = 4;
    outcome = "Redundant coordination message - already scheduled";
  }

  // Detailed outcomes based on patterns
  if (
    msg.fromAgentName === "Marcus Bell" &&
    combined.includes("approved")
  ) {
    outcome = `Marcus approved and authorized: ${subject.substring(0, 60)}`;
  }

  if (
    combined.includes("week 1") &&
    combined.includes("timeline")
  ) {
    outcome = "Week 1 priorities clarified and timeline set";
    movedWork = true;
  }

  if (
    msg.fromAgentName === "Yuki Tanaka" &&
    combined.includes("executing")
  ) {
    outcome = "Infrastructure execution plan confirmed and underway";
    movedWork = true;
  }

  if (
    msg.fromAgentName === "Graham Sutton" &&
    combined.includes("market research")
  ) {
    outcome = "Market analysis and revenue opportunity research completed";
  }

  if (
    msg.fromAgentName === "DeVonte Jackson" &&
    combined.includes("demo")
  ) {
    outcome = "Demo and UI implementation plan provided";
    movedWork = true;
  }

  return {
    ...msg,
    impactLevel,
    impactType,
    outcome,
    movedWork,
    clarityScore,
  };
}

async function main() {
  const data = JSON.parse(
    fs.readFileSync(
      "/home/nkillgore/generic-corp/messages-data.json",
      "utf-8"
    )
  );

  const analyzed: ImpactAnalysis[] = data.map((msg: Message) =>
    analyzeMessageImpact(msg)
  );

  // Generate statistics
  const stats = {
    total: analyzed.length,
    byImpactLevel: {
      high: analyzed.filter((m) => m.impactLevel === "high").length,
      medium: analyzed.filter((m) => m.impactLevel === "medium").length,
      low: analyzed.filter((m) => m.impactLevel === "low").length,
      wasted: analyzed.filter((m) => m.impactLevel === "wasted").length,
    },
    byImpactType: {} as Record<string, number>,
    movedWorkCount: analyzed.filter((m) => m.movedWork).length,
    averageClarityScore:
      analyzed.reduce((sum, m) => sum + m.clarityScore, 0) /
      analyzed.length,
    agentImpactScore: {} as Record<
      string,
      {
        sent: number;
        highImpact: number;
        avgClarity: number;
      }
    >,
  };

  // Count impact types
  analyzed.forEach((msg) => {
    stats.byImpactType[msg.impactType] =
      (stats.byImpactType[msg.impactType] || 0) + 1;
  });

  // Agent impact scores
  analyzed.forEach((msg) => {
    if (!stats.agentImpactScore[msg.fromAgentName]) {
      stats.agentImpactScore[msg.fromAgentName] = {
        sent: 0,
        highImpact: 0,
        avgClarity: 0,
      };
    }
    stats.agentImpactScore[msg.fromAgentName].sent += 1;
    if (msg.impactLevel === "high" || msg.impactLevel === "medium") {
      stats.agentImpactScore[msg.fromAgentName].highImpact += 1;
    }
    stats.agentImpactScore[msg.fromAgentName].avgClarity += msg.clarityScore;
  });

  // Calculate averages
  Object.keys(stats.agentImpactScore).forEach((agent) => {
    stats.agentImpactScore[agent].avgClarity /=
      stats.agentImpactScore[agent].sent;
  });

  // Export analyzed data
  fs.writeFileSync(
    "/home/nkillgore/generic-corp/impact-analysis-detailed.json",
    JSON.stringify(analyzed, null, 2)
  );

  fs.writeFileSync(
    "/home/nkillgore/generic-corp/impact-analysis-stats.json",
    JSON.stringify(stats, null, 2)
  );

  // Generate CSV with impact ratings
  const csv =
    "id,fromAgent,toAgent,impactLevel,impactType,movedWork,clarityScore,outcome,createdAt\n" +
    analyzed
      .map(
        (msg) =>
          `"${msg.id}","${msg.fromAgentName}","${msg.toAgentName}","${msg.impactLevel}","${msg.impactType}",${msg.movedWork ? 1 : 0},${msg.clarityScore},"${msg.outcome.replace(/"/g, '""')}","${msg.createdAt}"`
      )
      .join("\n");

  fs.writeFileSync("/home/nkillgore/generic-corp/impact-analysis.csv", csv);

  // Print summary
  console.log("\n=== MESSAGE IMPACT ANALYSIS ===\n");
  console.log(`Total Messages: ${stats.total}`);
  console.log(`\nMessages by Impact Level:`);
  console.log(`  High Impact: ${stats.byImpactLevel.high} (${((stats.byImpactLevel.high / stats.total) * 100).toFixed(1)}%)`);
  console.log(
    `  Medium Impact: ${stats.byImpactLevel.medium} (${((stats.byImpactLevel.medium / stats.total) * 100).toFixed(1)}%)`
  );
  console.log(`  Low Impact: ${stats.byImpactLevel.low} (${((stats.byImpactLevel.low / stats.total) * 100).toFixed(1)}%)`);
  console.log(`  Wasted: ${stats.byImpactLevel.wasted} (${((stats.byImpactLevel.wasted / stats.total) * 100).toFixed(1)}%)`);

  console.log(`\nMessages that Moved Work Forward: ${stats.movedWorkCount} (${((stats.movedWorkCount / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Average Clarity Score: ${stats.averageClarityScore.toFixed(1)}/10`);

  console.log(`\nMessages by Impact Type:`);
  Object.entries(stats.byImpactType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  console.log(`\nAgent Impact Effectiveness (Messages Sent → High/Medium Impact Rate):`);
  Object.entries(stats.agentImpactScore)
    .sort(
      (a, b) =>
        (b[1].highImpact / b[1].sent) * 100 -
        (a[1].highImpact / a[1].sent) * 100
    )
    .forEach(([agent, data]) => {
      const impactRate = ((data.highImpact / data.sent) * 100).toFixed(1);
      console.log(
        `  ${agent}: ${data.sent} sent, ${data.highImpact} high/med impact (${impactRate}%), clarity ${data.avgClarity.toFixed(1)}/10`
      );
    });

  console.log(`\n✓ Detailed analysis exported to:`);
  console.log(`  - impact-analysis-detailed.json`);
  console.log(`  - impact-analysis-stats.json`);
  console.log(`  - impact-analysis.csv`);
}

main().catch(console.error);
