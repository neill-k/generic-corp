import { db } from "./src/db/index.js";

async function checkAllMessages() {
  try {
    // Find Marcus's agent ID
    const marcus = await db.agent.findUnique({
      where: { name: "Marcus Bell" },
    });

    if (!marcus) {
      console.log("Marcus Bell not found in database");
      return;
    }

    console.log(`Marcus ID: ${marcus.id}\n`);

    // Check for all messages to Marcus
    const messages = await db.message.findMany({
      where: {
        toAgentId: marcus.id,
      },
      include: {
        fromAgent: true,
        toAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${messages.length} total message(s) to Marcus:\n`);

    for (const msg of messages) {
      console.log(`---`);
      console.log(`From: ${msg.fromAgent.name}`);
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

checkAllMessages();
