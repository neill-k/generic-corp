import { db } from "./src/db/index.js";

async function findDeVonteRecent() {
  try {
    const devonte = await db.agent.findFirst({
      where: { name: { contains: "DeVonte", mode: "insensitive" } },
    });

    const marcus = await db.agent.findFirst({
      where: { name: { contains: "Marcus", mode: "insensitive" } },
    });

    if (!devonte || !marcus) {
      console.log("Could not find agents");
      return;
    }

    const messages = await db.message.findMany({
      where: {
        fromAgentId: devonte.id,
        toAgentId: marcus.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    for (const msg of messages) {
      console.log("\n===================");
      console.log(`Subject: ${msg.subject}`);
      console.log(`Status: ${msg.status}`);
      console.log(`Created: ${msg.createdAt}`);
      console.log(`\nBody:\n${msg.body}`);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.$disconnect();
  }
}

findDeVonteRecent();
