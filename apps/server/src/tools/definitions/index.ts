import Anthropic from "@anthropic-ai/sdk";

/**
 * Tool definitions in Anthropic.Tool[] format for use with Claude API
 */
export const toolDefinitions: Anthropic.Tool[] = [
  // Filesystem tools
  {
    name: "filesystem_read",
    description: "Read the contents of a file at the specified path",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The file path to read (relative to sandbox)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "filesystem_write",
    description: "Write content to a file at the specified path",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The file path to write to (relative to sandbox)",
        },
        content: {
          type: "string",
          description: "The content to write",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "filesystem_list",
    description: "List files and directories at the specified path",
    input_schema: {
      type: "object" as const,
      properties: {
        path: {
          type: "string",
          description: "The directory path to list (relative to sandbox)",
        },
      },
      required: ["path"],
    },
  },

  // Git tools
  {
    name: "git_status",
    description: "Get the current git status of the repository",
    input_schema: {
      type: "object" as const,
      properties: {
        repoPath: {
          type: "string",
          description: "Path to the git repository",
        },
      },
      required: ["repoPath"],
    },
  },
  {
    name: "git_commit",
    description: "Create a git commit with the specified message",
    input_schema: {
      type: "object" as const,
      properties: {
        repoPath: {
          type: "string",
          description: "Path to the git repository",
        },
        message: {
          type: "string",
          description: "The commit message",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Files to stage and commit (optional, defaults to all)",
        },
      },
      required: ["repoPath", "message"],
    },
  },

  // Messaging tools
  {
    name: "message_send",
    description: "Send an internal message to another agent",
    input_schema: {
      type: "object" as const,
      properties: {
        toAgentId: {
          type: "string",
          description: "The ID of the recipient agent",
        },
        subject: {
          type: "string",
          description: "Message subject",
        },
        body: {
          type: "string",
          description: "Message body",
        },
      },
      required: ["toAgentId", "subject", "body"],
    },
  },
  {
    name: "message_check_inbox",
    description: "Check for new messages in the inbox",
    input_schema: {
      type: "object" as const,
      properties: {
        unreadOnly: {
          type: "boolean",
          description: "Only return unread messages",
        },
      },
      required: [],
    },
  },

  // External draft tools (require CEO approval)
  {
    name: "external_draft_email",
    description:
      "Draft an external email that requires CEO approval before sending",
    input_schema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        body: {
          type: "string",
          description: "Email body",
        },
      },
      required: ["to", "subject", "body"],
    },
  },

  // Task tools
  {
    name: "task_create",
    description: "Create a new task and assign it to an agent",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Task title",
        },
        description: {
          type: "string",
          description: "Task description",
        },
        assigneeId: {
          type: "string",
          description: "ID of the agent to assign the task to",
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "normal", "low"],
          description: "Task priority",
        },
        acceptanceCriteria: {
          type: "array",
          items: { type: "string" },
          description: "List of acceptance criteria for TDD",
        },
      },
      required: ["title", "description", "assigneeId"],
    },
  },

  // Shell/command tools (restricted)
  {
    name: "shell_exec",
    description:
      "Execute a shell command (restricted to safe commands: npm, pnpm, node, git, ls, cat, grep)",
    input_schema: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
        cwd: {
          type: "string",
          description: "Working directory (optional)",
        },
      },
      required: ["command"],
    },
  },
];

/**
 * Tool permissions by role
 */
export const toolPermissions: Record<string, string[]> = {
  ceo: [
    "message_send",
    "message_check_inbox",
    "task_create",
    "external_draft_email",
  ],
  engineering_lead: [
    "filesystem_read",
    "filesystem_write",
    "filesystem_list",
    "git_status",
    "git_commit",
    "message_send",
    "message_check_inbox",
    "task_create",
    "shell_exec",
  ],
  engineer: [
    "filesystem_read",
    "filesystem_write",
    "filesystem_list",
    "git_status",
    "git_commit",
    "message_send",
    "message_check_inbox",
    "shell_exec",
  ],
  marketing: [
    "message_send",
    "message_check_inbox",
    "external_draft_email",
    "filesystem_read",
    "filesystem_write",
  ],
  sales: ["message_send", "message_check_inbox", "external_draft_email"],
  operations: [
    "message_send",
    "message_check_inbox",
    "task_create",
    "external_draft_email",
  ],
  // Default for unknown roles
  default: ["message_send", "message_check_inbox"],
};

/**
 * Get tools available to a specific role
 */
export function getToolsForRole(role: string): Anthropic.Tool[] {
  const allowedToolNames = toolPermissions[role] || toolPermissions.default;
  return toolDefinitions.filter((tool) => allowedToolNames.includes(tool.name));
}

/**
 * Check if a role has access to a specific tool
 */
export function hasToolAccess(role: string, toolName: string): boolean {
  const allowedToolNames = toolPermissions[role] || toolPermissions.default;
  return allowedToolNames.includes(toolName);
}
