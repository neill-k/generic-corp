import * as fs from "fs";

interface TimelineEvent {
  timestamp: string;
  actors: string[];
  event: string;
  type: "decision" | "execution" | "blocker" | "coordination" | "status" | "failure";
  impact: "high" | "medium" | "low";
  details: string;
}

async function extractTimeline() {
  const data = JSON.parse(
    fs.readFileSync("/home/nkillgore/generic-corp/messages-data.json", "utf-8")
  );

  const events: TimelineEvent[] = [];

  // Parse messages and extract events
  data.forEach((msg: any) => {
    const body = msg.body.toLowerCase();
    const subject = msg.subject.toLowerCase();
    const combined = body + " " + subject;
    const timestamp = new Date(msg.createdAt);

    // EXECUTION EVENTS
    if (
      combined.includes("executing on") ||
      combined.includes("executing immediately")
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: [msg.fromAgentName],
        event: "Began execution on approved deliverables",
        type: "execution",
        impact: "high",
        details: `${msg.fromAgentName} confirmed execution on: ${subject.substring(0, 80)}`,
      });
    }

    // MAJOR DECISIONS
    if (combined.includes("approved") && msg.fromAgentName === "Marcus Bell") {
      if (combined.includes("execute immediately") || combined.includes("green light")) {
        events.push({
          timestamp: msg.createdAt,
          actors: ["Marcus Bell"],
          event: "Executive decision: Approved major initiative",
          type: "decision",
          impact: "high",
          details: `Approved: ${subject.substring(0, 80)}`,
        });
      }
    }

    // MARKET RESEARCH COMPLETION
    if (
      combined.includes("market research findings") ||
      combined.includes("top 3 most promising")
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["Graham Sutton"],
        event: "Market research completed - 3 opportunities identified",
        type: "status",
        impact: "high",
        details:
          "Multi-Provider AI Orchestration ranked #1, detailed competitive analysis provided",
      });
    }

    // INFRASTRUCTURE ASSESSMENT
    if (
      combined.includes("infrastructure assessment") &&
      combined.includes("complete")
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["Yuki Tanaka"],
        event: "Infrastructure assessment completed",
        type: "status",
        impact: "high",
        details:
          "Production readiness plan for multi-tenant SaaS with 2-3 week timeline",
      });
    }

    // WEEK 1 PRIORITIES SET
    if (
      combined.includes("week 1") &&
      combined.includes("priorities") &&
      combined.includes("confirmed")
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["Marcus Bell"],
        event: "Week 1 priorities confirmed and team aligned",
        type: "decision",
        impact: "high",
        details: "Clear roadmap set: Auth → Multi-tenant DB → Rate limiting → Usage tracking",
      });
    }

    // ARCHITECTURE REVIEWS SCHEDULED
    if (
      combined.includes("architecture review") &&
      (combined.includes("monday") ||
        combined.includes("tuesday") ||
        combined.includes("wednesday"))
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: [msg.fromAgentName, "Sable Chen"],
        event: "Critical architecture review scheduled",
        type: "coordination",
        impact: "high",
        details: `${msg.fromAgentName} scheduled review with Sable for multi-tenant design`,
      });
    }

    // LANDING PAGE STATUS
    if (combined.includes("landing page") && combined.includes("deploy")) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["DeVonte Jackson", "Yuki Tanaka"],
        event: "Landing page deployment initiated",
        type: "execution",
        impact: "high",
        details: "Ready for production deployment to demo.genericcorp.com",
      });
    }

    // DNS BLOCKING
    if (combined.includes("dns") && combined.includes("blocker")) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["Yuki Tanaka"],
        event: "BLOCKER: DNS access needed for landing page deployment",
        type: "blocker",
        impact: "high",
        details: "Waiting on Marcus for DNS registrar access to genericcorp.com",
      });
    }

    // DEMO READY
    if (
      combined.includes("demo") &&
      (combined.includes("3-5 days") ||
        combined.includes("ready") ||
        combined.includes("live"))
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["DeVonte Jackson"],
        event: "Interactive demo prototype plan presented",
        type: "status",
        impact: "medium",
        details:
          "3-5 day timeline for working sales demo with fake provider responses",
      });
    }

    // CONFUSION / MISSING MESSAGES
    if (
      combined.includes("i'm not seeing") ||
      combined.includes("not seeing it") ||
      combined.includes("can you resend")
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: [msg.fromAgentName],
        event: "FAILURE: Message delivery failure - had to resend",
        type: "failure",
        impact: "low",
        details: `${msg.fromAgentName} reporting missing message from ${msg.toAgentName}`,
      });
    }

    // ANALYTICS SETUP
    if (combined.includes("analytics") && combined.includes("setup")) {
      events.push({
        timestamp: msg.createdAt,
        actors: ["Graham Sutton"],
        event: "Landing page analytics plan finalized",
        type: "status",
        impact: "medium",
        details:
          "GA4 + lead tracking + conversion dashboard ready for deployment",
      });
    }

    // COORDINATION SYNCS
    if (
      (combined.includes("coordinating") ||
        combined.includes("sync")) &&
      combined.includes("today")
    ) {
      events.push({
        timestamp: msg.createdAt,
        actors: [msg.fromAgentName],
        event: "Team coordination sync scheduled",
        type: "coordination",
        impact: "medium",
        details: `${msg.fromAgentName} coordinating with team on: ${subject.substring(0, 60)}`,
      });
    }
  });

  // Sort by timestamp
  events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Generate timeline report
  const timelineReport = events
    .map(
      (e) =>
        `${e.timestamp.split("T")[1].split(".")[0]} | [${e.type.toUpperCase()}] ${e.event}
        Actors: ${e.actors.join(", ")}
        Impact: ${e.impact}
        Details: ${e.details}\n`
    )
    .join("\n");

  fs.writeFileSync(
    "/home/nkillgore/generic-corp/timeline-of-events.txt",
    timelineReport
  );

  // Generate statistics
  const stats = {
    totalEvents: events.length,
    byType: {} as Record<string, number>,
    byImpact: {} as Record<string, number>,
    keyDecisions: events.filter((e) => e.type === "decision"),
    majorBlockers: events.filter((e) => e.type === "blocker"),
    criticalFailures: events.filter((e) => e.type === "failure"),
  };

  events.forEach((e) => {
    stats.byType[e.type] = (stats.byType[e.type] || 0) + 1;
    stats.byImpact[e.impact] = (stats.byImpact[e.impact] || 0) + 1;
  });

  fs.writeFileSync(
    "/home/nkillgore/generic-corp/timeline-stats.json",
    JSON.stringify(stats, null, 2)
  );

  // Print summary
  console.log("\n=== TIMELINE OF EVENTS ===\n");
  console.log(`Total Events Identified: ${events.length}\n`);

  console.log("Events by Type:");
  Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  console.log("\nEvents by Impact:");
  Object.entries(stats.byImpact)
    .sort((a, b) => b[1] - a[1])
    .forEach(([impact, count]) => {
      console.log(`  ${impact}: ${count}`);
    });

  console.log(`\n📋 Key Decisions Made: ${stats.keyDecisions.length}`);
  stats.keyDecisions.slice(0, 5).forEach((e) => {
    const time = new Date(e.timestamp).toLocaleString();
    console.log(`  [${time}] ${e.event}`);
  });

  console.log(`\n🚫 Major Blockers: ${stats.majorBlockers.length}`);
  stats.majorBlockers.forEach((e) => {
    const time = new Date(e.timestamp).toLocaleString();
    console.log(`  [${time}] ${e.event}`);
    console.log(`    → ${e.details}`);
  });

  console.log(`\n❌ Failures/Issues: ${stats.criticalFailures.length}`);
  stats.criticalFailures.slice(0, 5).forEach((e) => {
    const time = new Date(e.timestamp).toLocaleString();
    console.log(`  [${time}] ${e.event}`);
  });

  console.log(`\n✓ Timeline exported to: timeline-of-events.txt`);
}

extractTimeline().catch(console.error);
