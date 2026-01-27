import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://genericcorp:genericcorp@localhost:5432/genericcorp?schema=public'
    }
  }
});

async function main() {
  try {
    // Find Marcus Bell (CEO)
    const marcus = await prisma.agent.findFirst({
      where: { name: { contains: 'Marcus', mode: 'insensitive' } }
    });

    if (!marcus) {
      console.log('Marcus Bell not found in database');
      return;
    }

    console.log(`Found Marcus Bell: ${marcus.id}`);

    // Get unread messages for Marcus
    const messages = await prisma.message.findMany({
      where: {
        toAgentId: marcus.id,
        readAt: null
      },
      include: {
        fromAgent: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\n=== Inbox for Marcus Bell (${messages.length} unread messages) ===\n`);

    for (const msg of messages) {
      console.log(`FROM: ${msg.fromAgent?.name || 'Unknown'}`);
      console.log(`SUBJECT: ${msg.subject}`);
      console.log(`DATE: ${msg.createdAt}`);
      console.log(`TYPE: ${msg.type}`);
      console.log(`\n--- Message Body ---`);
      console.log(msg.body);
      console.log(`\n${'='.repeat(70)}\n`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
