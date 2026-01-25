import { db } from "../../db/index.js";
import {
  toolPermissions,
  taskStatusTransitions,
  workflowConfigs,
  promptTemplates,
} from "../definitions/index.js";

/**
 * Get tool permissions for a role
 */
export async function configGetPermissions(params: {
  role: string;
}): Promise<{
  role: string;
  tools: string[];
  description: string;
}> {
  const role = params.role.toLowerCase().replace(/\s+/g, "_");
  const tools = toolPermissions[role] || toolPermissions.default;

  const roleDescriptions: Record<string, string> = {
    ceo: "Full access to all tools including approvals, agent management, and strategic planning",
    engineering_lead: "Access to code, git, shell, and task management for technical leadership",
    engineer: "Access to code, git, and shell tools for development work",
    marketing: "Access to messaging, drafts, and content-related tools",
    sales: "Access to messaging, drafts, and customer communication tools",
    operations: "Access to task management, scheduling, and operational tools",
    default: "Basic read access with messaging capabilities",
  };

  return {
    role: params.role,
    tools,
    description: roleDescriptions[role] || roleDescriptions.default,
  };
}

/**
 * Get valid task status transitions
 */
export async function configGetStatusTransitions(): Promise<{
  transitions: Record<string, string[]>;
  description: string;
}> {
  return {
    transitions: taskStatusTransitions,
    description: `Task status transitions define the valid state machine for tasks.
- pending: Initial state, can move to in_progress or be cancelled
- in_progress: Active work, can complete, fail, block, or be cancelled
- blocked: Waiting on dependencies, can resume or be cancelled
- completed: Terminal success state
- failed: Terminal failure state, can be retried (returns to pending)
- cancelled: Terminal state, no recovery`,
  };
}

/**
 * Get workflow configuration
 */
export async function configGetWorkflow(params: {
  workflow: string;
}): Promise<{
  workflow: string;
  config: { steps: string[]; approvers?: string[]; automate?: boolean } | null;
  availableWorkflows: string[];
}> {
  const config = workflowConfigs[params.workflow] || null;

  return {
    workflow: params.workflow,
    config,
    availableWorkflows: Object.keys(workflowConfigs),
  };
}

/**
 * Update agent configuration (CEO only)
 */
export async function configUpdateAgent(
  params: {
    agentId: string;
    capabilities?: string[];
    toolPermissions?: Record<string, boolean>;
  },
  context: { agentId: string }
): Promise<{ success: boolean; message?: string }> {
  // Verify caller is CEO
  const caller = await db.agent.findUnique({
    where: { id: context.agentId },
    select: { role: true },
  });

  if (caller?.role !== "ceo") {
    throw new Error("Only CEO can update agent configurations");
  }

  // Find target agent
  const agent = await db.agent.findUnique({
    where: { id: params.agentId },
  });

  if (!agent || agent.deletedAt) {
    throw new Error(`Agent not found: ${params.agentId}`);
  }

  const updateData: Record<string, unknown> = {};

  if (params.capabilities) {
    updateData.capabilities = params.capabilities;
  }

  if (params.toolPermissions) {
    // Merge with existing permissions
    const existingPermissions = (agent.toolPermissions as Record<string, boolean>) || {};
    updateData.toolPermissions = {
      ...existingPermissions,
      ...params.toolPermissions,
    };
  }

  if (Object.keys(updateData).length === 0) {
    return { success: true, message: "No updates provided" };
  }

  await db.agent.update({
    where: { id: params.agentId },
    data: updateData,
  });

  return {
    success: true,
    message: `Agent ${agent.name} configuration updated`,
  };
}

/**
 * Get a prompt template
 */
export async function promptTemplateGet(params: {
  templateName: string;
}): Promise<{
  name: string;
  template: { description: string; template: string } | null;
  availableTemplates: string[];
}> {
  const template = promptTemplates[params.templateName] || null;

  return {
    name: params.templateName,
    template,
    availableTemplates: Object.keys(promptTemplates),
  };
}

/**
 * List all prompt templates
 */
export async function promptTemplateList(): Promise<{
  templates: Array<{
    name: string;
    description: string;
  }>;
}> {
  return {
    templates: Object.entries(promptTemplates).map(([name, data]) => ({
      name,
      description: data.description,
    })),
  };
}
