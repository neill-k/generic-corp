import { z } from "zod";

export const createTaskBodySchema = z.object({
  assignee: z.string().optional().describe("Agent name (slug). Defaults to marcus"),
  prompt: z.string().min(1),
  context: z.string().optional(),
  priority: z.number().int().optional(),
});

export const updateTaskBodySchema = z.object({
  priority: z.number().int().optional(),
  context: z.string().optional(),
  status: z.enum(["pending", "running", "completed", "failed", "blocked"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskBodySchema>;
