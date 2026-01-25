import { db } from "../../db/index.js";
import { EventBus } from "../../services/event-bus.js";

/**
 * List all agents with their status and capabilities
 */
export async function agentList(params: {
  status?: "idle" | "working" | "blocked" | "offline";
}): Promise<{
  agents: Array<{
    id: string;
    name: string;
    role: string;
    status: string;
    capabilities: string[];
    currentTaskId: string | null;
  }>;
}> {
  const whereClause: Record<string, unknown> = {
    deletedAt: null,
  };

  if (params.status) {
    whereClause.status = params.status;
  }

  const agents = await db.agent.findMany({
    where: whereClause,
    orderBy: { name: "asc" },
  });

  return {
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      status: a.status,
      capabilities: Array.isArray(a.capabilities) ? a.capabilities as string[] : [],
      currentTaskId: a.currentTaskId,
    })),
  };
}

/**
 * Get details of a specific agent
 */
export async function agentGet(params: {
  agentId: string;
}): Promise<{
  agent: {
    id: string;
    name: string;
    role: string;
    status: string;
    capabilities: string[];
    personalityPrompt: string;
    currentTaskId: string | null;
    recentTasks: Array<{
      id: string;
      title: string;
      status: string;
    }>;
  } | null;
}> {
  const agent = await db.agent.findUnique({
    where: { id: params.agentId },
    include: {
      assignedTasks: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true },
      },
    },
  });

  if (!agent || agent.deletedAt) {
    return { agent: null };
  }

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      capabilities: Array.isArray(agent.capabilities) ? agent.capabilities as string[] : [],
      personalityPrompt: agent.personalityPrompt,
      currentTaskId: agent.currentTaskId,
      recentTasks: agent.assignedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
      })),
    },
  };
}

/**
 * Get an agent's current workload and task queue
 */
export async function agentGetWorkload(params: {
  agentId: string;
}): Promise<{
  workload: {
    agentId: string;
    agentName: string;
    status: string;
    currentTask: { id: string; title: string; status: string } | null;
    pendingTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    completedToday: number;
    taskQueue: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
    }>;
  } | null;
}> {
  const agent = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  if (!agent || agent.deletedAt) {
    return { workload: null };
  }

  // Get task counts and current task
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [currentTask, pendingCount, inProgressCount, blockedCount, completedToday, taskQueue] =
    await Promise.all([
      // Fetch current task separately since Agent doesn't have a currentTask relation
      agent.currentTaskId
        ? db.task.findUnique({
            where: { id: agent.currentTaskId },
            select: { id: true, title: true, status: true },
          })
        : Promise.resolve(null),
      db.task.count({
        where: { agentId: params.agentId, status: "pending", deletedAt: null },
      }),
      db.task.count({
        where: { agentId: params.agentId, status: "in_progress", deletedAt: null },
      }),
      db.task.count({
        where: { agentId: params.agentId, status: "blocked", deletedAt: null },
      }),
      db.task.count({
        where: {
          agentId: params.agentId,
          status: "completed",
          completedAt: { gte: today },
        },
      }),
      db.task.findMany({
        where: {
          agentId: params.agentId,
          status: { in: ["pending", "in_progress", "blocked"] },
          deletedAt: null,
        },
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        take: 10,
        select: { id: true, title: true, priority: true, status: true },
      }),
    ]);

  return {
    workload: {
      agentId: agent.id,
      agentName: agent.name,
      status: agent.status,
      currentTask,
      pendingTasks: pendingCount,
      inProgressTasks: inProgressCount,
      blockedTasks: blockedCount,
      completedToday,
      taskQueue,
    },
  };
}

/**
 * Update an agent's status
 */
