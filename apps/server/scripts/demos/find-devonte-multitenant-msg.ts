import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find DeVonte
  const devonte = await prisma.agents.findFirst({
    where: { name: { contains: 'DeVonte', mode: 'insensitive' } }
  });

  if (!devonte) {
    console.log('DeVonte not found');
    return;
  }

  console.log('DeVonte ID:', devonte.id);

  // Find Marcus
  const marcus = await prisma.agents.findFirst({
    where: { name: { contains: 'Marcus', mode: 'insensitive' } }
  });

  if (!marcus) {
    console.log('Marcus not found');
    return;
  }

  console.log('Marcus ID:', marcus.id);

  // Get recent messages from DeVonte to Marcus
  const messages = await prisma.messages.findMany({
    where: {
      from_agent_id: devonte.id,
      to_agent_id: marcus.id,
      deleted_at: null
    },
    orderBy: { created_at: 'desc' },
    take: 10
  });

  console.log('\n=== Recent Messages from DeVonte to Marcus ===\n');
  for (const msg of messages) {
    console.log('---');
    console.log('Subject:', msg.subject);
    console.log('Status:', msg.status);
    console.log('Created:', msg.created_at);
    console.log('Read at:', msg.read_at || 'Unread');
    if (msg.subject.toLowerCase().includes('multi-tenant') ||
        msg.subject.toLowerCase().includes('saas') ||
        msg.subject.toLowerCase().includes('ship')) {
      console.log('\nBody:');
      console.log(msg.body);
    } else {
      console.log('\nBody preview:', msg.body.substring(0, 200) + '...');
    }
    console.log('\n');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
