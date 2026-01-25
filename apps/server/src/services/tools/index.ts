import { z } from "zod";
import { promises as fs } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { MessageService } from "../message-service.js";
import { validatePath } from "../security.js";
import { db } from "../../db/index.js";
import type { Agent } from "@generic-corp/shared";

const execAsync = promisify(exec);

/**
 * Tool definitions for Claude Agent SDK
 * These tools can be used by agents to interact with the system
 */

export interface ToolContext {
  agentId: string;
  agentName: string;
  taskId?: string;
}

/**
 * Filesystem read tool
 */
export const filesystemReadTool = {
  name: "filesystem_read",
  description: "Read the contents of a file",
  inputSchema: z.object({
    path: z.string().describe("File path to read"),
  }),
  execute: async (input: { path: string }, _context: ToolContext) => {
    if (!validatePath(input.path)) {
      throw new Error(`Path ${input.path} is not in an allowed directory`);
    }

    try {
      const content = await fs.readFile(input.path, "utf-8");
      return {
        success: true,
        content,
        message: `Read ${input.path} (${content.length} characters)`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * Filesystem write tool
 */
export const filesystemWriteTool = {
  name: "filesystem_write",
  description: "Write content to a file",
  inputSchema: z.object({
    path: z.string().describe("File path to write to"),
    content: z.string().describe("Content to write"),
  }),
  execute: async (
    input: { path: string; content: string },
    _context: ToolContext
  ) => {
    if (!validatePath(input.path)) {
      throw new Error(`Path ${input.path} is not in an allowed directory`);
    }

    try {
      await fs.writeFile(input.path, input.content, "utf-8");
      return {
        success: true,
        message: `Written to ${input.path}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * Git commit tool (agents work on their own branches)
 */
export const gitCommitTool = {
  name: "git_commit",
  description: "Commit changes to git (on agent's branch)",
  inputSchema: z.object({
    message: z.string().describe("Commit message"),
    files: z.array(z.string()).describe("Files to commit"),
  }),
  execute: async (
    input: { message: string; files: string[] },
    context: ToolContext
  ) => {
    try {
      // Sanitize branch name to prevent injection
      const branchName = context.agentName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const branch = `agent/${branchName}`;

      // Checkout/create branch (branch name is sanitized, safe to use)
      try {
        await execAsync(`git checkout ${branch}`);
      } catch {
        await execAsync(`git checkout -b ${branch}`);
      }

      // Add files - validate and escape each file path
      for (const file of input.files) {
        if (validatePath(file)) {
          // Use -- to prevent argument injection
          // Escape single quotes by replacing ' with '\''
          const escapedFile = file.replace(/'/g, "'\\''");
          await execAsync(`git add -- '${escapedFile}'`);
        }
      }

      // Commit - use environment variable to safely pass message (prevents injection)
      // This is safer than trying to escape shell special characters
      const env = { ...process.env, GIT_COMMIT_MESSAGE: input.message };
      await execAsync(`git commit -m "$GIT_COMMIT_MESSAGE"`, { env });

      return {
        success: true,
        message: `Committed ${input.files.length} file(s) to branch ${branch}`,
        branch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * Internal messaging tool
 */
export const messagingSendTool = {
  name: "messaging_send",
  description: "Send a message to another team member",
  inputSchema: z.object({
    to: z.string().describe("Recipient agent name (e.g., 'Sable Chen', 'DeVonte Jackson')"),
    subject: z.string().describe("Brief subject line"),
    body: z.string().describe("Message content"),
  }),
  execute: async (
    input: { to: string; subject: string; body: string },
    context: ToolContext
  ) => {
    try {
      // Find recipient agent
      const recipient = await db.agent.findFirst({
        where: {
          name: { contains: input.to, mode: "insensitive" },
          deletedAt: null,
        },
      });

      if (!recipient) {
        return {
          success: false,
          error: `Agent "${input.to}" not found`,
        };
      }

      const message = await MessageService.send({
        fromAgentId: context.agentId,
        toAgentId: recipient.id,
        subject: input.subject,
        body: input.body,
        type: "direct",
      });

      return {
        success: true,
        messageId: message.id,
        message: `Message sent to ${input.to}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * Check inbox tool
 */
export const messagingCheckInboxTool = {
  name: "messaging_check_inbox",
  description: "Check your inbox for unread messages from team members",
  inputSchema: z.object({}),
  execute: async (_input: {}, context: ToolContext) => {
    try {
      const messages = await MessageService.getUnread(context.agentId);

      if (messages.length === 0) {
        return {
          success: true,
          count: 0,
          message: "No unread messages",
          messages: [],
        };
      }

      return {
        success: true,
        count: messages.length,
        messages: messages.map((m: { fromAgent?: { name: string }; subject: string; body: string; createdAt: Date }) => ({
          from: m.fromAgent?.name || "Unknown",
          subject: m.subject,
          body: m.body,
          createdAt: m.createdAt,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

/**
 * External draft tool (requires approval)
 */
export const externalDraftTool = {
  name: "external_draft",
  description:
    "Draft an email to be sent externally. IMPORTANT: This only creates a draft - the CEO (player) must approve before sending.",
  inputSchema: z.object({
    recipient: z.string().email().describe("External email address"),
    subject: z.string().describe("Email subject"),
    body: z.string().describe("Email body"),
  }),
  execute: async (
    input: { recipient: string; subject: string; body: string },
    context: ToolContext
  ) => {
    try {
      const draft = await MessageService.createDraft({
        fromAgentId: context.agentId,
        externalRecipient: input.recipient,
        subject: input.subject,
        body: input.body,
      });

      return {
        success: true,
        draftId: draft.id,
        message:
          "Draft created and sent to CEO for approval. The email will NOT be sent until approved.",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
};

// Import new handlers
import * as taskHandlers from "../../tools/handlers/tasks.js";
import * as messagingHandlers from "../../tools/handlers/messaging.js";
import * as agentHandlers from "../../tools/handlers/agents.js";
import * as activityHandlers from "../../tools/handlers/activity.js";
import * as budgetHandlers from "../../tools/handlers/budget.js";
import * as scheduleHandlers from "../../tools/handlers/schedules.js";
import * as sessionHandlers from "../../tools/handlers/sessions.js";
import * as helpHandlers from "../../tools/handlers/help.js";
import * as workspaceHandlers from "../../tools/handlers/workspace.js";
import * as configHandlers from "../../tools/handlers/config.js";

/**
 * Task tools
 */
export const taskGetTool = {
  name: "task_get",
  description: "Get details of a specific task by ID",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to retrieve"),
  }),
  execute: async (input: { taskId: string }, _context: ToolContext) => {
    return taskHandlers.taskGet(input);
  },
};

export const taskListTool = {
  name: "task_list",
  description: "List tasks with optional filters",
  inputSchema: z.object({
    status: z.string().optional().describe("Filter by task status"),
    agentId: z.string().optional().describe("Filter by assigned agent ID"),
    limit: z.number().optional().describe("Maximum number of tasks to return"),
  }),
  execute: async (input: { status?: string; agentId?: string; limit?: number }, _context: ToolContext) => {
    return taskHandlers.taskList(input);
  },
};

export const taskCreateTool = {
  name: "task_create",
  description: "Create a new task and assign it to an agent",
  inputSchema: z.object({
    title: z.string().describe("Task title"),
    description: z.string().describe("Task description"),
    assigneeId: z.string().describe("ID of the agent to assign the task to"),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional().describe("Task priority"),
    acceptanceCriteria: z.array(z.string()).optional().describe("List of acceptance criteria"),
  }),
  execute: async (input: any, context: ToolContext) => {
    return taskHandlers.taskCreate(input, context);
  },
};

export const taskUpdateTool = {
  name: "task_update",
  description: "Update a task's details (title, description, priority, status)",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to update"),
    title: z.string().optional().describe("New task title"),
    description: z.string().optional().describe("New task description"),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional().describe("New task priority"),
    status: z.enum(["pending", "in_progress", "completed", "failed", "blocked", "cancelled"]).optional().describe("New task status"),
  }),
  execute: async (input: any, context: ToolContext) => {
    return taskHandlers.taskUpdate(input, context);
  },
};

export const taskCancelTool = {
  name: "task_cancel",
  description: "Cancel a pending or in-progress task",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to cancel"),
    reason: z.string().optional().describe("Reason for cancellation"),
  }),
  execute: async (input: { taskId: string; reason?: string }, context: ToolContext) => {
    return taskHandlers.taskCancel(input, context);
  },
};

export const taskRetryTool = {
  name: "task_retry",
  description: "Retry a failed task",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the failed task to retry"),
  }),
  execute: async (input: { taskId: string }, context: ToolContext) => {
    return taskHandlers.taskRetry(input, context);
  },
};

export const taskAddDependencyTool = {
  name: "task_add_dependency",
  description: "Add a dependency between tasks",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task that depends on another"),
    dependsOnTaskId: z.string().describe("The ID of the task that must complete first"),
  }),
  execute: async (input: { taskId: string; dependsOnTaskId: string }, context: ToolContext) => {
    return taskHandlers.taskAddDependency(input, context);
  },
};

export const taskRemoveDependencyTool = {
  name: "task_remove_dependency",
  description: "Remove a dependency between tasks",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task"),
    dependsOnTaskId: z.string().describe("The ID of the dependency to remove"),
  }),
  execute: async (input: { taskId: string; dependsOnTaskId: string }, context: ToolContext) => {
    return taskHandlers.taskRemoveDependency(input, context);
  },
};

export const taskListDependenciesTool = {
  name: "task_list_dependencies",
  description: "List all dependencies for a task",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task"),
  }),
  execute: async (input: { taskId: string }, _context: ToolContext) => {
    return taskHandlers.taskListDependencies(input);
  },
};

/**
 * Message tools
 */
export const messageMarkReadTool = {
  name: "message_mark_read",
  description: "Mark a message as read",
  inputSchema: z.object({
    messageId: z.string().describe("The ID of the message to mark as read"),
  }),
  execute: async (input: { messageId: string }, context: ToolContext) => {
    return messagingHandlers.messageMarkRead({ messageIds: [input.messageId] }, context);
  },
};

export const messageReplyTool = {
  name: "message_reply",
  description: "Reply to a message",
  inputSchema: z.object({
    messageId: z.string().describe("The ID of the message to reply to"),
    body: z.string().describe("Reply message body"),
  }),
  execute: async (input: { messageId: string; body: string }, context: ToolContext) => {
    return messagingHandlers.messageReply(input, context);
  },
};

export const messageDeleteTool = {
  name: "message_delete",
  description: "Delete a message",
  inputSchema: z.object({
    messageId: z.string().describe("The ID of the message to delete"),
  }),
  execute: async (input: { messageId: string }, context: ToolContext) => {
    return messagingHandlers.messageDelete(input, context);
  },
};

/**
 * Draft tools
 */
export const draftApproveTool = {
  name: "draft_approve",
  description: "Approve an external draft for sending (CEO action)",
  inputSchema: z.object({
    draftId: z.string().describe("The ID of the draft to approve"),
  }),
  execute: async (input: { draftId: string }, context: ToolContext) => {
    return messagingHandlers.draftApprove(input, context);
  },
};

export const draftRejectTool = {
  name: "draft_reject",
  description: "Reject an external draft (CEO action)",
  inputSchema: z.object({
    draftId: z.string().describe("The ID of the draft to reject"),
    reason: z.string().optional().describe("Reason for rejection"),
  }),
  execute: async (input: { draftId: string; reason?: string }, context: ToolContext) => {
    return messagingHandlers.draftReject(input, context);
  },
};

export const draftListTool = {
  name: "draft_list",
  description: "List pending drafts awaiting approval",
  inputSchema: z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional().describe("Filter by draft status"),
  }),
  execute: async (input: { status?: "pending" | "approved" | "rejected" }, _context: ToolContext) => {
    return messagingHandlers.draftList(input);
  },
};

/**
 * Agent tools
 */
export const agentListTool = {
  name: "agent_list",
  description: "List all agents with their status and capabilities",
  inputSchema: z.object({
    status: z.enum(["idle", "working", "blocked", "offline"]).optional().describe("Filter by agent status"),
  }),
  execute: async (input: { status?: "idle" | "working" | "blocked" | "offline" }, _context: ToolContext) => {
    return agentHandlers.agentList(input);
  },
};

export const agentGetTool = {
  name: "agent_get",
  description: "Get details of a specific agent",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent"),
  }),
  execute: async (input: { agentId: string }, _context: ToolContext) => {
    return agentHandlers.agentGet(input);
  },
};

