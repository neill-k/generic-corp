import { z } from "zod";

export const createOrgNodeBodySchema = z.object({
  agentId: z.string().min(1),
  parentNodeId: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export const updateOrgNodeBodySchema = z.object({
  parentNodeId: z.string().nullable().optional(),
  position: z.number().int().optional(),
});

export type CreateOrgNodeInput = z.infer<typeof createOrgNodeBodySchema>;
export type UpdateOrgNodeInput = z.infer<typeof updateOrgNodeBodySchema>;
