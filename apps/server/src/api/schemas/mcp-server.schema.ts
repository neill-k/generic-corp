import { z } from "zod";

export const createMcpServerSchema = z.object({
  name: z.string().min(1),
  protocol: z.enum(["stdio", "sse", "http"]),
  uri: z.string().min(1),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

export const updateMcpServerSchema = z.object({
  name: z.string().min(1).optional(),
  protocol: z.enum(["stdio", "sse", "http"]).optional(),
  uri: z.string().min(1).optional(),
  iconName: z.string().optional(),
  iconColor: z.string().optional(),
});

export type CreateMcpServerInput = z.infer<typeof createMcpServerSchema>;
export type UpdateMcpServerInput = z.infer<typeof updateMcpServerSchema>;