export const agentGetWorkloadTool = {
  name: "agent_get_workload",
  description: "Get an agent's current workload and task queue",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent"),
  }),
  execute: async (input: { agentId: string }, _context: ToolContext) => {
    return agentHandlers.agentGetWorkload(input);
  },
};

/**
 * Activity log tool
 */
export const activityLogTool = {
  name: "activity_log",
  description: "Query the activity log for recent events",
  inputSchema: z.object({
    agentId: z.string().optional().describe("Filter by agent ID"),
    eventType: z.string().optional().describe("Filter by event type"),
    limit: z.number().optional().describe("Maximum number of events to return"),
  }),
  execute: async (input: { agentId?: string; eventType?: string; limit?: number }, _context: ToolContext) => {
    return activityHandlers.activityLog(input);
  },
};

/**
 * Budget tool
 */
export const budgetGetTool = {
  name: "budget_get",
  description: "Get current budget information",
  inputSchema: z.object({}),
  execute: async (_input: {}, _context: ToolContext) => {
    return budgetHandlers.budgetGet();
  },
};

/**
 * Schedule tools
 */
export const scheduleCreateTool = {
  name: "schedule_create",
  description: "Create a scheduled task",
  inputSchema: z.object({
    name: z.string().describe("Name of the scheduled task"),
    cronExpression: z.string().describe("Cron expression for scheduling"),
    taskTemplate: z.object({
      title: z.string(),
      description: z.string().optional(),
      assigneeId: z.string(),
      priority: z.string().optional(),
    }).describe("Task template to create when schedule triggers"),
  }),
  execute: async (input: any, context: ToolContext) => {
    return scheduleHandlers.scheduleCreate(input, context);
  },
};

