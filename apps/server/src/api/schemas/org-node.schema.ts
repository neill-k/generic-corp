import { z } from "zod";

export const createOrgNodeBodySchema = z.object({
  agentId: z.string().min(1),
  parentNodeId: z.string().nullable().optional(),
  position: z.number().int().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export const updateOrgNodeBodySchema = z.object({
  parentNodeId: z.string().nullable().optional(),
  position: z.number().int().optional(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export const batchUpdatePositionsBodySchema = z.object({
  positions: z.array(
    z.object({
      nodeId: z.string().min(1),
      positionX: z.number(),
      positionY: z.number(),
    }),
  ),
});

export type CreateOrgNodeInput = z.infer<typeof createOrgNodeBodySchema>;
export type UpdateOrgNodeInput = z.infer<typeof updateOrgNodeBodySchema>;
export type BatchUpdatePositionsInput = z.infer<typeof batchUpdatePositionsBodySchema>;
