import { db } from "../db/index.js";
import { EventBus } from "./event-bus.js";

/**
 * Agent Scheduler Service
 *
 * Automatically wakes up agents when they receive messages or have pending work.
 * - Listens for new messages and triggers agent tasks
 * - Periodically checks for idle agents with unread messages
 */

const POLL_INTERVAL_MS = 60_000; // Check every minute for idle agents with work
let pollInterval: NodeJS.Timeout | null = null;

/**
 * Create a task for an agent to handle their inbox
 */
async function createInboxTask(agentId: string, agentName: string, triggerMessage?: string) {
  // Check if agent already has an active task
  const agent = await db.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || agent.status === "working" || agent.currentTaskId) {
    console.log(`[Scheduler] Agent ${agentName} is busy, will check later`);
    return null;
  }

  // Check if there's already a pending inbox task for this agent
  const existingTask = await db.task.findFirst({
    where: {
      agentId,
      status: { in: ["pending", "in_progress"] },
      title: { contains: "Handle inbox" },
    },
  });

  if (existingTask) {
    console.log(`[Scheduler] Agent ${agentName} already has inbox task pending`);
    return null;
  }

  // Count unread messages
  const unreadCount = await db.message.count({
    where: {
      toAgentId: agentId,
      readAt: null,
      deletedAt: null,
    },
  });

  if (unreadCount === 0) {
    return null;
  }

  console.log(`[Scheduler] Creating inbox task for ${agentName} (${unreadCount} unread messages)`);

  // Create task
  const task = await db.task.create({
    data: {
      agentId,
      createdById: agentId,
      title: `Handle inbox messages (${unreadCount} unread)`,
      description: `You have ${unreadCount} unread message(s) in your inbox.${triggerMessage ? `\n\nMost recent: "${triggerMessage}"` : ""}

**Instructions:**
1. Use check_inbox to read your messages
2. Respond thoughtfully to each message using send_message
3. If a message requires action (research, coding, etc.), either:
   - Complete the action if it's quick
   - Use report_progress to indicate you're working on it
4. If you need clarification, message the sender back

Prioritize urgent messages from Marcus (CEO).`,
      priority: "high",
      status: "pending",
    },
  });

  // Queue the task for execution
  EventBus.emit("task:queued", { agentId, task });

  console.log(`[Scheduler] Queued inbox task ${task.id} for ${agentName}`);
  return task;
}

/**
 * Handle new message event - wake up the recipient if idle
 */
async function onNewMessage(data: { toAgentId: string; message: any }) {
  const { toAgentId, message } = data;

  // Get recipient agent
  const recipient = await db.agent.findUnique({
    where: { id: toAgentId },
  });

  if (!recipient) {
    console.log(`[Scheduler] Recipient agent ${toAgentId} not found`);
    return;
  }

  console.log(`[Scheduler] New message for ${recipient.name}: "${message.subject}"`);

  // Small delay to let any current operations settle
  setTimeout(async () => {
    await createInboxTask(toAgentId, recipient.name, message.subject);
  }, 2000);
}

/**
 * Periodic check for idle agents with pending messages
 */
async function checkIdleAgentsWithMessages() {
  console.log("[Scheduler] Checking for idle agents with unread messages...");

  // Find all idle agents
  const idleAgents = await db.agent.findMany({
    where: {
      status: "idle",
      currentTaskId: null,
      deletedAt: null,
    },
  });

  for (const agent of idleAgents) {
    // Check for unread messages
    const unreadCount = await db.message.count({
      where: {
        toAgentId: agent.id,
        readAt: null,
        deletedAt: null,
      },
    });

    if (unreadCount > 0) {
      console.log(`[Scheduler] ${agent.name} has ${unreadCount} unread messages while idle`);
      await createInboxTask(agent.id, agent.name);
    }
  }
}

/**
 * Initialize the agent scheduler
 */
export function initializeAgentScheduler() {
  console.log("[Scheduler] Initializing agent scheduler...");

  // Listen for new messages
  EventBus.on("message:new", onNewMessage);

  // Start periodic check
  pollInterval = setInterval(checkIdleAgentsWithMessages, POLL_INTERVAL_MS);

  // Do an initial check
  setTimeout(checkIdleAgentsWithMessages, 5000);

  console.log("[Scheduler] Agent scheduler initialized");
}

/**
 * Shutdown the scheduler
 */
export function shutdownAgentScheduler() {
  console.log("[Scheduler] Shutting down agent scheduler...");

  EventBus.off("message:new", onNewMessage);

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  console.log("[Scheduler] Agent scheduler shut down");
}
