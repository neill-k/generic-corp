import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find Graham
    const graham = await prisma.agent.findFirst({
      where: { name: { contains: 'Graham', mode: 'insensitive' } }
    });

    if (!graham) {
      console.log('Graham Sutton not found');
      return;
    }

    console.log(`Found Graham Sutton: ${graham.id}`);

    // Find Marcus
    const marcus = await prisma.agent.findFirst({
      where: { name: { contains: 'Marcus', mode: 'insensitive' } }
    });

    console.log(`Found Marcus Bell: ${marcus.id}\n`);

    // Get messages FROM Graham TO Marcus
    const messages = await prisma.message.findMany({
      where: {
        fromAgentId: graham.id,
        toAgentId: marcus.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    console.log(`=== Messages from Graham to Marcus (${messages.length}) ===\n`);

    for (const msg of messages) {
      console.log(`SUBJECT: ${msg.subject}`);
      console.log(`DATE: ${msg.createdAt}`);
      console.log(`READ: ${msg.readAt ? 'Yes' : 'No'}`);
      console.log(`TYPE: ${msg.type}`);
      console.log(`\n--- Message Body ---`);
      console.log(msg.body);
      console.log(`\n${'='.repeat(70)}\n`);
    }

    // Also check all messages mentioning "data pipeline" or "infrastructure"
    const allMessages = await prisma.message.findMany({
      where: {
        OR: [
          { subject: { contains: 'pipeline', mode: 'insensitive' } },
          { subject: { contains: 'infrastructure', mode: 'insensitive' } },
          { body: { contains: 'pipeline', mode: 'insensitive' } }
        ]
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

    console.log(`\n=== All messages about pipeline/infrastructure (${allMessages.length}) ===\n`);

    for (const msg of allMessages) {
      console.log(`FROM: ${msg.fromAgent?.name} TO: ${msg.toAgent?.name}`);
      console.log(`SUBJECT: ${msg.subject}`);
      console.log(`DATE: ${msg.createdAt}`);
      console.log('---');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
