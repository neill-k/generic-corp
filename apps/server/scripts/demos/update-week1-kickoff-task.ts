import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find the Week 1 Kickoff task
    const task = await prisma.task.findFirst({
      where: {
        title: { contains: 'Week 1 Kickoff', mode: 'insensitive' }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!task) {
      console.log('Week 1 Kickoff task not found');
      return;
    }

    console.log('Found task:', task.title);
    console.log('Current status:', task.status);

    // Update task to completed
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        progressPercent: 100,
        completedAt: new Date(),
        result: {
          action: 'Responded to Marcus Bell Week 1 Kickoff message',
          messagesSent: [
            {
              to: 'Marcus Bell',
              subject: 'RE: Week 1 Kickoff - All In & Ready to Ship 🚀',
              timestamp: new Date().toISOString()
            }
          ],
          summary: 'Comprehensive response sent acknowledging Week 1 mission, confirming deliverables, and committing to Wednesday landing page ship date with 100% confidence.',
          keyCommitments: [
            'Landing page live Wednesday at genericcorp.io',
            'Waitlist capture operational with ConvertKit',
            '30-50 waitlist signups target',
            'Demo environment Friday at demo.genericcorp.com',
            'Multi-tenant architecture planning with Sable'
          ],
          blockers: 'None - all blockers being addressed by Marcus (DNS) or scheduled (Sable review)'
        }
      }
    });

    console.log('\n✅ Task updated to completed');

    // Add activity log
    const devonte = await prisma.agent.findFirst({
      where: { name: { contains: 'DeVonte Jackson', mode: 'insensitive' } }
    });

    if (devonte) {
      await prisma.activityLog.create({
        data: {
          agentId: devonte.id,
          taskId: task.id,
          action: 'task_completed',
          details: {
            taskTitle: task.title,
            action: 'Responded to Marcus Bell Week 1 Kickoff',
            outcome: 'Comprehensive status update sent',
            deliverables: {
              messageSent: true,
              commitmentsMade: [
                'Wednesday landing page ship (100% confidence)',
                '30-50 waitlist signups Week 1',
                'Demo environment Friday',
                'Multi-tenant planning with Sable'
              ],
              nextSteps: [
                'Complete Sable\'s 4 landing page corrections (today)',
                'Deploy to staging for review',
                'Coordinate DNS with Yuki',
                'Ship to production Wednesday'
              ]
            }
          }
        }
      });

      console.log('✅ Activity log created');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