export const scheduleListTool = {
  name: "schedule_list",
  description: "List all scheduled tasks",
  inputSchema: z.object({
    enabled: z.boolean().optional().describe("Filter by enabled status"),
  }),
  execute: async (input: { enabled?: boolean }, _context: ToolContext) => {
    return scheduleHandlers.scheduleList(input);
  },
};

export const scheduleUpdateTool = {
  name: "schedule_update",
  description: "Update a scheduled task",
  inputSchema: z.object({
    scheduleId: z.string().describe("The ID of the schedule to update"),
    enabled: z.boolean().optional().describe("Enable or disable the schedule"),
    cronExpression: z.string().optional().describe("New cron expression"),
  }),
  execute: async (input: any, context: ToolContext) => {
    return scheduleHandlers.scheduleUpdate(input, context);
  },
};

export const scheduleDeleteTool = {
  name: "schedule_delete",
  description: "Delete a scheduled task",
  inputSchema: z.object({
    scheduleId: z.string().describe("The ID of the schedule to delete"),
  }),
  execute: async (input: { scheduleId: string }, context: ToolContext) => {
    return scheduleHandlers.scheduleDelete(input, context);
  },
};

/**
 * Session tools
 */
export const sessionListTool = {
  name: "session_list",
  description: "List agent sessions",
  inputSchema: z.object({
    agentId: z.string().optional().describe("Filter by agent ID"),
    status: z.enum(["active", "completed", "failed"]).optional().describe("Filter by session status"),
    limit: z.number().optional().describe("Maximum number of sessions to return"),
  }),
  execute: async (input: { agentId?: string; status?: "active" | "completed" | "failed"; limit?: number }, _context: ToolContext) => {
    return sessionHandlers.sessionList(input);
  },
};

