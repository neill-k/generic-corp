/**
 * Tool definition type for agent tool use
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Tool definitions for use with Claude Agent SDK
 */
export const toolDefinitions: ToolDefinition[] = [
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

  // Task management tools (CRUD completeness)
  {
    name: "task_get",
    description: "Get details of a specific task by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to retrieve",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "task_list",
    description: "List tasks with optional filters",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "failed", "blocked", "cancelled"],
          description: "Filter by task status",
        },
        agentId: {
          type: "string",
          description: "Filter by assigned agent ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of tasks to return (default: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "task_update",
    description: "Update a task's details (title, description, priority, status)",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to update",
        },
        title: {
          type: "string",
          description: "New task title",
        },
        description: {
          type: "string",
          description: "New task description",
        },
        priority: {
          type: "string",
          enum: ["urgent", "high", "normal", "low"],
          description: "New task priority",
        },
        status: {
          type: "string",
          enum: ["pending", "in_progress", "completed", "failed", "blocked", "cancelled"],
          description: "New task status",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "task_cancel",
    description: "Cancel a pending or in-progress task",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to cancel",
        },
        reason: {
          type: "string",
          description: "Reason for cancellation",
        },
      },
      required: ["taskId"],
    },
  },
  {
    name: "task_retry",
    description: "Retry a failed task",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the failed task to retry",
        },
      },
      required: ["taskId"],
    },
  },

  // Task dependency tools
  {
    name: "task_add_dependency",
    description: "Add a dependency between tasks (task must wait for dependency to complete)",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task that depends on another",
        },
        dependsOnTaskId: {
          type: "string",
          description: "The ID of the task that must complete first",
        },
      },
      required: ["taskId", "dependsOnTaskId"],
    },
  },
  {
    name: "task_remove_dependency",
    description: "Remove a dependency between tasks",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task",
        },
        dependsOnTaskId: {
          type: "string",
          description: "The ID of the dependency to remove",
        },
      },
      required: ["taskId", "dependsOnTaskId"],
    },
  },
  {
    name: "task_list_dependencies",
    description: "List all dependencies for a task",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task",
        },
      },
      required: ["taskId"],
    },
  },

  // Message management tools (CRUD completeness)
  {
    name: "message_mark_read",
    description: "Mark a message as read",
    input_schema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the message to mark as read",
        },
      },
      required: ["messageId"],
    },
  },
  {
    name: "message_reply",
    description: "Reply to a message",
    input_schema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the message to reply to",
        },
        body: {
          type: "string",
          description: "Reply message body",
        },
      },
      required: ["messageId", "body"],
    },
  },
  {
    name: "message_delete",
    description: "Delete a message",
    input_schema: {
      type: "object" as const,
      properties: {
        messageId: {
          type: "string",
          description: "The ID of the message to delete",
        },
      },
      required: ["messageId"],
    },
  },

  // Draft management tools (Action Parity)
  {
    name: "draft_approve",
    description: "Approve an external draft for sending (CEO action)",
    input_schema: {
      type: "object" as const,
      properties: {
        draftId: {
          type: "string",
          description: "The ID of the draft to approve",
        },
      },
      required: ["draftId"],
    },
  },
  {
    name: "draft_reject",
    description: "Reject an external draft (CEO action)",
    input_schema: {
      type: "object" as const,
      properties: {
        draftId: {
          type: "string",
          description: "The ID of the draft to reject",
        },
        reason: {
          type: "string",
          description: "Reason for rejection",
        },
      },
      required: ["draftId"],
    },
  },
  {
    name: "draft_list",
    description: "List pending drafts awaiting approval",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["pending", "approved", "rejected"],
          description: "Filter by draft status",
        },
      },
      required: [],
    },
  },

  // Agent management tools (CRUD completeness)
  {
    name: "agent_list",
    description: "List all agents with their status and capabilities",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["idle", "working", "blocked", "offline"],
          description: "Filter by agent status",
        },
      },
      required: [],
    },
  },
  {
    name: "agent_get",
    description: "Get details of a specific agent",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "The ID of the agent",
        },
      },
      required: ["agentId"],
    },
  },
  {
    name: "agent_get_workload",
    description: "Get an agent's current workload and task queue",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "The ID of the agent",
        },
      },
      required: ["agentId"],
    },
  },

  // Activity log tools
  {
    name: "activity_log",
    description: "Query the activity log for recent events",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "Filter by agent ID",
        },
        eventType: {
          type: "string",
          description: "Filter by event type (e.g., task_completed, task_failed)",
        },
        limit: {
          type: "number",
          description: "Maximum number of events to return (default: 50)",
        },
      },
      required: [],
    },
  },

  // Budget/game state tools
  {
    name: "budget_get",
    description: "Get current budget information",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // Schedule management tools (CRUD completeness)
  {
    name: "schedule_create",
    description: "Create a scheduled task",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Name of the scheduled task",
        },
        cronExpression: {
          type: "string",
          description: "Cron expression for scheduling (e.g., '0 9 * * *' for 9am daily)",
        },
        taskTemplate: {
          type: "object",
          description: "Task template to create when schedule triggers",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            assigneeId: { type: "string" },
            priority: { type: "string" },
          },
        },
      },
      required: ["name", "cronExpression", "taskTemplate"],
    },
  },
  {
    name: "schedule_list",
    description: "List all scheduled tasks",
    input_schema: {
      type: "object" as const,
      properties: {
        enabled: {
          type: "boolean",
          description: "Filter by enabled status",
        },
      },
      required: [],
    },
  },
  {
    name: "schedule_get",
    description: "Get details of a specific schedule by ID",
    input_schema: {
      type: "object" as const,
      properties: {
        scheduleId: {
          type: "string",
          description: "The ID of the schedule to retrieve",
        },
      },
      required: ["scheduleId"],
    },
  },
  {
    name: "schedule_update",
    description: "Update a scheduled task",
    input_schema: {
      type: "object" as const,
      properties: {
        scheduleId: {
          type: "string",
          description: "The ID of the schedule to update",
        },
        enabled: {
          type: "boolean",
          description: "Enable or disable the schedule",
        },
        cronExpression: {
          type: "string",
          description: "New cron expression",
        },
      },
      required: ["scheduleId"],
    },
  },
  {
    name: "schedule_delete",
    description: "Delete a scheduled task",
    input_schema: {
      type: "object" as const,
      properties: {
        scheduleId: {
          type: "string",
          description: "The ID of the schedule to delete",
        },
      },
      required: ["scheduleId"],
    },
  },

  // Session tools (CRUD completeness)
  {
    name: "session_list",
    description: "List agent sessions",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "Filter by agent ID",
        },
        status: {
          type: "string",
          enum: ["active", "completed", "failed"],
          description: "Filter by session status",
        },
        limit: {
          type: "number",
          description: "Maximum number of sessions to return (default: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "session_get",
    description: "Get details of a specific session",
    input_schema: {
      type: "object" as const,
      properties: {
        sessionId: {
          type: "string",
          description: "The ID of the session",
        },
      },
      required: ["sessionId"],
    },
  },

  // Help/discovery tools (Capability Discovery)
  {
    name: "help",
    description: "Get help about available tools and capabilities",
    input_schema: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "Specific topic to get help on (e.g., 'tasks', 'messages', 'agents')",
        },
      },
      required: [],
    },
  },
  {
    name: "capabilities_list",
    description: "List all available capabilities and tools for the current agent",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },

  // Task reassignment (Action Parity)
  {
    name: "task_reassign",
    description: "Reassign a task to a different agent",
    input_schema: {
      type: "object" as const,
      properties: {
        taskId: {
          type: "string",
          description: "The ID of the task to reassign",
        },
        newAgentId: {
          type: "string",
          description: "The ID of the agent to assign the task to",
        },
        reason: {
          type: "string",
          description: "Optional reason for reassignment",
        },
      },
      required: ["taskId", "newAgentId"],
    },
  },

  // Draft update (CRUD Completeness)
  {
    name: "draft_update",
    description: "Update a pending external draft before approval",
    input_schema: {
      type: "object" as const,
      properties: {
        draftId: {
          type: "string",
          description: "The ID of the draft message to update",
        },
        subject: {
          type: "string",
          description: "Updated subject line",
        },
        body: {
          type: "string",
          description: "Updated email body",
        },
      },
      required: ["draftId"],
    },
  },

  // Generic key-value storage (Atomic Primitives)
  {
    name: "store_set",
    description: "Store a key-value pair in agent memory. Use for persisting data between sessions.",
    input_schema: {
      type: "object" as const,
      properties: {
        key: {
          type: "string",
          description: "The key to store (e.g., 'last_review_date', 'user_preferences')",
        },
        value: {
          type: "string",
          description: "The value to store (JSON stringified for complex data)",
        },
        namespace: {
          type: "string",
          description: "Optional namespace for grouping related keys (defaults to agent ID)",
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "store_get",
    description: "Retrieve a value from agent memory by key",
    input_schema: {
      type: "object" as const,
      properties: {
        key: {
          type: "string",
          description: "The key to retrieve",
        },
        namespace: {
          type: "string",
          description: "Optional namespace (defaults to agent ID)",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "store_delete",
    description: "Delete a key from agent memory",
    input_schema: {
      type: "object" as const,
      properties: {
        key: {
          type: "string",
          description: "The key to delete",
        },
        namespace: {
          type: "string",
          description: "Optional namespace (defaults to agent ID)",
        },
      },
      required: ["key"],
    },
  },
  {
    name: "store_list",
    description: "List all keys in agent memory, optionally filtered by namespace",
    input_schema: {
      type: "object" as const,
      properties: {
        namespace: {
          type: "string",
          description: "Optional namespace filter",
        },
      },
      required: [],
    },
  },

  // Context refresh (Context Injection)
  {
    name: "refresh_context",
    description: "Request updated context information including budget, team status, and recent activity. Use this in long-running sessions to get fresh data.",
    input_schema: {
      type: "object" as const,
      properties: {
        include: {
          type: "array",
          description: "Specific context sections to include: 'budget', 'team', 'activity', 'dependencies'. Defaults to all.",
        },
      },
      required: [],
    },
  },

  // Workspace context (Shared Workspace)
  {
    name: "context_read",
    description: "Read the shared workspace context file containing accumulated agent knowledge and learnings",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "context_write",
    description: "Append information to the shared workspace context file. Use this to record learnings, decisions, and important discoveries.",
    input_schema: {
      type: "object" as const,
      properties: {
        content: {
          type: "string",
          description: "Content to append to the context file (markdown format)",
        },
        section: {
          type: "string",
          description: "Section to append to: 'learnings', 'decisions', 'blockers', 'notes'",
        },
      },
      required: ["content"],
    },
  },

  // Agent status update (Action Parity)
  {
    name: "agent_update_status",
    description: "Update an agent's status (requires appropriate permissions)",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "The ID of the agent to update",
        },
        status: {
          type: "string",
          description: "New status: 'idle', 'working', 'blocked', 'offline'",
        },
        statusMessage: {
          type: "string",
          description: "Optional status message explaining current state",
        },
      },
      required: ["agentId", "status"],
    },
  },

  // Tool suggestion (Capability Discovery)
  {
    name: "suggest_tool",
    description: "Get AI-powered suggestions for which tool to use based on what you're trying to accomplish",
    input_schema: {
      type: "object" as const,
      properties: {
        goal: {
          type: "string",
          description: "Describe what you're trying to accomplish",
        },
      },
      required: ["goal"],
    },
  },

  // Agent archive (CRUD Completeness - CEO can soft-delete agents)
  {
    name: "agent_archive",
    description: "Archive an agent (soft delete). Archived agents can no longer be assigned tasks. CEO only.",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "The ID of the agent to archive",
        },
        reason: {
          type: "string",
          description: "Reason for archiving the agent",
        },
      },
      required: ["agentId"],
    },
  },
  {
    name: "agent_restore",
    description: "Restore an archived agent. CEO only.",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "The ID of the agent to restore",
        },
      },
      required: ["agentId"],
    },
  },

  // Prompt-Native Configuration Tools
  {
    name: "config_get_permissions",
    description: "Get the current tool permissions configuration for a role. Returns which tools are available to agents with the specified role.",
    input_schema: {
      type: "object" as const,
      properties: {
        role: {
          type: "string",
          description: "The role to get permissions for (e.g., 'ceo', 'engineer', 'marketing')",
        },
      },
      required: ["role"],
    },
  },
  {
    name: "config_get_status_transitions",
    description: "Get the valid status transitions for tasks. Returns which statuses a task can transition to from each status.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "config_get_workflow",
    description: "Get the workflow configuration for a specific process (e.g., 'draft_approval', 'task_assignment', 'escalation')",
    input_schema: {
      type: "object" as const,
      properties: {
        workflow: {
          type: "string",
          description: "The workflow to get configuration for",
        },
      },
      required: ["workflow"],
    },
  },
  {
    name: "config_update_agent",
    description: "Update an agent's capabilities or tool permissions (CEO only). Enables runtime modification of agent behavior.",
    input_schema: {
      type: "object" as const,
      properties: {
        agentId: {
          type: "string",
          description: "The agent to update",
        },
        capabilities: {
          type: "array",
          description: "New capabilities array (strings describing what the agent can do)",
        },
        toolPermissions: {
          type: "object",
          description: "Tool permission overrides (tool name -> boolean)",
        },
      },
      required: ["agentId"],
    },
  },
  {
    name: "prompt_template_get",
    description: "Get a prompt template by name. Prompt templates define agent behavior for specific scenarios.",
    input_schema: {
      type: "object" as const,
      properties: {
        templateName: {
          type: "string",
          description: "Name of the template (e.g., 'task_execution', 'draft_review', 'escalation')",
        },
      },
      required: ["templateName"],
    },
  },
  {
    name: "prompt_template_list",
    description: "List all available prompt templates that define agent behavior",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

/**
 * Prompt templates - defines behavior as prompts rather than code
 * This is a step toward prompt-native architecture
 */
export const promptTemplates: Record<string, { description: string; template: string }> = {
  task_execution: {
    description: "How agents should execute assigned tasks",
    template: `When executing a task:
1. Read and understand the task description fully
2. Check for dependencies using task_list_dependencies
3. If blocked, report status and wait
4. Break down the work into steps
5. Execute each step, logging progress
6. Verify acceptance criteria are met
7. Mark task as completed when done`,
  },
  draft_review: {
    description: "How CEO should review external drafts",
    template: `When reviewing an external draft:
1. Read the draft content carefully
2. Check for brand consistency and tone
3. Verify factual accuracy
4. Consider recipient and context
5. Approve if appropriate, or reject with specific feedback
6. For rejections, suggest specific improvements`,
  },
  escalation: {
    description: "When and how to escalate issues",
    template: `Escalate to CEO when:
- Budget concerns exceed $100
- External communication to VIPs
- Tasks blocked for more than 24 hours
- Security or compliance issues
- Conflicts between team members

Include in escalation:
- Clear summary of the issue
- Impact assessment
- Recommended actions
- Urgency level`,
  },
  task_prioritization: {
    description: "How to prioritize tasks",
    template: `Prioritize tasks using these criteria:
1. Urgent + Important: Do immediately
2. Important but not urgent: Schedule soon
3. Urgent but not important: Delegate if possible
4. Neither urgent nor important: Consider if needed

Factors to consider:
- Dependencies (blocked vs blocking other tasks)
- Deadline proximity
- Business impact
- Resource availability`,
  },
  collaboration: {
    description: "How agents should collaborate",
    template: `When collaborating with other agents:
1. Use message_send for async communication
2. Be specific about requests and deadlines
3. Acknowledge received messages promptly
4. Provide status updates on shared work
5. Escalate blockers through proper channels
6. Share learnings in context_write`,
  },
};

/**
 * Workflow configurations - defines processes as data rather than code
 */
export const workflowConfigs: Record<string, { steps: string[]; approvers?: string[]; automate?: boolean }> = {
  draft_approval: {
    steps: ["create_draft", "submit_for_review", "review", "approve_or_reject", "send_if_approved"],
    approvers: ["ceo"],
    automate: false,
  },
  task_assignment: {
    steps: ["create_task", "assign_to_agent", "notify_agent", "track_progress"],
    automate: true,
  },
  escalation: {
    steps: ["identify_issue", "document_context", "notify_ceo", "await_guidance", "implement_resolution"],
    approvers: ["ceo"],
    automate: false,
  },
  schedule_execution: {
    steps: ["trigger_on_schedule", "create_task_from_template", "assign_task", "execute", "log_completion"],
    automate: true,
  },
};

/**
 * Valid task status transitions - exposed as queryable configuration
 */
export const taskStatusTransitions: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["completed", "failed", "blocked", "cancelled"],
  blocked: ["in_progress", "cancelled"],
  completed: [], // Terminal state
  failed: ["pending"], // Can retry
  cancelled: [], // Terminal state
};

