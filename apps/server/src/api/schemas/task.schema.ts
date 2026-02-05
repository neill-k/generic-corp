import { z } from "zod";
import { TASK_STATUSES } from "@generic-corp/shared";

export const tagSchema = z.object({
  label: z.string(),
  color: z.string(),
  bg: z.string(),
});

export const createTaskBodySchema = z.object({
  assignee: z.string().optional().describe("Agent name (slug). Defaults to marcus"),
  prompt: z.string().min(1),
  context: z.string().optional(),
  priority: z.number().int().optional(),
  tags: z.array(tagSchema).optional(),
});

export const updateTaskBodySchema = z.object({
  priority: z.number().int().optional(),
  context: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  tags: z.array(tagSchema).optional(),
});

export const taskBoardQuerySchema = z.object({
  search: z.string().optional(),
  assignee: z.string().optional(),
  priority: z.coerce.number().int().optional(),
  status: z.string().optional(),
  department: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateTaskInput = z.infer<typeof createTaskBodySchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskBodySchema>;
export type TaskBoardQuery = z.infer<typeof taskBoardQuerySchema>;