export const sessionGetTool = {
  name: "session_get",
  description: "Get details of a specific session",
  inputSchema: z.object({
    sessionId: z.string().describe("The ID of the session"),
  }),
  execute: async (input: { sessionId: string }, _context: ToolContext) => {
    return sessionHandlers.sessionGet(input);
  },
};

/**
 * Help tools (Capability Discovery)
 */
export const helpTool = {
  name: "help",
  description: "Get help about available tools and capabilities",
  inputSchema: z.object({
    topic: z.string().optional().describe("Specific topic to get help on (e.g., 'tasks', 'messages', 'agents')"),
  }),
  execute: async (input: { topic?: string }, context: ToolContext) => {
    return helpHandlers.help(input, context);
  },
};

export const capabilitiesListTool = {
  name: "capabilities_list",
  description: "List all available capabilities and tools for the current agent",
  inputSchema: z.object({}),
  execute: async (_input: {}, context: ToolContext) => {
    return helpHandlers.capabilitiesList({}, context);
  },
};

/**
 * Task reassignment tool (Action Parity)
 */
export const taskReassignTool = {
  name: "task_reassign",
  description: "Reassign a task to a different agent",
  inputSchema: z.object({
    taskId: z.string().describe("The ID of the task to reassign"),
    newAgentId: z.string().describe("The ID of the agent to assign the task to"),
    reason: z.string().optional().describe("Reason for reassignment"),
  }),
  execute: async (input: { taskId: string; newAgentId: string; reason?: string }, context: ToolContext) => {
    return taskHandlers.taskReassign(input, context);
  },
};