/**
 * Tool permissions by role
 *
 * NOTE: While this is code-defined, agents can now query this configuration
 * using config_get_permissions and CEO can update agent-specific overrides
 * using config_update_agent, making the system more prompt-native.
 */
export const toolPermissions: Record<string, string[]> = {
  ceo: [
    // Messaging
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "message_reply",
    "message_delete",
    // Tasks
    "task_create",
    "task_get",
    "task_list",
    "task_update",
    "task_cancel",
    "task_retry",
    "task_add_dependency",
    "task_remove_dependency",
    "task_list_dependencies",
    // Drafts (CEO approval)
    "external_draft_email",
    "draft_approve",
    "draft_reject",
    "draft_list",
    // Agents
    "agent_list",
    "agent_get",
    "agent_get_workload",
    // Activity & Budget
    "activity_log",
    "budget_get",
    // Schedules
    "schedule_create",
    "schedule_list",
    "schedule_update",
    "schedule_delete",
    // Sessions
    "session_list",
    "session_get",
    // Help & Discovery
    "help",
    "capabilities_list",
    "suggest_tool",
    // Task management (CEO can reassign)
    "task_reassign",
    // Draft management
    "draft_update",
    // Agent management (CEO can update status, archive, restore)
    "agent_update_status",
    "agent_archive",
    "agent_restore",
    // Context & Memory
    "context_read",
    "context_write",
    "store_set",
    "store_get",
    "store_delete",
    "store_list",
    "refresh_context",
    // Configuration (Prompt-Native)
    "config_get_permissions",
    "config_get_status_transitions",
    "config_get_workflow",
    "config_update_agent",
    "prompt_template_get",
    "prompt_template_list",
  ],
  engineering_lead: [
    // Filesystem
    "filesystem_read",
    "filesystem_write",
    "filesystem_list",
    // Git
    "git_status",
    "git_commit",
    // Messaging
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "message_reply",
    // Tasks
    "task_create",
    "task_get",
    "task_list",
    "task_update",
    "task_cancel",
    "task_retry",
    "task_add_dependency",
    "task_remove_dependency",
    "task_list_dependencies",
    // Shell
    "shell_exec",
    // Agents
    "agent_list",
    "agent_get",
    "agent_get_workload",
    // Activity
    "activity_log",
    // Sessions
    "session_list",
    "session_get",
    // Help & Discovery
    "help",
    "capabilities_list",
    "suggest_tool",
    // Task management (eng lead can reassign within team)
    "task_reassign",
    // Context & Memory
    "context_read",
    "context_write",
    "store_set",
    "store_get",
    "store_delete",
    "store_list",
    "refresh_context",
    // Configuration (read-only)
    "config_get_permissions",
    "config_get_status_transitions",
    "config_get_workflow",
    "prompt_template_get",
    "prompt_template_list",
  ],
  engineer: [
    // Filesystem
    "filesystem_read",
    "filesystem_write",
    "filesystem_list",
    // Git
    "git_status",
    "git_commit",
    // Messaging
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "message_reply",
    // Tasks (limited - can view and update own tasks)
    "task_get",
    "task_list",
    "task_update",
    "task_list_dependencies",
    // Shell
    "shell_exec",
    // Agents
    "agent_list",
    "agent_get",
    // Activity
    "activity_log",
    // Help & Discovery
    "help",
    "capabilities_list",
    "suggest_tool",
    // Context & Memory
    "context_read",
    "context_write",
    "store_set",
    "store_get",
    "store_list",
    "refresh_context",
    // Configuration (read-only)
    "config_get_permissions",
    "config_get_status_transitions",
    "prompt_template_get",
    "prompt_template_list",
  ],
  marketing: [
    // Messaging
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "message_reply",
    // External drafts
    "external_draft_email",
    "draft_list",
    // Filesystem (limited)
    "filesystem_read",
    "filesystem_write",
    // Tasks
    "task_get",
    "task_list",
    // Agents
    "agent_list",
    "agent_get",
    // Help & Discovery
    "help",
    "capabilities_list",
    "suggest_tool",
    // Draft management
    "draft_update",
    // Context & Memory
    "context_read",
    "context_write",
    "store_set",
    "store_get",
    "store_list",
    "refresh_context",
    // Configuration (read-only)
    "config_get_permissions",
    "prompt_template_get",
    "prompt_template_list",
  ],
  sales: [
    // Messaging
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "message_reply",
    // External drafts
    "external_draft_email",
    "draft_list",
    // Tasks
    "task_get",
    "task_list",
    // Agents
    "agent_list",
    "agent_get",
    // Help & Discovery
    "help",
    "capabilities_list",
    "suggest_tool",
    // Draft management
    "draft_update",
    // Context & Memory
    "context_read",
    "context_write",
    "store_set",
    "store_get",
    "store_list",
    "refresh_context",
    // Configuration (read-only)
    "config_get_permissions",
    "prompt_template_get",
    "prompt_template_list",
  ],
  operations: [
    // Messaging
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "message_reply",
    // Tasks
    "task_create",
    "task_get",
    "task_list",
    "task_update",
    "task_cancel",
    // External drafts
    "external_draft_email",
    "draft_list",
    // Agents
    "agent_list",
    "agent_get",
    "agent_get_workload",
    // Schedules
    "schedule_list",
    // Activity
    "activity_log",
    // Help & Discovery
    "help",
    "capabilities_list",
    "suggest_tool",
    // Context & Memory
    "context_read",
    "context_write",
    "store_set",
    "store_get",
    "store_list",
    "refresh_context",
    // Configuration (read-only)
    "config_get_permissions",
    "config_get_workflow",
    "prompt_template_get",
    "prompt_template_list",
  ],
  // Default for unknown roles - read-only access with messaging
  default: [
    "message_send",
    "message_check_inbox",
    "message_mark_read",
    "task_get",
    "task_list",
    "agent_list",
    "agent_get",
    "help",
    "capabilities_list",
    "suggest_tool",
    // Basic context access
    "context_read",
    "store_get",
    "store_list",
    "refresh_context",
    // Configuration (read-only)
    "config_get_permissions",
    "prompt_template_list",
  ],
};

/**
 * Get tools available to a specific role
 */
export function getToolsForRole(role: string): ToolDefinition[] {
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
