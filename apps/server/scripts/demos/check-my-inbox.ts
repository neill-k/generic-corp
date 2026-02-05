import { db } from './src/db/index.js';

async function checkMyInbox() {
  try {
    // Find DeVonte Jackson
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!devonte) {
      console.log('DeVonte Jackson not found');
      return;
    }

    console.log('DeVonte Jackson ID:', devonte.id);

    // Get all messages to DeVonte
    const messages = await db.message.findMany({
      where: {
        toAgentId: devonte.id,
        deletedAt: null
      },
      include: {
        fromAgent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== MESSAGES FOR DEVONTE JACKSON ===\n');

    if (messages.length === 0) {
      console.log('No messages found.');
    } else {
      for (const msg of messages) {
        console.log('---');
        console.log('From:', msg.fromAgent?.name || 'Unknown');
        console.log('Subject:', msg.subject);
        console.log('Status:', msg.status);
        console.log('Read at:', msg.readAt || 'Unread');
        console.log('Created:', msg.createdAt);
        console.log('\nBody:\n', msg.body);
        console.log('---\n');
      }
    }

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMyInbox();
