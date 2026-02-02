import { db } from './src/db/index.js';

async function checkMessages() {
  try {
    const marcus = await db.agent.findFirst({
      where: { name: { contains: 'Marcus Bell', mode: 'insensitive' } }
    });
    
    if (!marcus) {
      console.log('Marcus not found');
      return;
    }
    
    const messages = await db.message.findMany({
      where: { 
        toAgentId: marcus.id,
        read: false
      },
      include: {
        fromAgent: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`Found ${messages.length} unread messages for Marcus:\n`);
    messages.forEach(msg => {
      console.log('---');
      console.log('From:', msg.fromAgent.name);
      console.log('Subject:', msg.subject);
      console.log('Date:', msg.createdAt);
      console.log('Priority:', msg.priority);
      console.log('');
    });
    
    await db.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMessages();
