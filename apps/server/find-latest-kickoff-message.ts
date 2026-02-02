import { db } from './src/db/index.js';

async function findMessage() {
  try {
    // Get Marcus Bell's agent ID first
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!marcus) {
      console.log('Marcus Bell not found');
      return;
    }

    // Get ALL messages from Marcus Bell, sorted by most recent
    const messages = await db.message.findMany({
      where: {
        fromAgentId: marcus.id,
        deletedAt: null
      },
      include: {
        toAgent: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10  // Get the 10 most recent messages
    });

    console.log('\n=== MOST RECENT MESSAGES FROM MARCUS BELL ===\n');

    for (const msg of messages) {
      console.log('===================================================');
      console.log('To:', msg.toAgent?.name || 'Unknown');
      console.log('Subject:', msg.subject);
      console.log('Created:', msg.createdAt);
      console.log('===================================================\n');
    }

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMessage();
