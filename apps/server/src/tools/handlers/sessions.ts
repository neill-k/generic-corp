import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";

/**
 * List agent sessions
 */
export async function sessionList(params: {
  agentId?: string;
  status?: "active" | "completed" | "failed";
  limit?: number;
}): Promise<{
  sessions: Array<{
    id: string;
    agentId: string;
    agentName: string;
    taskId: string | null;
    status: string;
    startedAt: Date;
    endedAt: Date | null;
    tokensUsed: { input: number; output: number } | null;
  }>;
}> {
  const whereClause: Record<string, unknown> = {};

  if (params.agentId) {
    whereClause.agentId = params.agentId;
  }

  if (params.status) {
    whereClause.status = params.status;
  }

  const sessions = await db.agentSession.findMany({
    where: whereClause,
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { startedAt: "desc" },
    take: params.limit || 20,
  });

  return {
    sessions: sessions.map((s) => ({
      id: s.id,
      agentId: s.agentId,
      agentName: s.agent?.name || "Unknown",
      taskId: s.taskId,
      status: s.status,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      tokensUsed: s.tokensUsed as { input: number; output: number } | null,
    })),
  };
}

/**
 * Get details of a specific session
 */
export async function sessionGet(params: {
  sessionId: string;
}): Promise<{
  session: {
    id: string;
    agentId: string;
    agentName: string;
    taskId: string | null;
    taskTitle: string | null;
    status: string;
    startedAt: Date;
    endedAt: Date | null;
    tokensUsed: { input: number; output: number } | null;
    toolCalls: string[];
  } | null;
}> {
  const session = await db.agentSession.findUnique({
    where: { id: params.sessionId },
    include: {
      agent: { select: { name: true } },
    },
  });

  if (!session) {
    return { session: null };
  }

  // Fetch task title separately since AgentSession doesn't have a task relation
  let taskTitle: string | null = null;
  if (session.taskId) {
    const task = await db.task.findUnique({
      where: { id: session.taskId },
      select: { title: true },
    });
    taskTitle = task?.title || null;
  }

  return {
    session: {
      id: session.id,
      agentId: session.agentId,
      agentName: session.agent?.name || "Unknown",
      taskId: session.taskId,
      taskTitle,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      tokensUsed: session.tokensUsed as { input: number; output: number } | null,
      toolCalls: Array.isArray(session.toolCalls) ? session.toolCalls as string[] : [],
    },
  };
}

/**
 * Update session with EventBus emission (fixes silent action)
 */
export async function sessionComplete(
  params: {
    sessionId: string;
    status: "completed" | "failed";
    tokensUsed?: { input: number; output: number };
    toolCalls?: string[];
  },
  context: { agentId: string }
): Promise<{ success: boolean }> {
  await db.agentSession.update({
    where: { id: params.sessionId },
    data: {
      status: params.status,
      endedAt: new Date(),
      tokensUsed: params.tokensUsed,
      toolCalls: params.toolCalls,
    },
  });

  // FIXED: Emit event for UI Integration (was missing - silent action)
  EventBus.emit("agent:session-completed", {
    agentId: context.agentId,
    sessionId: params.sessionId,
    status: params.status,
    tokensUsed: params.tokensUsed,
  });

  return { success: true };
}
