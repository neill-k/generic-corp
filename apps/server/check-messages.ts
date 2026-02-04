import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMessages() {
  try {
    // Find Marcus Bell agent
    const marcus = await prisma.agent.findUnique({
      where: { name: 'Marcus Bell' }
    });

    if (!marcus) {
      console.log('Marcus Bell agent not found');
      return;
    }

    console.log('Marcus Bell ID:', marcus.id);

    // Get messages to Marcus
    const messages = await prisma.message.findMany({
      where: {
        toAgentId: marcus.id,
        deletedAt: null
      },
      include: {
        fromAgent: true,
        toAgent: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    console.log(`\nFound ${messages.length} messages to Marcus Bell:\n`);

    for (const msg of messages) {
      console.log('─'.repeat(60));
      console.log(`From: ${msg.fromAgent.name}`);
      console.log(`Subject: ${msg.subject}`);
      console.log(`Status: ${msg.status}`);
      console.log(`Created: ${msg.createdAt}`);
      console.log(`Read: ${msg.readAt ? msg.readAt : 'Not read'}`);
      console.log(`\nBody:\n${msg.body}`);
      console.log('─'.repeat(60));
      console.log();
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessages();
