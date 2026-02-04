import { db } from './src/db/index.js';

async function findMessage() {
  const marcus = await db.agent.findFirst({
    where: { name: { contains: 'Marcus', mode: 'insensitive' } }
  });

  const sable = await db.agent.findFirst({
    where: { name: { contains: 'Sable', mode: 'insensitive' } }
  });

  if (!marcus || !sable) {
    console.log('Could not find agents');
    return;
  }

  const messages = await db.message.findMany({
    where: {
      fromAgentId: marcus.id,
      toAgentId: sable.id,
      subject: { contains: 'Multi-Tenant', mode: 'insensitive' }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Found ${messages.length} messages with Multi-Tenant in subject\n`);
  messages.forEach(msg => {
    console.log('\n=================================');
    console.log('Subject:', msg.subject);
    console.log('Created:', msg.createdAt);
    console.log('Status:', msg.status);
    console.log('Read:', msg.readAt ? 'Yes' : 'No');
    console.log('\nBody:');
    console.log(msg.body);
  });

  await db.$disconnect();
}

findMessage();