/**
 * Draft update tool (CRUD Completeness)
 */
export const draftUpdateTool = {
  name: "draft_update",
  description: "Update a pending external draft before approval",
  inputSchema: z.object({
    draftId: z.string().describe("The ID of the draft to update"),
    subject: z.string().optional().describe("Updated subject line"),
    body: z.string().optional().describe("Updated email body"),
  }),
  execute: async (input: { draftId: string; subject?: string; body?: string }, context: ToolContext) => {
    return messagingHandlers.draftUpdate(input, context);
  },
};

/**
 * Agent status update tool (Action Parity)
 */
export const agentUpdateStatusTool = {
  name: "agent_update_status",
  description: "Update an agent's status (requires appropriate permissions)",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent to update"),
    status: z.enum(["idle", "working", "blocked", "offline"]).describe("New status"),
    statusMessage: z.string().optional().describe("Optional status message"),
  }),
  execute: async (input: { agentId: string; status: "idle" | "working" | "blocked" | "offline"; statusMessage?: string }, context: ToolContext) => {
    return agentHandlers.agentUpdateStatus(input, context);
  },
};

/**
 * Agent archive tool (CRUD Completeness - Delete)
 */
export const agentArchiveTool = {
  name: "agent_archive",
  description: "Archive an agent (soft delete). CEO only.",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent to archive"),
    reason: z.string().optional().describe("Reason for archiving"),
  }),
  execute: async (input: { agentId: string; reason?: string }, context: ToolContext) => {
    return agentHandlers.agentArchive(input, context);
  },
};

/**
 * Agent restore tool (CRUD Completeness)
 */
export const agentRestoreTool = {
  name: "agent_restore",
  description: "Restore an archived agent. CEO only.",
  inputSchema: z.object({
    agentId: z.string().describe("The ID of the agent to restore"),
  }),
  execute: async (input: { agentId: string }, context: ToolContext) => {
    return agentHandlers.agentRestore(input, context);
  },
};

/**
 * Store set tool (Atomic Primitives - Key-Value Store)
 */
export const storeSetTool = {
  name: "store_set",
  description: "Store a key-value pair in agent memory",
  inputSchema: z.object({
    key: z.string().describe("The key to store"),
    value: z.string().describe("The value to store"),
    namespace: z.string().optional().describe("Optional namespace (defaults to agent ID)"),
  }),
  execute: async (input: { key: string; value: string; namespace?: string }, context: ToolContext) => {
    return workspaceHandlers.storeSet(input, context);
  },
};

/**
 * Store get tool (Atomic Primitives)
 */
export const storeGetTool = {
  name: "store_get",
  description: "Retrieve a value from agent memory by key",
  inputSchema: z.object({
    key: z.string().describe("The key to retrieve"),
    namespace: z.string().optional().describe("Optional namespace"),
  }),
  execute: async (input: { key: string; namespace?: string }, context: ToolContext) => {
    return workspaceHandlers.storeGet(input, context);
  },
};

/**
 * Store delete tool (Atomic Primitives)
 */
export const storeDeleteTool = {
  name: "store_delete",
  description: "Delete a key from agent memory",
  inputSchema: z.object({
    key: z.string().describe("The key to delete"),
    namespace: z.string().optional().describe("Optional namespace"),
  }),
  execute: async (input: { key: string; namespace?: string }, context: ToolContext) => {
    return workspaceHandlers.storeDelete(input, context);
  },
};

/**
 * Store list tool (Atomic Primitives)
 */
export const storeListTool = {
  name: "store_list",
  description: "List all keys in agent memory",
  inputSchema: z.object({
    namespace: z.string().optional().describe("Optional namespace filter"),
  }),
  execute: async (input: { namespace?: string }, context: ToolContext) => {
    return workspaceHandlers.storeList(input, context);
  },
};

