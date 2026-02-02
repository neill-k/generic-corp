import { db } from "./src/db/index.js";

async function checkDevonteMessages() {
  try {
    // Find DeVonte's agent ID
    const devonte = await db.agent.findUnique({
      where: { name: "DeVonte Jackson" },
    });

    if (!devonte) {
      console.log("DeVonte Jackson not found in database");
      return;
    }

    // Find Marcus's agent ID
    const marcus = await db.agent.findUnique({
      where: { name: "Marcus Bell" },
    });

    if (!marcus) {
      console.log("Marcus Bell not found in database");
      return;
    }

    console.log(`DeVonte ID: ${devonte.id}`);
    console.log(`Marcus ID: ${marcus.id}`);

    // Check for messages from DeVonte to Marcus
    const messages = await db.message.findMany({
      where: {
        fromAgentId: devonte.id,
        toAgentId: marcus.id,
      },
      include: {
        fromAgent: true,
        toAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`\nFound ${messages.length} message(s) from DeVonte to Marcus:\n`);

    for (const msg of messages) {
      console.log(`---`);
      console.log(`From: ${msg.fromAgent.name}`);
      console.log(`To: ${msg.toAgent.name}`);
      console.log(`Subject: ${msg.subject}`);
      console.log(`Status: ${msg.status}`);
      console.log(`Created: ${msg.createdAt}`);
      console.log(`Read At: ${msg.readAt || "Not read"}`);
      console.log(`\nBody:\n${msg.body}`);
      console.log(`---\n`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkDevonteMessages();
