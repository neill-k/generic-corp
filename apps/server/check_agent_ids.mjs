import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true
      }
    });

    console.log('All agents:');
    agents.forEach(agent => {
      console.log(`${agent.name}: ${agent.id}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