/**
 * Context read tool (Shared Workspace)
 */
export const contextReadTool = {
  name: "context_read",
  description: "Read the shared workspace context file containing team learnings and decisions",
  inputSchema: z.object({}),
  execute: async (_input: Record<string, never>, context: ToolContext) => {
    return workspaceHandlers.contextRead({}, context);
  },
};

/**
 * Context write tool (Shared Workspace)
 */
export const contextWriteTool = {
  name: "context_write",
  description: "Append information to the shared workspace context",
  inputSchema: z.object({
    content: z.string().describe("Content to append"),
    section: z.enum(["learnings", "decisions", "blockers", "notes"]).optional().describe("Section to append to"),
  }),
  execute: async (input: { content: string; section?: "learnings" | "decisions" | "blockers" | "notes" }, context: ToolContext) => {
    return workspaceHandlers.contextWrite(input, context);
  },
};

/**
 * Refresh context tool (Context Injection)
 */
export const refreshContextTool = {
  name: "refresh_context",
  description: "Request updated context information (budget, team, activity, dependencies)",
  inputSchema: z.object({
    include: z.array(z.enum(["budget", "team", "activity", "dependencies"])).optional().describe("Specific context to include"),
  }),
  execute: async (input: { include?: ("budget" | "team" | "activity" | "dependencies")[] }, context: ToolContext) => {
    return workspaceHandlers.refreshContext(input, context);
  },
};

/**
 * Config get permissions tool (Prompt-Native)
 */
export const configGetPermissionsTool = {
  name: "config_get_permissions",
  description: "Get tool permissions for a role",
  inputSchema: z.object({
    role: z.string().describe("The role to get permissions for"),
  }),
  execute: async (input: { role: string }, _context: ToolContext) => {
    return configHandlers.configGetPermissions(input);
  },
};

/**
 * Config get status transitions tool (Prompt-Native)
 */
export const configGetStatusTransitionsTool = {
  name: "config_get_status_transitions",
  description: "Get valid task status transitions",
  inputSchema: z.object({}),
  execute: async (_input: Record<string, never>, _context: ToolContext) => {
    return configHandlers.configGetStatusTransitions();
  },
};

/**
 * Config get workflow tool (Prompt-Native)
 */
export const configGetWorkflowTool = {
  name: "config_get_workflow",
  description: "Get workflow configuration for a process",
  inputSchema: z.object({
    workflow: z.string().describe("The workflow to get (e.g., 'draft_approval', 'task_assignment')"),
  }),
  execute: async (input: { workflow: string }, _context: ToolContext) => {
    return configHandlers.configGetWorkflow(input);
  },
};

/**
 * Config update agent tool (Prompt-Native - CEO only)
 */
export const configUpdateAgentTool = {
  name: "config_update_agent",
  description: "Update an agent's capabilities or tool permissions (CEO only)",
  inputSchema: z.object({
    agentId: z.string().describe("The agent to update"),
    capabilities: z.array(z.string()).optional().describe("New capabilities array"),
    toolPermissions: z.record(z.boolean()).optional().describe("Tool permission overrides"),
  }),
  execute: async (input: { agentId: string; capabilities?: string[]; toolPermissions?: Record<string, boolean> }, context: ToolContext) => {
    return configHandlers.configUpdateAgent(input, context);
  },
};

/**
 * Prompt template get tool (Prompt-Native)
 */
export const promptTemplateGetTool = {
  name: "prompt_template_get",
  description: "Get a prompt template by name",
  inputSchema: z.object({
    templateName: z.string().describe("Name of the template"),
  }),
  execute: async (input: { templateName: string }, _context: ToolContext) => {
    return configHandlers.promptTemplateGet(input);
  },
};

/**
 * Prompt template list tool (Prompt-Native)
 */
export const promptTemplateListTool = {
  name: "prompt_template_list",
  description: "List all available prompt templates",
  inputSchema: z.object({}),
  execute: async (_input: Record<string, never>, _context: ToolContext) => {
    return configHandlers.promptTemplateList();
  },
};

/**
 * Suggest tool (Capability Discovery)
 */
