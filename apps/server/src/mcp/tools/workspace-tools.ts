import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

import { appEventBus } from "../../services/app-events.js";
import type { McpToolContext } from "./shared.js";
import { toolText } from "./shared.js";

export function createWorkspaceTools(ctx: McpToolContext) {
  const { prisma, orgSlug } = ctx;

  return [
    tool(
      "get_workspace",
      "Get workspace settings (API key masked)",
      {},
      async () => {
        try {
          let workspace = await prisma.workspace.findFirst();
          if (!workspace) {
            workspace = await prisma.workspace.create({
              data: { name: "Generic Corp", slug: "generic-corp" },
            });
          }
          const { llmApiKeyEnc, llmApiKeyIv, llmApiKeyTag, ...rest } = workspace;
          return toolText(JSON.stringify({
            ...rest,
            llmApiKey: llmApiKeyEnc ? "sk-ant-••••••••" : "",
          }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`get_workspace failed: ${msg}`);
        }
      },
    ),

    tool(
      "update_workspace",
      "Update workspace settings",
      {
        name: z.string().optional().describe("Workspace name"),
        slug: z.string().optional().describe("Workspace slug"),
        description: z.string().optional().describe("Workspace description"),
        timezone: z.string().optional().describe("Timezone"),
        language: z.string().optional().describe("Language code"),
        llmProvider: z.string().optional().describe("LLM provider"),
        llmModel: z.string().optional().describe("LLM model"),
      },
      async (args) => {
        try {
          let workspace = await prisma.workspace.findFirst();
          if (!workspace) {
            workspace = await prisma.workspace.create({
              data: { name: "Generic Corp", slug: "generic-corp" },
            });
          }
          const data: Record<string, unknown> = {};
          if (args.name !== undefined) data["name"] = args.name;
          if (args.slug !== undefined) data["slug"] = args.slug;
          if (args.description !== undefined) data["description"] = args.description;
          if (args.timezone !== undefined) data["timezone"] = args.timezone;
          if (args.language !== undefined) data["language"] = args.language;
          if (args.llmProvider !== undefined) data["llmProvider"] = args.llmProvider;
          if (args.llmModel !== undefined) data["llmModel"] = args.llmModel;

          const updated = await prisma.workspace.update({
            where: { id: workspace.id },
            data,
          });

          appEventBus.emit("workspace_updated", { workspaceId: updated.id, orgSlug });

          return toolText(`Workspace updated: ${JSON.stringify({ name: updated.name, slug: updated.slug })}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_workspace failed: ${msg}`);
        }
      },
    ),
  ];
}
