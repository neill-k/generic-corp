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
        messages: messages.map((m) => ({
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

/**
 * Get all available tools
 */
export const getAllTools = () => [
  filesystemReadTool,
  filesystemWriteTool,
  gitCommitTool,
  messagingSendTool,
  messagingCheckInboxTool,
  externalDraftTool,
];

/**
 * Get tools allowed for an agent based on their permissions
 */
export function getToolsForAgent(agent: Agent) {
  const allTools = getAllTools();
  const allowed: typeof allTools = [];

  // Check tool permissions
  for (const tool of allTools) {
    // Filesystem tools
    if (
      (tool.name === "filesystem_read" || tool.name === "filesystem_write") &&
      agent.toolPermissions["Read"]
    ) {
      allowed.push(tool);
    }
    // Git tools
    else if (tool.name === "git_commit" && agent.toolPermissions["Write"]) {
      allowed.push(tool);
    }
    // Messaging tools (all agents can use)
    else if (
      tool.name === "messaging_send" ||
      tool.name === "messaging_check_inbox"
    ) {
      allowed.push(tool);
    }
    // External draft (only specific agents)
    else if (
      tool.name === "external_draft" &&
      (agent.name.toLowerCase().includes("frankie") ||
        agent.name.toLowerCase().includes("kenji") ||
        agent.name.toLowerCase().includes("helen"))
    ) {
      allowed.push(tool);
    }
  }

  return allowed;
}
