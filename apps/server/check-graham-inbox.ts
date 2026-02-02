import { db } from './src/db/index.js';

async function checkInbox() {
  try {
    // Find Graham Sutton
    const graham = await db.agent.findFirst({
      where: { name: { contains: 'Graham Sutton', mode: 'insensitive' } }
    });

    if (!graham) {
      console.log('Graham Sutton not found');
      return;
    }

    console.log('Graham Sutton ID:', graham.id);

    // Get all messages (including read ones)
    const messages = await db.message.findMany({
      where: {
        toAgentId: graham.id,
        deletedAt: null
      },
      include: {
        fromAgent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== MESSAGES FOR GRAHAM SUTTON ===\n');

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