export const suggestToolTool = {
  name: "suggest_tool",
  description: "Get suggestions for which tool to use based on your goal",
  inputSchema: z.object({
    goal: z.string().describe("Describe what you're trying to accomplish"),
  }),
  execute: async (input: { goal: string }, context: ToolContext) => {
    return helpHandlers.suggestTool(input, context);
  },
};

/**
 * Schedule get tool (CRUD Completeness - Read single)
 */
export const scheduleGetTool = {
  name: "schedule_get",
  description: "Get details of a specific schedule",
  inputSchema: z.object({
    scheduleId: z.string().describe("The ID of the schedule"),
  }),
  execute: async (input: { scheduleId: string }, _context: ToolContext) => {
    return scheduleHandlers.scheduleGet(input);
  },
};

/**
 * Get all available tools
 */
export const getAllTools = () => [
  // Original tools
  filesystemReadTool,
  filesystemWriteTool,
  gitCommitTool,
  messagingSendTool,
  messagingCheckInboxTool,
  externalDraftTool,
  // Task CRUD tools
  taskGetTool,
  taskListTool,
  taskCreateTool,
  taskUpdateTool,
  taskCancelTool,
  taskRetryTool,
  taskReassignTool,
  // Task dependency tools
  taskAddDependencyTool,
  taskRemoveDependencyTool,
  taskListDependenciesTool,
  // Message tools
  messageMarkReadTool,
  messageReplyTool,
  messageDeleteTool,
  // Draft tools
  draftApproveTool,
  draftRejectTool,
  draftListTool,
  draftUpdateTool,
  // Agent tools
  agentListTool,
  agentGetTool,
  agentGetWorkloadTool,
  agentUpdateStatusTool,
  agentArchiveTool,
  agentRestoreTool,
  // Activity log
  activityLogTool,
  // Budget
  budgetGetTool,
  // Schedule tools
  scheduleCreateTool,
  scheduleListTool,
  scheduleGetTool,
  scheduleUpdateTool,
  scheduleDeleteTool,
  // Session tools
  sessionListTool,
  sessionGetTool,
  // Help tools
  helpTool,
  capabilitiesListTool,
  suggestToolTool,
  // Workspace tools (Shared Workspace & Key-Value Store)
  storeSetTool,
  storeGetTool,
  storeDeleteTool,
  storeListTool,
  contextReadTool,
  contextWriteTool,
  refreshContextTool,
  // Config tools (Prompt-Native Features)
  configGetPermissionsTool,
  configGetStatusTransitionsTool,
  configGetWorkflowTool,
  configUpdateAgentTool,
  promptTemplateGetTool,
  promptTemplateListTool,
];

/**
 * Get tools allowed for an agent based on their role and permissions
 *
 * NOTE: This uses role-based permissions from tools/definitions/index.ts
 * For a fully prompt-native architecture, these permissions should be
 * loaded from the database and/or defined in agent prompts.
 */
export function getToolsForAgent(agent: Agent) {
  const allTools = getAllTools();

  // Import role-based permissions from tool definitions
  const { toolPermissions } = require("../../tools/definitions/index.js");

  // Get role name normalized for lookup
  const role = agent.role?.toLowerCase().replace(/\s+/g, "_") || "default";
  const allowedToolNames: string[] = toolPermissions[role] || toolPermissions.default || [];

  // Filter tools based on role permissions
  const allowed = allTools.filter((tool) => {
    // Check if tool is in allowed list for role
    if (allowedToolNames.includes(tool.name)) {
      return true;
    }

    // Additional permission checks for specific tools
    // Filesystem tools require Read permission
    if (
      (tool.name === "filesystem_read" || tool.name === "filesystem_write" || tool.name === "filesystem_list") &&
      agent.toolPermissions["Read"]
    ) {
      return true;
    }

    // Git tools require Write permission
    if ((tool.name === "git_commit" || tool.name === "git_status") && agent.toolPermissions["Write"]) {
      return true;
    }

    // Shell tools require Bash permission
    if (tool.name === "shell_exec" && agent.toolPermissions["Bash"]) {
      return true;
    }

    // External draft - additional check for specific agents
    if (
      tool.name === "external_draft" &&
      (agent.name.toLowerCase().includes("frankie") ||
        agent.name.toLowerCase().includes("kenji") ||
        agent.name.toLowerCase().includes("helen"))
    ) {
      return true;
    }

    return false;
  });

  return allowed;
}
