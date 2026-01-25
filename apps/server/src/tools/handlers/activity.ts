import { db } from "../../db/index.js";

/**
 * Query the activity log for recent events
 */
export async function activityLog(params: {
  agentId?: string;
  eventType?: string;
  limit?: number;
}): Promise<{
  activities: Array<{
    id: string;
    agentId: string;
    agentName: string;
    action: string;
    details: Record<string, unknown>;
    taskId: string | null;
    timestamp: Date;
  }>;
}> {
  const whereClause: Record<string, unknown> = {};

  if (params.agentId) {
    whereClause.agentId = params.agentId;
  }

  if (params.eventType) {
    whereClause.action = params.eventType;
  }

  const activities = await db.activityLog.findMany({
    where: whereClause,
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { timestamp: "desc" },
    take: params.limit || 50,
  });

  return {
    activities: activities.map((a) => ({
      id: a.id,
      agentId: a.agentId,
      agentName: a.agent?.name || "Unknown",
      action: a.action,
      details: (a.details as Record<string, unknown>) || {},
      taskId: a.taskId,
      timestamp: a.timestamp,
    })),
  };
}