export async function agentUpdateStatus(
  params: {
    agentId: string;
    status: "idle" | "working" | "blocked" | "offline";
    statusMessage?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  const targetAgent = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  if (!targetAgent || targetAgent.deletedAt) {
    throw new Error(`Agent not found: ${params.agentId}`);
  }

  // Check permissions - only CEO can update other agents, or agent can update self
  const callingAgent = await db.agent.findUnique({
    where: { id: context.agentId },
    select: { role: true },
  });

  if (context.agentId !== params.agentId && callingAgent?.role !== "ceo") {
    throw new Error("Only CEO can update other agents' status");
  }

  const previousStatus = targetAgent.status;

  await db.agent.update({
    where: { id: params.agentId },
    data: {
      status: params.status,
      // Note: statusMessage is stored in details since Agent model doesn't have statusMessage field
    },
  });

  // Emit status change event
  EventBus.emit("agent:status", {
    agentId: params.agentId,
    status: params.status,
    previousStatus,
    newStatus: params.status,
    message: params.statusMessage,
  });

  // Log activity
  const logMessage = `${targetAgent.name} status changed from ${previousStatus} to ${params.status}${params.statusMessage ? `: ${params.statusMessage}` : ""}`;
  await db.activityLog.create({
    data: {
      action: "agent_status_change",
      agentId: context.agentId,
      details: { message: logMessage, previousStatus, newStatus: params.status },
    },
  });

  return {
    success: true,
    message: `Agent ${targetAgent.name} status updated to ${params.status}`,
  };
}

/**
 * Archive an agent (soft delete) - CEO only
 */
export async function agentArchive(
  params: {
    agentId: string;
    reason?: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  // Verify caller is CEO
  const caller = await db.agent.findUnique({
    where: { id: context.agentId },
    select: { role: true },
  });

  if (caller?.role !== "ceo") {
    throw new Error("Only CEO can archive agents");
  }

  const targetAgent = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  if (!targetAgent) {
    throw new Error(`Agent not found: ${params.agentId}`);
  }

  if (targetAgent.deletedAt) {
    throw new Error(`Agent ${targetAgent.name} is already archived`);
  }

  // Cannot archive yourself
  if (params.agentId === context.agentId) {
    throw new Error("Cannot archive yourself");
  }

  await db.agent.update({
    where: { id: params.agentId },
    data: {
      deletedAt: new Date(),
      status: "offline",
    },
  });

  // Log activity
  await db.activityLog.create({
    data: {
      action: "agent_archived",
      agentId: context.agentId,
      details: {
        archivedAgentId: params.agentId,
        archivedAgentName: targetAgent.name,
        reason: params.reason,
      },
    },
  });

  EventBus.emit("agent:status", {
    agentId: params.agentId,
    status: "offline",
    message: `Archived: ${params.reason || "No reason provided"}`,
  });

  return {
    success: true,
    message: `Agent ${targetAgent.name} has been archived`,
  };
}

/**
 * Restore an archived agent - CEO only
 */
export async function agentRestore(
  params: {
    agentId: string;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  // Verify caller is CEO
  const caller = await db.agent.findUnique({
    where: { id: context.agentId },
    select: { role: true },
  });

  if (caller?.role !== "ceo") {
    throw new Error("Only CEO can restore agents");
  }

  const targetAgent = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  if (!targetAgent) {
    throw new Error(`Agent not found: ${params.agentId}`);
  }

  if (!targetAgent.deletedAt) {
    throw new Error(`Agent ${targetAgent.name} is not archived`);
  }

  await db.agent.update({
    where: { id: params.agentId },
    data: {
      deletedAt: null,
      status: "idle",
    },
  });

  // Log activity
  await db.activityLog.create({
    data: {
      action: "agent_restored",
      agentId: context.agentId,
      details: {
        restoredAgentId: params.agentId,
        restoredAgentName: targetAgent.name,
      },
    },
  });

  EventBus.emit("agent:status", {
    agentId: params.agentId,
    status: "idle",
    message: "Restored from archive",
  });

  return {
    success: true,
    message: `Agent ${targetAgent.name} has been restored`,
  };
}
