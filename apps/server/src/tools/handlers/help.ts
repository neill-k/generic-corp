import { toolDefinitions, toolPermissions } from "../definitions/index.js";
import type { Agent } from "@generic-corp/shared";

/**
 * Help tool - provides guidance on available tools and capabilities
 * This improves Capability Discovery for users
 */
export async function help(
  params: {
    topic?: string;
  },
  _context: { agentId: string; agent?: Agent }
): Promise<{
  help: {
    topic: string;
    content: string;
    relatedTopics: string[];
  };
}> {
  const topics: Record<string, { content: string; relatedTopics: string[] }> = {
    overview: {
      content: `# Generic Corp Agent Help

Welcome! You're interacting with an AI-powered agent system. Here's what you can do:

## Quick Start
- **Assign tasks**: Create tasks for agents to work on
- **Send messages**: Communicate with other agents
- **Check status**: Monitor task progress and agent workloads
- **Manage drafts**: Review and approve external communications

## Key Commands
- Use \`task_create\` to assign new tasks
- Use \`message_send\` to communicate with team members
- Use \`agent_list\` to see all available agents
- Use \`help\` with a topic for detailed guidance

## Available Topics
- tasks, messages, agents, drafts, activity, budget, schedules, tools`,
      relatedTopics: ["tasks", "messages", "agents", "tools"],
    },

    tasks: {
      content: `# Task Management

## Creating Tasks
Use \`task_create\` to assign work:
- title: Brief task name
- description: Detailed requirements
- assigneeId: Agent ID to assign to
- priority: urgent, high, normal, low
- acceptanceCriteria: List of success criteria

## Managing Tasks
- \`task_list\`: View all tasks (filter by status/agent)
- \`task_get\`: Get details of a specific task
- \`task_update\`: Modify task details or status
- \`task_cancel\`: Cancel a pending/in-progress task
- \`task_retry\`: Retry a failed task

## Task Dependencies
- \`task_add_dependency\`: Make one task wait for another
- \`task_remove_dependency\`: Remove a dependency
- \`task_list_dependencies\`: See what a task depends on

## Status Flow
pending → in_progress → completed/failed
pending/in_progress/blocked → cancelled
failed → pending (retry)`,
      relatedTopics: ["agents", "activity", "overview"],
    },

    messages: {
      content: `# Messaging

## Sending Messages
Use \`message_send\` to communicate:
- toAgentId: Recipient agent ID
- subject: Brief subject line
- body: Message content

## Managing Messages
- \`message_check_inbox\`: View received messages
- \`message_mark_read\`: Mark messages as read
- \`message_reply\`: Reply to a message
- \`message_delete\`: Delete a message

## External Drafts
External emails require CEO approval:
- \`external_draft_email\`: Create a draft for external recipient
- \`draft_list\`: View all drafts
- \`draft_approve\`: Approve a draft (CEO only)
- \`draft_reject\`: Reject a draft (CEO only)`,
      relatedTopics: ["drafts", "agents", "overview"],
    },

    agents: {
      content: `# Agent Management

## Viewing Agents
- \`agent_list\`: List all agents with status
- \`agent_get\`: Get detailed agent info
- \`agent_get_workload\`: See an agent's current tasks

## Agent Status
- idle: Available for work
- working: Currently executing a task
- blocked: Waiting on dependencies
- offline: Not available

## Agent Capabilities
Each agent has different capabilities:
- Filesystem access (read/write files)
- Git operations (commit code)
- Shell commands
- External communications`,
      relatedTopics: ["tasks", "workload", "overview"],
    },

    drafts: {
      content: `# Draft Management

External communications require CEO approval before sending.

## Creating Drafts
Use \`external_draft_email\`:
- to: External email address
- subject: Email subject
- body: Email content

## Managing Drafts
- \`draft_list\`: View all drafts (pending/approved/rejected)
- \`draft_approve\`: Approve and send (CEO only)
- \`draft_reject\`: Reject with reason (CEO only)

## Workflow
1. Agent creates draft → status: pending
2. CEO reviews and approves/rejects
3. Approved drafts are sent immediately`,
      relatedTopics: ["messages", "agents"],
    },

    activity: {
      content: `# Activity Log

Track all events in the system.

## Viewing Activity
Use \`activity_log\`:
- agentId: Filter by specific agent
- eventType: Filter by event type
- limit: Number of events to return

## Event Types
- task_started, task_completed, task_failed
- task_cancelled
- draft_approved, draft_rejected
- lead_notified
- message_sent`,
      relatedTopics: ["tasks", "agents", "overview"],
    },

    budget: {
      content: `# Budget Management

Monitor AI agent usage costs.

## Viewing Budget
Use \`budget_get\` to see:
- remaining: Available budget
- limit: Total budget
- used: Amount spent
- percentUsed: Usage percentage

## Cost Awareness
Each task execution incurs costs based on:
- Input tokens (prompt length)
- Output tokens (response length)
- Model used`,
      relatedTopics: ["tasks", "overview"],
    },

    schedules: {
      content: `# Scheduled Tasks

Automate recurring tasks.

## Creating Schedules
Use \`schedule_create\`:
- name: Schedule name
- cronExpression: Cron timing (e.g., "0 9 * * *" for 9am daily)
- taskTemplate: Task to create each run

## Managing Schedules
- \`schedule_list\`: View all schedules
- \`schedule_update\`: Enable/disable or change timing
- \`schedule_delete\`: Remove a schedule

## Cron Format
minute hour day month weekday
Example: "0 9 * * 1-5" = 9am Monday-Friday`,
      relatedTopics: ["tasks", "agents"],
    },

    tools: {
      content: `# Available Tools

## Task Tools
task_create, task_get, task_list, task_update, task_cancel, task_retry
task_add_dependency, task_remove_dependency, task_list_dependencies

## Message Tools
message_send, message_check_inbox, message_mark_read, message_reply, message_delete
external_draft_email, draft_approve, draft_reject, draft_list

## Agent Tools
agent_list, agent_get, agent_get_workload

## Other Tools
activity_log, budget_get
schedule_create, schedule_list, schedule_update, schedule_delete
session_list, session_get
help, capabilities_list

## File & Git Tools (Engineers)
filesystem_read, filesystem_write, filesystem_list
git_status, git_commit

## Shell Tools (Engineers)
shell_exec`,
      relatedTopics: ["overview", "tasks", "messages"],
    },
  };

  const topic = params.topic?.toLowerCase() || "overview";
  const topicData = topics[topic] || topics.overview;

  return {
    help: {
      topic: topics[topic] ? topic : "overview",
      content: topicData.content,
      relatedTopics: topicData.relatedTopics,
    },
  };
}

