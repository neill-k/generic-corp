import { db } from './src/db/index.js';

async function findMessage() {
  try {
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    if (!sable) {
      console.log('Sable Chen not found');
      return;
    }

    // Search for messages with "Week 1" or "Kickoff" in subject
    const messages = await db.message.findMany({
      where: {
        toAgentId: sable.id,
        deletedAt: null,
        OR: [
          { subject: { contains: 'Week 1', mode: 'insensitive' } },
          { subject: { contains: 'Kickoff', mode: 'insensitive' } },
          { subject: { contains: 'All Hands', mode: 'insensitive' } }
        ]
      },
      include: {
        fromAgent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== WEEK 1 KICKOFF MESSAGES ===\n');

    if (messages.length === 0) {
      console.log('No matching messages found.');
    } else {
      for (const msg of messages) {
        console.log('===================================================');
        console.log('Message ID:', msg.id);
        console.log('From:', msg.fromAgent?.name || 'Unknown');
        console.log('Subject:', msg.subject);
        console.log('Status:', msg.status);
        console.log('Read:', msg.readAt ? 'Yes' : 'No');
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

findMessage();
