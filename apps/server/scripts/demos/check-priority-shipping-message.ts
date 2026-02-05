import { db } from './src/db/index.js';

async function checkMessage() {
  try {
    // Find Sable Chen (me)
    const sable = await db.agent.findFirst({
      where: { name: { contains: 'Sable', mode: 'insensitive' } }
    });

    if (!sable) {
      console.log('Sable not found');
      return;
    }

    // Find DeVonte Jackson
    const devonte = await db.agent.findFirst({
      where: { name: { contains: 'DeVonte', mode: 'insensitive' } }
    });

    if (!devonte) {
      console.log('DeVonte not found');
      return;
    }

    // Look for messages from DeVonte to Sable about Priority Shipping
    const messages = await db.message.findMany({
      where: {
        fromAgentId: devonte.id,
        toAgentId: sable.id,
        subject: {
          contains: 'Priority Shipping',
          mode: 'insensitive'
        },
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        fromAgent: true,
        toAgent: true
      }
    });

    if (messages.length === 0) {
      console.log('No messages found from DeVonte about Priority Shipping');

      // Check all messages from DeVonte to Sable
      const allMessages = await db.message.findMany({
        where: {
          fromAgentId: devonte.id,
          toAgentId: sable.id,
          deletedAt: null
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      });

      console.log(`\nFound ${allMessages.length} total messages from DeVonte to Sable:`);
      allMessages.forEach((msg, idx) => {
        console.log(`${idx + 1}. "${msg.subject}" - ${msg.createdAt}`);
      });

      return;
    }

    console.log(`\n=== MESSAGES FROM DEVONTE ABOUT PRIORITY SHIPPING ===\n`);

    messages.forEach((msg) => {
      console.log('===================================================');
      console.log(`From: ${msg.fromAgent?.name}`);
      console.log(`To: ${msg.toAgent?.name}`);
      console.log(`Subject: ${msg.subject}`);
      console.log(`Status: ${msg.status}`);
      console.log(`Read: ${msg.readAt ? 'Yes' : 'No'}`);
      console.log(`Created: ${msg.createdAt}`);
      console.log('\nMessage Body:');
      console.log('---------------------------------------------------');
      console.log(msg.body);
      console.log('===================================================\n');
    });

    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMessage();
