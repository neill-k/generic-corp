import { db } from './src/db/index.js';

async function checkInbox() {
  try {
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    if (!sable) {
      console.log('Sable Chen not found');
      return;
    }

    console.log('Sable Chen ID:', sable.id);

    // Get only unread messages
    const messages = await db.message.findMany({
      where: {
        toAgentId: sable.id,
        readAt: null,
        deletedAt: null
      },
      include: {
        fromAgent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== UNREAD MESSAGES FOR SABLE CHEN ===\n');

    if (messages.length === 0) {
      console.log('No unread messages found.');
    } else {
      for (const msg of messages) {
        console.log('===================================================');
        console.log('From:', msg.fromAgent?.name || 'Unknown');
        console.log('Subject:', msg.subject);
        console.log('Status:', msg.status);
        console.log('Created:', msg.createdAt);
        console.log('\nMessage Body:');
        console.log('---------------------------------------------------');
        console.log(msg.body);
        console.log('===================================================\n');
      }
    }

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkInbox();
