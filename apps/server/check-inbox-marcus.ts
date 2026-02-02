import { db } from './src/db/index.js';

async function checkInbox() {
  try {
    // Find Marcus Bell
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });

    if (!marcus) {
      console.log('Marcus Bell not found');
      return;
    }

    console.log('Marcus Bell ID:', marcus.id);

    // Get all messages (including read ones)
    const messages = await db.message.findMany({
      where: {
        toAgentId: marcus.id,
        deletedAt: null
      },
      include: {
        fromAgent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== MESSAGES FOR MARCUS BELL ===\n');

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

checkInbox();
