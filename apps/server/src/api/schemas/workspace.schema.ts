import { z } from "zod";

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Must be a lowercase slug (e.g. my-workspace)")
    .optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  llmProvider: z.string().optional(),
  llmModel: z.string().optional(),
  llmApiKey: z.string().optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
