import { Queue } from "bullmq";

import { getRedis } from "./redis.js";

type EnqueueAgentTaskParams = {
  agentName: string;
  taskId: string;
  priority: number;
};

const queues = new Map<string, Queue>();

export function queueNameForAgent(agentName: string): string {
  return `gc:agent:${agentName}`;
}

export function getAgentQueue(agentName: string): Queue {
  const existing = queues.get(agentName);
  if (existing) return existing;

  const queue = new Queue(queueNameForAgent(agentName), { connection: getRedis() });
  queues.set(agentName, queue);
  return queue;
}

export async function enqueueAgentTask(params: EnqueueAgentTaskParams) {
  const queue = getAgentQueue(params.agentName);
  await queue.add(
    "task",
    { taskId: params.taskId },
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
