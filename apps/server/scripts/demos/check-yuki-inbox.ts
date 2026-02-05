import { db } from "./src/db/index.js";

async function checkYukiInbox() {
  try {
    // Find Yuki's agent ID
    const yuki = await db.agent.findUnique({
      where: { name: "Yuki Tanaka" },
    });

    if (!yuki) {
      console.log("Yuki Tanaka not found in database");
      return;
    }

    console.log(`Yuki ID: ${yuki.id}\n`);

    // Check for messages TO Yuki
    const messages = await db.message.findMany({
      where: {
        toAgentId: yuki.id,
      },
      include: {
        fromAgent: true,
        toAgent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${messages.length} message(s) to Yuki:\n`);

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

checkYukiInbox();
