import { Queue } from "bullmq";

import { getRedis } from "./redis.js";

type EnqueueAgentTaskParams = {
  orgSlug: string;
  agentName: string;
  taskId: string;
  priority: number;
};

const queues = new Map<string, Queue>();

export function queueNameForAgent(orgSlug: string, agentName: string): string {
  return `gc-${orgSlug}-agent-${agentName}`;
}

export function getAgentQueue(orgSlug: string, agentName: string): Queue {
  const cacheKey = `${orgSlug}:${agentName}`;
  const existing = queues.get(cacheKey);
  if (existing) return existing;

  const queue = new Queue(queueNameForAgent(orgSlug, agentName), { connection: getRedis() });
  queues.set(cacheKey, queue);
  return queue;
}

export async function enqueueAgentTask(params: EnqueueAgentTaskParams) {
  const queue = getAgentQueue(params.orgSlug, params.agentName);
  await queue.add(
    "task",
    { taskId: params.taskId, orgSlug: params.orgSlug },
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
