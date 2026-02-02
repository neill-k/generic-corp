import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find Yuki's current task
    const yuki = await prisma.agent.findFirst({
      where: { name: { contains: 'Yuki Tanaka', mode: 'insensitive' } }
    });

    if (!yuki) {
      console.log('Yuki not found');
      return;
    }

    // Find the infrastructure assessment task
    const task = await prisma.task.findFirst({
      where: {
        OR: [
          { title: { contains: 'Infrastructure Assessment', mode: 'insensitive' } },
          { title: { contains: 'Marcus Bell', mode: 'insensitive' } }
        ],
        agentId: yuki.id
      },
      orderBy: { createdAt: 'desc' }
    });

    if (task) {
      console.log('Found task:', task.title);
      console.log('Current status:', task.status);
      console.log('Priority:', task.priority);

      // Update task as completed
      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'completed',
          progressPercent: 100,
          completedAt: new Date()
        }
      });

      console.log('\n✓ Task marked as completed (100% progress)');

      // Add activity log
      await prisma.activityLog.create({
        data: {
          agentId: yuki.id,
          taskId: task.id,
          action: 'Infrastructure assessment complete - comprehensive summary sent to CEO',
          details: {
            progress: 100,
            status: 'completed',
            deliverables: [
              'Infrastructure readiness assessment (32KB comprehensive)',
              'Cost economics analysis (85-95% margins validated)',
              'Week 1 execution plan documented',
              'Analytics infrastructure coordination (Graham)',
              'Multi-tenant architecture review scheduled (Sable)',
              'Landing page deployment support (DeVonte)',
              'Risk assessment and mitigation strategies',
              'Resource requirements and timeline'
            ],
            key_findings: [
              'Infrastructure 80% complete, 10-14 days to production',
              'Excellent SaaS economics: $0.60-7/customer at scale',
              'Can handle 100x growth with current architecture',
              'No technical blockers - success depends on GTM execution',
              'DNS access needed for demo subdomain deployment'
            ],
            message_sent: {
              to: 'Marcus Bell',
              subject: 'RE: Week 1 Priority - Infrastructure Assessment Complete',
              type: 'comprehensive_summary'
            },
            next_priorities: [
              'Monday 9 AM: Graham analytics infrastructure sync',
              'Monday 2 PM PT: Sable architecture review (90 min)',
              'This week: DeVonte landing page deployment support',
              'By Friday: Demo environment operational'
            ]
          }
        }
      });

      console.log('✓ Activity log created');
      console.log('\n📊 Summary:');
      console.log('- Infrastructure assessment: COMPLETE ✅');
      console.log('- Message to Marcus: SENT ✅');
      console.log('- Status: Ready for Week 1 execution ✅');
      console.log('- Blocker: DNS access for demo.genericcorp.com ⏳');

    } else {
      console.log('Task not found - no update needed');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