/**
 * List all available capabilities and tools for the current agent
 */
export async function capabilitiesList(
  _params: {},
  context: { agentId: string; agent?: Agent }
): Promise<{
  capabilities: {
    availableTools: Array<{
      name: string;
      description: string;
    }>;
    agentRole: string;
    agentCapabilities: string[];
    toolCount: number;
  };
}> {
  // Get role from agent or default
  const role = context.agent?.role?.toLowerCase().replace(/\s+/g, "_") || "default";
  const allowedToolNames = toolPermissions[role] || toolPermissions.default;

  // Filter tools available to this agent
  const availableTools = toolDefinitions
    .filter((tool) => allowedToolNames.includes(tool.name))
    .map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));

  return {
    capabilities: {
      availableTools,
      agentRole: context.agent?.role || "Unknown",
      agentCapabilities: context.agent?.capabilities || [],
      toolCount: availableTools.length,
    },
  };
}

/**
 * Tool suggestions based on goal - keyword matching for capability discovery
 */
const toolKeywords: Record<string, string[]> = {
  task_create: ["create task", "assign task", "new task", "make task", "add task"],
  task_list: ["list tasks", "show tasks", "view tasks", "see tasks", "my tasks"],
  task_update: ["update task", "change task", "modify task", "edit task"],
  task_cancel: ["cancel task", "stop task", "abort task"],
  task_reassign: ["reassign", "move task", "transfer task", "give task"],
  message_send: ["send message", "message agent", "communicate", "tell", "notify"],
  message_check_inbox: ["check messages", "inbox", "read messages", "unread"],
  external_draft_email: ["send email", "external email", "draft email", "email customer"],
  draft_approve: ["approve draft", "approve email", "confirm draft"],
  draft_reject: ["reject draft", "decline email", "cancel draft"],
  agent_list: ["list agents", "show agents", "team members", "who is available"],
  agent_get: ["agent details", "agent info", "about agent"],
  agent_get_workload: ["workload", "busy", "capacity", "how many tasks"],
  budget_get: ["budget", "spending", "costs", "money remaining"],
  schedule_create: ["schedule task", "recurring task", "cron", "automated task"],
  activity_log: ["log activity", "record action", "track progress"],
  filesystem_read: ["read file", "view file", "open file", "get file contents"],
  filesystem_write: ["write file", "create file", "save file", "update file"],
  git_status: ["git status", "repo status", "changes", "uncommitted"],
  git_commit: ["commit", "save changes", "git commit"],
  store_set: ["remember", "save data", "store value", "persist"],
  store_get: ["recall", "get stored", "retrieve data", "lookup"],
  context_read: ["read context", "shared knowledge", "team learnings"],
  context_write: ["write context", "share learning", "document decision"],
  refresh_context: ["refresh", "update context", "get latest", "current state"],
  help: ["help", "how to", "guide", "documentation"],
};

export async function suggestTool(
  params: {
    goal: string;
  },
  context: { agentId: string; agent?: Agent }
): Promise<{
  suggestions: Array<{
    tool: string;
    description: string;
    relevance: "high" | "medium" | "low";
    reason: string;
  }>;
}> {
  const goalLower = params.goal.toLowerCase();
  const role = context.agent?.role?.toLowerCase().replace(/\s+/g, "_") || "default";
  const allowedToolNames = toolPermissions[role] || toolPermissions.default;

  const suggestions: Array<{
    tool: string;
    description: string;
    relevance: "high" | "medium" | "low";
    reason: string;
  }> = [];

  // Find matching tools based on keywords
  for (const [toolName, keywords] of Object.entries(toolKeywords)) {
    // Skip tools this agent doesn't have access to
    if (!allowedToolNames.includes(toolName)) continue;

    let matchCount = 0;
    let matchedKeyword = "";

    for (const keyword of keywords) {
      if (goalLower.includes(keyword)) {
        matchCount++;
        matchedKeyword = keyword;
      }
    }

    // Also check for partial word matches
    const words = goalLower.split(/\s+/);
    for (const word of words) {
      if (word.length >= 4) {
        for (const keyword of keywords) {
          if (keyword.includes(word)) {
            matchCount += 0.5;
            if (!matchedKeyword) matchedKeyword = keyword;
          }
        }
      }
    }

    if (matchCount > 0) {
      const tool = toolDefinitions.find((t) => t.name === toolName);
      if (tool) {
        suggestions.push({
          tool: toolName,
          description: tool.description,
          relevance: matchCount >= 2 ? "high" : matchCount >= 1 ? "medium" : "low",
          reason: `Matches: "${matchedKeyword}"`,
        });
      }
    }
  }

  // Sort by relevance
  suggestions.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.relevance] - order[b.relevance];
  });

  // Limit to top 5
  return { suggestions: suggestions.slice(0, 5) };
}
