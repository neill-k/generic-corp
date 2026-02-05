import { db } from "./src/db/index.js";

async function main() {
  try {
    // Get agent IDs
    const devonte = await db.agent.findUnique({
      where: { name: 'DeVonte Jackson' }
    });

    const yuki = await db.agent.findUnique({
      where: { name: 'Yuki Tanaka' }
    });

    if (!devonte || !yuki) {
      console.log('Could not find agents');
      return;
    }

    console.log('DeVonte ID:', devonte.id);
    console.log('Yuki ID:', yuki.id);

    // Get messages FROM Yuki TO DeVonte
    const messages = await db.message.findMany({
      where: {
        fromAgentId: yuki.id,
        toAgentId: devonte.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromAgent: true,
        toAgent: true
      }
    });

    console.log(`\nFound ${messages.length} message(s) from Yuki to DeVonte:\n`);

    for (const message of messages) {
      console.log('---');
      console.log(`From: ${message.fromAgent.name}`);
      console.log(`To: ${message.toAgent.name}`);
      console.log(`Subject: ${message.subject}`);
      console.log(`Status: ${message.status}`);
      console.log(`Created: ${message.createdAt}`);
      console.log(`Read At: ${message.readAt || 'Not read'}`);
      console.log('\nBody:');
      console.log(message.body);
      console.log('---\n');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

main();
