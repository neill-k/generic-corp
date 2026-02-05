import { z } from "zod";
import { ASSIGNABLE_AGENT_LEVELS } from "@generic-corp/shared";

export const createAgentBodySchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, "Must be lowercase slug"),
  displayName: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  level: z.enum(ASSIGNABLE_AGENT_LEVELS),
  personality: z.string().optional(),
});

export const updateAgentBodySchema = z.object({
  displayName: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  personality: z.string().optional(),
});

export type CreateAgentInput = z.infer<typeof createAgentBodySchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentBodySchema>;
