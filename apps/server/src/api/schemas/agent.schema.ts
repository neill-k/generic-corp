import { z } from "zod";

export const createAgentBodySchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, "Must be lowercase slug"),
  displayName: z.string().min(1),
  role: z.string().min(1),
  department: z.string().min(1),
  level: z.enum(["ic", "lead", "manager", "vp", "c-suite"]),
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
