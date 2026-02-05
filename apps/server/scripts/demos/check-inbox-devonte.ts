import { db } from "./src/db/index.js";

async function checkDevonteInbox() {
  try {
    // Find DeVonte's agent ID
    const devonte = await db.agent.findUnique({
      where: { name: "DeVonte Jackson" },
    });

    if (!devonte) {
      console.log("DeVonte Jackson not found in database");
      return;
    }

    console.log(`DeVonte ID: ${devonte.id}\n`);

    // Check for all messages TO DeVonte
    const messages = await db.message.findMany({
      where: {
        toAgentId: devonte.id,
      },
      include: {
        fromAgent: true,
        toAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${messages.length} message(s) to DeVonte:\n`);

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

checkDevonteInbox();
