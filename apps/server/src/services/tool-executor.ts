import type { ToolContext } from "./tools/index.js";
import { getAllTools } from "./tools/index.js";

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

/**
 * Execute a tool call from an agent
 */
export async function executeTool(
  toolCall: ToolCall,
  context: ToolContext
): Promise<{ success: boolean; result: unknown; error?: string }> {
  const allTools = getAllTools();
  const tool = allTools.find((t) => t.name === toolCall.name);

  if (!tool) {
    return {
      success: false,
      result: null,
      error: `Unknown tool: ${toolCall.name}`,
    };
  }

  try {
    // Validate input against schema
    const validatedInput = tool.inputSchema.parse(toolCall.input) as any;

    // Execute tool with validated input
    const result = await tool.execute(validatedInput, context);

    return {
      success: result.success !== false,
      result,
      error: result.success === false ? (result as { error: string }).error : undefined,
    };
  } catch (error) {
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get tool descriptions for agent prompts
 */
export function getToolDescriptions(tools: ReturnType<typeof getAllTools>): string {
  if (tools.length === 0) return "";

  return tools
    .map(
      (tool) => `
### ${tool.name}
${tool.description}

Parameters:
${Object.entries(tool.inputSchema._def.shape() || {})
  .map(([key, schema]: [string, any]) => {
    const description = schema._def?.description || "";
    return `- ${key}: ${description}`;
  })
  .join("\n")}

Example usage:
\`\`\`json
{
  "tool": "${tool.name}",
  "input": { ... }
}
\`\`\`
`
    )
    .join("\n");
}
