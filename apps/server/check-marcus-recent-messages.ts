import { db } from "./src/db/index.js";

async function checkMarcusMessages() {
  try {
    // Find Marcus
    const marcus = await db.agent.findUnique({
      where: { name: "Marcus Bell" },
    });

    if (!marcus) {
      console.log("Marcus Bell not found");
      return;
    }

    // Get recent messages from Marcus about shipping or priority
    const messages = await db.message.findMany({
      where: {
        fromAgentId: marcus.id,
        OR: [
          { subject: { contains: "shipping", mode: "insensitive" } },
          { subject: { contains: "priority", mode: "insensitive" } },
          { subject: { contains: "urgent", mode: "insensitive" } },
          { body: { contains: "ship", mode: "insensitive" } },
        ],
      },
      include: {
        fromAgent: true,
        toAgent: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    console.log(`\nFound ${messages.length} shipping/priority messages from Marcus:\n`);

    for (const msg of messages) {
      console.log(`---`);
      console.log(`To: ${msg.toAgent.name}`);
      console.log(`Subject: ${msg.subject}`);
      console.log(`Created: ${msg.createdAt}`);
      console.log(`Status: ${msg.status}`);
      console.log(`\nBody:\n${msg.body}`);
      console.log(`---\n`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

checkMarcusMessages();
