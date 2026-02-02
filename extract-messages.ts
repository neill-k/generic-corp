import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface MessageData {
  id: string;
  fromAgentName: string;
  toAgentName: string;
  subject: string;
  body: string;
  type: string;
  status: string;
  createdAt: Date;
}

interface AnalyzedMessage extends MessageData {
  category: string;
  summary: string;
}

// Categorize message based on subject and body content
function categorizeMessage(subject: string, body: string): string {
  const combined = (subject + " " + body).toLowerCase();

  if (
    combined.includes("task") ||
    combined.includes("assign") ||
    combined.includes("workflow")
  ) {
    return "Task Assignment";
  }
  if (
    combined.includes("update") ||
    combined.includes("progress") ||
    combined.includes("status")
  ) {
    return "Status Update";
  }
  if (
    combined.includes("approve") ||
    combined.includes("approval") ||
    combined.includes("reject")
  ) {
    return "Approval/Review";
  }
  if (
    combined.includes("error") ||
    combined.includes("failed") ||
    combined.includes("issue")
  ) {
    return "Error/Issue";
  }
  if (
    combined.includes("request") ||
    combined.includes("need") ||
    combined.includes("require")
  ) {
    return "Request";
  }
  if (
    combined.includes("notification") ||
    combined.includes("alert") ||
    combined.includes("notify")
  ) {
    return "Notification";
  }

  return "Other";
}

// Generate summary (first 100 chars of body)
function generateSummary(body: string): string {
  return body.substring(0, 100).replace(/\n/g, " ");
}

async function main() {
  try {
    console.log("Extracting messages...");

    // Fetch all messages with related agent data
    const messages = await prisma.message.findMany({
      include: {
        fromAgent: {
          select: { name: true },
        },
        toAgent: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`Found ${messages.length} messages`);

    // Transform and categorize messages
    const analyzedMessages: AnalyzedMessage[] = messages.map((msg) => ({
      id: msg.id,
      fromAgentName: msg.fromAgent.name,
      toAgentName: msg.toAgent.name,
      subject: msg.subject,
      body: msg.body,
      type: msg.type,
      status: msg.status,
      createdAt: msg.createdAt,
      category: categorizeMessage(msg.subject, msg.body),
      summary: generateSummary(msg.body),
    }));

    // Export to JSON
    const jsonPath = path.join(
      "/home/nkillgore/generic-corp",
      "messages-data.json"
    );
    fs.writeFileSync(jsonPath, JSON.stringify(analyzedMessages, null, 2));
    console.log(`✓ Exported to ${jsonPath}`);

    // Generate CSV
    const csvPath = path.join(
      "/home/nkillgore/generic-corp",
      "messages-analysis.csv"
    );
    const csvHeaders =
      "id,fromAgent,toAgent,category,type,status,summary,createdAt\n";
    const csvRows = analyzedMessages
      .map(
        (msg) =>
          `"${msg.id}","${msg.fromAgentName}","${msg.toAgentName}","${msg.category}","${msg.type}","${msg.status}","${msg.summary.replace(/"/g, '""')}","${msg.createdAt.toISOString()}"`
      )
      .join("\n");

    fs.writeFileSync(csvPath, csvHeaders + csvRows);
    console.log(`✓ Exported to ${csvPath}`);

    // Generate summary statistics
    const stats = {
      totalMessages: analyzedMessages.length,
      messagesByCategory: {} as Record<string, number>,
      messagesByType: {} as Record<string, number>,
      messagesByStatus: {} as Record<string, number>,
      agentStats: {} as Record<
        string,
        { sent: number; received: number; categories: Record<string, number> }
      >,
      dateRange: {
        earliest: Math.min(...analyzedMessages.map((m) => m.createdAt.getTime())),
        latest: Math.max(...analyzedMessages.map((m) => m.createdAt.getTime())),
      },
    };

    analyzedMessages.forEach((msg) => {
      // Category stats
      stats.messagesByCategory[msg.category] =
        (stats.messagesByCategory[msg.category] || 0) + 1;

      // Type stats
      stats.messagesByType[msg.type] = (stats.messagesByType[msg.type] || 0) + 1;

      // Status stats
      stats.messagesByStatus[msg.status] =
        (stats.messagesByStatus[msg.status] || 0) + 1;

      // Agent stats
      if (!stats.agentStats[msg.fromAgentName]) {
        stats.agentStats[msg.fromAgentName] = {
          sent: 0,
          received: 0,
          categories: {},
        };
      }
      if (!stats.agentStats[msg.toAgentName]) {
        stats.agentStats[msg.toAgentName] = {
          sent: 0,
          received: 0,
          categories: {},
        };
      }

      stats.agentStats[msg.fromAgentName].sent += 1;
      stats.agentStats[msg.fromAgentName].categories[msg.category] =
        (stats.agentStats[msg.fromAgentName].categories[msg.category] || 0) + 1;
      stats.agentStats[msg.toAgentName].received += 1;
    });

    const statsPath = path.join(
      "/home/nkillgore/generic-corp",
      "messages-stats.json"
    );
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`✓ Exported stats to ${statsPath}`);

    console.log("\n=== ANALYSIS SUMMARY ===");
    console.log(
      `Total Messages: ${stats.totalMessages}`
    );
    console.log("\nMessages by Category:");
    Object.entries(stats.messagesByCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        const percent = ((count / stats.totalMessages) * 100).toFixed(1);
        console.log(`  ${cat}: ${count} (${percent}%)`);
      });

    console.log("\nMessages by Type:");
    Object.entries(stats.messagesByType)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

    console.log("\nMessages by Status:");
    Object.entries(stats.messagesByStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

    console.log("\nTop 5 Agents by Message Volume:");
    Object.entries(stats.agentStats)
      .sort((a, b) => (b[1].sent + b[1].received) - (a[1].sent + a[1].received))
      .slice(0, 5)
      .forEach(([agent, data]) => {
        console.log(
          `  ${agent}: ${data.sent} sent, ${data.received} received`
        );
      });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
