import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMessageSystemStatus() {
  try {
    console.log('=== Message System Status Check ===\n');

    // Get Graham's agent ID
    const graham = await prisma.agent.findUnique({
      where: { name: 'Graham Sutton' }
    });

    if (!graham) {
      console.log('Error: Graham Sutton not found in database');
      return;
    }

    console.log(`Graham Sutton Agent ID: ${graham.id}\n`);

    // Get Marcus's agent ID
    const marcus = await prisma.agent.findUnique({
      where: { name: 'Marcus Bell' }
    });

    if (!marcus) {
      console.log('Error: Marcus Bell not found in database');
      return;
    }

    console.log(`Marcus Bell Agent ID: ${marcus.id}\n`);

    // Check all messages from Marcus to Graham
    console.log('--- Messages from Marcus to Graham ---');
    const marcusToGraham = await prisma.message.findMany({
      where: {
        fromAgentId: marcus.id,
        toAgentId: graham.id,
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (marcusToGraham.length === 0) {
      console.log('No messages found from Marcus to Graham\n');
    } else {
      marcusToGraham.forEach(msg => {
        console.log(`ID: ${msg.id}`);
        console.log(`Subject: ${msg.subject}`);
        console.log(`Status: ${msg.status}`);
        console.log(`Created: ${msg.createdAt}`);
        console.log(`Read At: ${msg.readAt || 'Not read'}`);
        console.log(`Body Preview: ${msg.body.substring(0, 100)}...`);
        console.log('---');
      });
    }

    // Check message statistics
    console.log('\n--- Overall Message System Statistics ---');
    const totalMessages = await prisma.message.count({
      where: { deletedAt: null }
    });
    const unreadMessages = await prisma.message.count({
      where: {
        status: 'delivered',
        readAt: null,
        deletedAt: null
      }
    });
    const pendingMessages = await prisma.message.count({
      where: { status: 'pending', deletedAt: null }
    });

    console.log(`Total Messages: ${totalMessages}`);
    console.log(`Unread Messages: ${unreadMessages}`);
    console.log(`Pending Messages: ${pendingMessages}`);

    // Check Graham's unread messages
    console.log('\n--- Graham\'s Unread Messages ---');
    const grahamUnread = await prisma.message.findMany({
      where: {
        toAgentId: graham.id,
        status: 'delivered',
        deletedAt: null
      },
      include: {
        fromAgent: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (grahamUnread.length === 0) {
      console.log('No unread messages for Graham\n');
    } else {
      grahamUnread.forEach(msg => {
        console.log(`From: ${msg.fromAgent.name}`);
        console.log(`Subject: ${msg.subject}`);
        console.log(`Created: ${msg.createdAt}`);
        console.log(`Status: ${msg.status}`);
        console.log('---');
      });
    }

  } catch (error) {
    console.error('Error checking message system:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessageSystemStatus();
