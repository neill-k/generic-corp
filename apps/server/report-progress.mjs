import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find the task about Sable's message
    const task = await prisma.task.findFirst({
      where: {
        OR: [
          { title: { contains: 'Sable Chen', mode: 'insensitive' } },
          { title: { contains: 'Landing Page', mode: 'insensitive' } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    if (task) {
      console.log('Found task:', task.title);
      console.log('Status:', task.status);
      console.log('Priority:', task.priority);
      
      // Update task with progress
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'in_progress',
          progress: 75
        }
      });
      
      console.log('\n✓ Task updated to 75% progress');
      
      // Add activity log
      await prisma.activityLog.create({
        data: {
          taskId: task.id,
          actionType: 'progress_update',
          description: 'Landing page initiative coordinated - team messages sent, requirements doc created, awaiting team responses',
          metadata: {
            progress: 75,
            documents_created: [
              'docs/landing-page-technical-requirements.md',
              'docs/landing-page-response-to-sable.md',
              'docs/landing-page-initiative-summary.md'
            ],
            messages_sent: [
              'Sable Chen - Technical validation request',
              'DeVonte Jackson - Development timeline request',
              'Yuki Tanaka - Infrastructure planning request',
              'Graham Sutton - Analytics and market research'
            ],
            next_steps: [
              'Await team responses (24 hours)',
              'Finalize technical messaging',
              'Begin landing page development'
            ]
          }
        }
      });
      
      console.log('✓ Activity log created');
      
    } else {
      console.log('Task not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
