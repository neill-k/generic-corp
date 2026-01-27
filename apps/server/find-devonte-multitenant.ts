import { db } from './src/db/index.js';

async function findMessage() {
  try {
    // Find DeVonte
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte', mode: 'insensitive' } }
    });

    if (!devonte) {
      console.log('DeVonte not found');
      return;
    }

    console.log('DeVonte ID:', devonte.id);

    // Find Marcus
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus', mode: 'insensitive' } }
    });

    if (!marcus) {
      console.log('Marcus not found');
      return;
    }

    console.log('Marcus ID:', marcus.id);

    // Get recent messages from DeVonte to Marcus
    const messages = await db.message.findMany({
      where: {
        fromAgentId: devonte.id,
        toAgentId: marcus.id,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log('\n=== Recent Messages from DeVonte to Marcus ===\n');
    for (const msg of messages) {
      console.log('---');
      console.log('Subject:', msg.subject);
      console.log('Status:', msg.status);
      console.log('Created:', msg.createdAt);
      console.log('Read at:', msg.readAt || 'Unread');

      if (msg.subject.toLowerCase().includes('multi-tenant') ||
          msg.subject.toLowerCase().includes('saas') ||
          msg.subject.toLowerCase().includes('ship')) {
        console.log('\n*** MATCHING MESSAGE FOUND ***');
        console.log('\nFull Body:');
        console.log(msg.body);
      } else {
        console.log('\nBody preview:', msg.body.substring(0, 150) + '...');
      }
      console.log('\n');
    }

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMessage();
