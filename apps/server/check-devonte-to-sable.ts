import { db } from './src/db/index.js';

async function checkMessages() {
  try {
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable Chen', mode: 'insensitive' } }
    });

    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (!sable || !devonte) {
      console.log('Agents not found');
      return;
    }

    const messages = await db.message.findMany({
      where: {
        fromAgentId: devonte.id,
        toAgentId: sable.id,
        readAt: null,
        deletedAt: null
      },
      include: {
        fromAgent: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('\n=== UNREAD MESSAGES FROM DEVONTE TO SABLE ===\n');
    console.log('Count:', messages.length);

    for (const msg of messages) {
      console.log('\n=== MESSAGE ===');
      console.log('Subject:', msg.subject);
      console.log('Status:', msg.status);
      console.log('Created:', msg.createdAt);
      console.log('\nBody:\n', msg.body);
      console.log('===\n');
    }

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMessages();
