import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import { readFile, writeFile } from "node:fs/promises";

import { appEventBus } from "../../services/app-events.js";
import type { McpToolContext } from "./shared.js";
import { toolText, getAgentByIdOrName, getBoardService } from "./shared.js";

export function createBoardTools(ctx: McpToolContext) {
  const { prisma, orgSlug, agentId } = ctx;

  return [
    tool(
      "query_board",
      "Search the shared board for relevant items",
      {
        scope: z.enum(["team", "department", "org"]).optional(),
        type: z.string().optional().describe("Filter by board item type (e.g. status_update, blocker, finding, request)"),
        since: z.string().optional(),
      },
      async (args) => {
        try {
          void args.scope;

          const boardService = getBoardService();
          const items = await boardService.listBoardItems({
            type: args.type,
            since: args.since,
          });

          return toolText(JSON.stringify(items, null, 2));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`query_board failed: ${message}`);
        }
      },
    ),

    tool(
      "post_board_item",
      "Post a status update, blocker, finding, or request to the shared board",
      {
        type: z.string().describe("Board item type (e.g. status_update, blocker, finding, request)"),
        content: z.string(),
      },
      async (args) => {
        try {
          const agent = await getAgentByIdOrName(prisma, agentId);
          const agentName = agent?.name ?? agentId;
          const boardService = getBoardService();
          const filePath = await boardService.writeBoardItem({
            agentName,
            type: args.type,
            content: args.content,
          });

          appEventBus.emit("board_item_created", {
            type: args.type,
            author: agentName,
            path: filePath,
            orgSlug,
          });

          return toolText(JSON.stringify({ path: filePath }, null, 2));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          return toolText(`post_board_item failed: ${message}`);
        }
      },
    ),

    tool(
      "update_board_item",
      "Update an existing board item's content",
      {
        filePath: z.string().describe("Path to the board item file"),
        content: z.string().describe("New content for the board item"),
      },
      async (args) => {
        try {
          let existing: string;
          try {
            existing = await readFile(args.filePath, "utf8");
          } catch {
            return toolText(`Board item not found: ${args.filePath}`);
          }

          const separatorIndex = existing.indexOf("\n---\n");
          if (separatorIndex === -1) {
            return toolText("Invalid board item format (no --- separator found).");
          }

          const header = existing.slice(0, separatorIndex + 5);
          const updated = `${header}\n${args.content.trim()}\n`;
          await writeFile(args.filePath, updated, "utf8");

          appEventBus.emit("board_item_updated", {
            type: "updated",
            author: "agent",
            path: args.filePath,
            orgSlug,
          });

          return toolText(`Board item updated: ${args.filePath}`);
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`update_board_item failed: ${msg}`);
        }
      },
    ),

    tool(
      "archive_board_item",
      "Archive a board item (move to completed)",
      {
        filePath: z.string().describe("Path to the board item file"),
      },
      async (args) => {
        try {
          const boardService = getBoardService();
          const archivedPath = await boardService.archiveBoardItem(args.filePath);

          appEventBus.emit("board_item_archived", {
            path: args.filePath,
            archivedPath,
            orgSlug,
          });

          return toolText(JSON.stringify({ archivedPath }, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`archive_board_item failed: ${msg}`);
        }
      },
    ),

    tool(
      "list_archived_items",
      "List archived board items",
      {},
      async () => {
        try {
          const boardService = getBoardService();
          const items = await boardService.listArchivedItems();
          return toolText(JSON.stringify(items, null, 2));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          return toolText(`list_archived_items failed: ${msg}`);
        }
      },
    ),
  ];
}
