import { Queue } from "bullmq";

import { getRedis } from "./redis.js";

type EnqueueAgentTaskParams = {
  orgSlug: string;
  agentName: string;
  taskId: string;
  priority: number;
};

const queues = new Map<string, Queue>();

export function queueNameForTenant(orgSlug: string): string {
  return `gc-${orgSlug}-tasks`;
}

export function getTenantQueue(orgSlug: string): Queue {
  const existing = queues.get(orgSlug);
  if (existing) return existing;

  const queue = new Queue(queueNameForTenant(orgSlug), { connection: getRedis() });
  queues.set(orgSlug, queue);
  return queue;
}

export async function enqueueAgentTask(params: EnqueueAgentTaskParams) {
  const queue = getTenantQueue(params.orgSlug);
  await queue.add(
    "task",
    { taskId: params.taskId, orgSlug: params.orgSlug, agentName: params.agentName },
    {
      priority: params.priority,
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );
}

export async function closeAllQueues() {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}
